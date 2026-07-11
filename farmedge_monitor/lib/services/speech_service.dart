import 'dart:js' as js;

class SpeechService {
  static void speak(String text, String lang) {
    try {
      // Map standard locale keys to TTS supported formats
      String ttsLang = 'en-US';
      if (lang == 'ml' || lang == 'ml-IN') {
        ttsLang = 'ml-IN';
      } else if (lang == 'kn' || lang == 'kn-IN') {
        ttsLang = 'kn-IN';
      } else {
        ttsLang = 'en-US';
      }

      // Safe parameter transfer to JS context
      js.context['SpeechSynthesisText'] = text;
      js.context['SpeechSynthesisLang'] = ttsLang;

      js.context.callMethod('eval', ["""
        (function() {
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            
            const speakText = () => {
              const textVal = window.SpeechSynthesisText || "";
              const langVal = window.SpeechSynthesisLang || "en-US";
              const u = new SpeechSynthesisUtterance(textVal);
              u.lang = langVal;
              u.pitch = 1.0;
              u.rate = 0.95;
              
              // CRITICAL: Store in a global variable to prevent garbage collection mid-speech on Chrome
              window.currentUtterance = u;
              
              const voices = window.speechSynthesis.getVoices();
              if (voices.length > 0) {
                // Find a voice matching the language exactly or falls back to language code prefix
                const matchedVoice = voices.find(v => v.lang.toLowerCase().replace('_', '-').includes(langVal.toLowerCase()));
                if (matchedVoice) {
                  u.voice = matchedVoice;
                } else {
                  const baseLang = langVal.split('-')[0];
                  const fallbackVoice = voices.find(v => v.lang.toLowerCase().startsWith(baseLang));
                  if (fallbackVoice) {
                    u.voice = fallbackVoice;
                  } else {
                    // Fall back to default en-US voice language to prevent Chrome synthesis from freezing
                    u.lang = 'en-US';
                  }
                }
              }
              window.speechSynthesis.speak(u);
            };
            
            const hasVoice = (langCode) => {
              const voices = window.speechSynthesis.getVoices();
              return voices.some(v => v.lang.toLowerCase().replace('_', '-').includes(langCode.toLowerCase()));
            };
            
            // Chrome loads Google online voices asynchronously, so we must wait if they aren't ready yet
            if (window.speechSynthesis.getVoices().length === 0 || (!hasVoice(window.SpeechSynthesisLang) && !window.speechVoicesLoaded)) {
              window.speechSynthesis.onvoiceschanged = () => {
                window.speechVoicesLoaded = true;
                speakText();
                window.speechSynthesis.onvoiceschanged = null; // Clean up listener
              };
              // Safety timeout in case onvoiceschanged does not fire
              setTimeout(() => {
                if (window.speechSynthesis.onvoiceschanged) {
                  window.speechSynthesis.onvoiceschanged = null;
                  speakText();
                }
              }, 350);
            } else {
              speakText();
            }
          } else {
            console.error('Speech synthesis not supported in this browser.');
          }
        })();
      """]);
    } catch (e) {
      print('Speech Synthesis Error: $e');
    }
  }

  static void playAudio(String base64Audio) {
    try {
      // Safe parameter transfer to JS context
      js.context['AudioBase64Data'] = base64Audio;

      js.context.callMethod('eval', ["""
        (function() {
          if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
          }
          if (window.currentAudioElement) {
            window.currentAudioElement.pause();
          }
          const base64 = window.AudioBase64Data || "";
          const audio = new Audio("data:audio/wav;base64," + base64);
          window.currentAudioElement = audio;
          audio.play().catch(e => console.error('Audio play failed:', e));
        })();
      """]);
    } catch (e) {
      print('Audio Playback Error: $e');
    }
  }

  static void stopSpeaking() {
    try {
      js.context.callMethod('eval', ["""
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        if (window.currentAudioElement) {
          window.currentAudioElement.pause();
          window.currentAudioElement = null;
        }
      """]);
    } catch (e) {
      print('Speech stop error: $e');
    }
  }

  static void startRecognition({
    required Function(String) onResult,
    required Function(String) onError,
    required String lang,
  }) {
    try {
      // Register global callbacks so JS code can callback into Dart
      js.context['SpeechHelperCallbackResult'] = (String text) {
        onResult(text);
      };
      js.context['SpeechHelperCallbackError'] = (String err) {
        onError(err);
      };
      js.context['SpeechRecognitionLang'] = lang;

      js.context.callMethod('eval', ["""
        (function() {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          if (!SpeechRecognition) {
            window.SpeechHelperCallbackError('Speech recognition is not supported in this browser. Please use Google Chrome.');
            return;
          }
          
          const initAndStart = () => {
            const rec = new SpeechRecognition();
            rec.lang = window.SpeechRecognitionLang || "en-US";
            rec.continuous = true;
            rec.interimResults = true;
            window.currentRecognition = rec;
            
            let silenceTimer = null;
            let finalTranscript = '';
            
            const stopAndSend = () => {
              if (silenceTimer) clearTimeout(silenceTimer);
              try { rec.stop(); } catch(e) {}
              if (window.currentRecognition === rec) {
                window.currentRecognition = null;
              }
              
              const resultText = finalTranscript.trim();
              if (resultText) {
                window.SpeechHelperCallbackResult(resultText);
              } else {
                window.SpeechHelperCallbackError('No speech detected');
              }
            };
            
            rec.onstart = () => {
              console.log('JS Recognition started...');
              // Initial timeout if they don't say anything at all
              silenceTimer = setTimeout(() => {
                stopAndSend();
              }, 6000);
            };
            
            rec.onerror = (e) => {
              console.error('JS Recognition error:', e);
              if (e.error !== 'no-speech') {
                window.SpeechHelperCallbackError(e.error || 'Speech input failed');
              } else {
                stopAndSend();
              }
            };
            
            rec.onresult = (event) => {
              let interimTranscript = '';
              let newFinal = '';
              for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                  newFinal += event.results[i][0].transcript + ' ';
                } else {
                  interimTranscript += event.results[i][0].transcript;
                }
              }
              if (newFinal) {
                finalTranscript += newFinal;
              }
              
              console.log('Final:', finalTranscript, 'Interim:', interimTranscript);
              
              // Reset silence timer on any transcription update
              if (silenceTimer) clearTimeout(silenceTimer);
              silenceTimer = setTimeout(() => {
                stopAndSend();
              }, 1800); // 1.8s of silence to conclude user is done speaking
            };
            
            try {
              rec.start();
            } catch (e) {
              console.error('Failed to start SpeechRecognition:', e);
              window.SpeechHelperCallbackError('Speech engine busy. Please wait a second.');
            }
          };

          if (window.currentRecognition) {
            console.log('Active recognition found. Aborting first...');
            try { window.currentRecognition.abort(); } catch(e) {}
            window.currentRecognition = null;
            // Wait 350ms for browser to release audio channel
            setTimeout(initAndStart, 350);
          } else {
            initAndStart();
          }
        })();
      """]);
    } catch (e) {
      onError('Recognition instantiation failed: $e');
    }
  }

  static void stopRecognition() {
    try {
      js.context.callMethod('eval', ["""
        if (window.currentRecognition) {
          try { window.currentRecognition.abort(); } catch(e) {}
          window.currentRecognition = null;
        }
      """]);
    } catch (e) {
      print('Speech stop recognition error: $e');
    }
  }
}
