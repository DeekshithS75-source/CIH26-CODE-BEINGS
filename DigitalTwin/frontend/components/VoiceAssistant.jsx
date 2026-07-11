import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, X, MessageSquare } from 'lucide-react';

export default function VoiceAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('Ready'); // Ready, Listening, Analyzing, Speaking
  const [language, setLanguage] = useState('en-US'); // en-US, ml-IN, kn-IN
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    // Initialize Web Speech Synthesis API
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }

    // Initialize Web Speech Recognition API
    const SpeechRecognition =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      
      rec.onstart = () => {
        setIsListening(true);
        setStatus('Listening...');
        setTranscript('');
      };

      rec.onerror = (e) => {
        console.error('Speech Recognition Error:', e);
        setIsListening(false);
        setStatus('Error: Speech failed');
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = async (event) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        setStatus('Analyzing...');
        await sendQueryToBackend(text);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Update recognition language configuration whenever selector shifts
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language;
    }
  }, [language]);

  const togglePanel = () => {
    if (isOpen) {
      stopSpeaking();
    }
    setIsOpen(!isOpen);
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported by your browser. Please use Chrome.');
      return;
    }
    stopSpeaking();
    try {
      recognitionRef.current.start();
    } catch (e) {
      console.warn('Recognition already started', e);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (synthRef.current && synthRef.current.speaking) {
      synthRef.current.cancel();
    }
    setStatus('Ready');
  };

  const sendQueryToBackend = async (text) => {
    try {
      const res = await fetch(`http://localhost:3001/api/voice-chat?query=${encodeURIComponent(text)}`);
      const data = await res.json();
      
      if (data.success) {
        setResponse(data.response);
        setStatus('Speaking...');
        speakText(data.response, data.language);
      } else {
        setStatus('Error: Failed to process query');
      }
    } catch (err) {
      console.error('Failed to contact voice API:', err);
      setStatus('Error: Server offline');
    }
  };

  const speakText = (text, lang) => {
    // 1. Try to use Google Translate's high-quality human TTS audio API (runs natively in the browser via HTML5 Audio)
    try {
      stopSpeaking(); // stop any current speech
      
      // Determine the language parameter for Google TTS
      let gttsLang = 'en';
      if (lang === 'ml') gttsLang = 'ml';
      else if (lang === 'kn') gttsLang = 'kn';
      
      const gttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${gttsLang}&client=tw-ob&q=${encodeURIComponent(text)}`;
      
      const audio = new Audio(gttsUrl);
      
      audio.onended = () => {
        setStatus('Ready');
      };
      
      audio.onerror = (err) => {
        console.warn('Google TTS failed, falling back to local speech synthesis:', err);
        speakTextLocalFallback(text, lang);
      };
      
      audioRef.current = audio; // Keep reference to pause/cancel it
      audio.play();
    } catch (e) {
      console.warn('Google TTS play exception, using local speech synthesis:', e);
      speakTextLocalFallback(text, lang);
    }
  };

  const speakTextLocalFallback = (text, lang) => {
    if (!synthRef.current) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Map lang codes ('ml', 'kn', 'en') to browser voice lang codes
    if (lang === 'ml') {
      utterance.lang = 'ml-IN';
    } else if (lang === 'kn') {
      utterance.lang = 'kn-IN';
    } else {
      utterance.lang = 'en-US';
    }

    // Try to find a specific local voice that fits the language
    const voices = synthRef.current.getVoices();
    const matchingVoice = voices.find(v => v.lang.startsWith(utterance.lang));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onend = () => {
      setStatus('Ready');
    };

    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      setStatus('Ready');
    };

    synthRef.current.speak(utterance);
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000, fontFamily: 'inherit' }}>
      
      {/* Voice Panel Overlay */}
      {isOpen && (
        <div className="glass-card" style={{
          position: 'absolute',
          bottom: '70px',
          right: '0',
          width: '320px',
          padding: '20px',
          borderRadius: '16px',
          border: '1.5px solid var(--primary)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          animation: 'slideUp 0.3s ease-out'
        }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Volume2 size={18} color="var(--primary)" />
              <span style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-primary)' }}>AI Farm Assistant</span>
            </div>
            <button onClick={togglePanel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>

          {/* Language Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Select Language:</label>
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                background: 'rgba(0,0,0,0.4)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '6px',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            >
              <option value="en-US">English (Default)</option>
              <option value="ml-IN">മലയാളം (Malayalam)</option>
              <option value="kn-IN">ಕನ್ನಡ (Kannada)</option>
            </select>
          </div>

          {/* Transcript/Response Display */}
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '10px',
            padding: '12px',
            minHeight: '100px',
            maxHeight: '150px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '0.8rem',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            {transcript && (
              <div style={{ color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--primary)' }}>You:</strong> {transcript}
              </div>
            )}
            {response && (
              <div style={{ color: 'var(--text-primary)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px' }}>
                <strong style={{ color: 'var(--water)' }}>AI Agronomist:</strong> {response}
              </div>
            )}
            {!transcript && !response && (
              <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80px' }}>
                Press mic and speak to start conversation...
              </div>
            )}
          </div>

          {/* Controller buttons & Radar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              
              {/* Radar pulse rings */}
              {isListening && (
                <>
                  <div className="pulse-ring" style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid var(--primary)', position: 'absolute', animation: 'ping 1.5s infinite' }} />
                  <div className="pulse-ring" style={{ width: '80px', height: '80px', borderRadius: '50%', border: '1px solid var(--primary)', position: 'absolute', animation: 'ping 1.5s infinite 0.75s' }} />
                </>
              )}
              
              {/* Mic Main Button */}
              <button
                onClick={isListening ? stopListening : startListening}
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: isListening ? 'var(--danger)' : 'var(--primary)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 15px var(--primary-glow)',
                  color: '#fff',
                  transition: 'all 0.3s'
                }}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            </div>
            
            {/* Status indicator text */}
            <span style={{ fontSize: '0.75rem', color: isListening ? 'var(--danger)' : 'var(--text-muted)', fontWeight: '600' }}>
              Status: {status}
            </span>
          </div>

        </div>
      )}

      {/* Floating Action Button (FAB) */}
      <button
        onClick={togglePanel}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--primary)',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
          transition: 'transform 0.2s',
          transform: isOpen ? 'rotate(90deg)' : 'none'
        }}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

    </div>
  );
}
