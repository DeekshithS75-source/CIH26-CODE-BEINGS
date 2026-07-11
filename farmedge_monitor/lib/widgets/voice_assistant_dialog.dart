import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/theme/app_theme.dart';
import '../providers/farm_provider.dart';
import '../services/speech_service.dart';

class VoiceAssistantDialog extends ConsumerStatefulWidget {
  const VoiceAssistantDialog({super.key});

  @override
  ConsumerState<VoiceAssistantDialog> createState() => _VoiceAssistantDialogState();
}

class _VoiceAssistantDialogState extends ConsumerState<VoiceAssistantDialog> with SingleTickerProviderStateMixin {
  String _status = 'Ready';
  String _language = 'en-US'; // Default English
  String _transcript = '';
  String _response = '';
  bool _isListening = false;
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );
  }

  @override
  void dispose() {
    SpeechService.stopSpeaking();
    SpeechService.stopRecognition();
    _pulseController.dispose();
    super.dispose();
  }

  void _startListening() {
    SpeechService.stopSpeaking();
    SpeechService.stopRecognition();
    setState(() {
      _isListening = true;
      _status = 'Listening...';
      _transcript = '';
      _response = '';
    });
    _pulseController.repeat(reverse: true);

    SpeechService.startRecognition(
      lang: _language,
      onResult: (text) {
        if (!mounted) return;
        setState(() {
          _transcript = text;
          _status = 'Analyzing...';
          _isListening = false;
        });
        _pulseController.stop();
        _sendQueryToBackend(text);
      },
      onError: (err) {
        if (!mounted) return;
        setState(() {
          final errLower = err.toLowerCase();
          if (errLower.contains('aborted') || errLower.contains('no-speech')) {
            _status = 'Ready (Tap mic to speak)';
          } else if (errLower.contains('not-allowed')) {
            _status = 'Mic permission denied!';
          } else {
            _status = 'Error: $err';
          }
          _isListening = false;
        });
        _pulseController.stop();
      },
    );
  }

  void _stopListening() {
    SpeechService.stopSpeaking();
    SpeechService.stopRecognition();
    setState(() {
      _isListening = false;
      _status = 'Ready';
    });
    _pulseController.stop();
  }

  Future<void> _sendQueryToBackend(String queryText) async {
    try {
      final farm = ref.read(farmProvider.notifier);
      final data = await farm.fetchVoiceChat(queryText);
      if (!mounted) return;

      if (data['success'] == true) {
        final respText = data['response'] as String? ?? '';
        final respLang = data['language'] as String? ?? _language;
        final base64Audio = data['audio'] as String?;
        setState(() {
          _response = respText;
          _status = 'Speaking...';
        });
        if (base64Audio != null && base64Audio.isNotEmpty) {
          SpeechService.playAudio(base64Audio);
        } else {
          SpeechService.speak(respText, respLang);
        }
      } else {
        setState(() {
          _status = 'Failed to process query';
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _status = 'Error: Server offline';
      });
      print('Voice assistant error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final titleStyle = Theme.of(context).textTheme.titleLarge?.copyWith(
          fontWeight: FontWeight.w900,
          color: Colors.white,
        );

    return Dialog(
      backgroundColor: const Color(0xFF0D2419),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.white.withOpacity(0.08)),
      ),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 450),
        padding: const EdgeInsets.all(22),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Title Header
            Row(
              children: [
                const Icon(Icons.psychology, color: AppTheme.success, size: 28),
                const SizedBox(width: 10),
                Text('AI Crop Assistant', style: titleStyle),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white70),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const Divider(color: Colors.white12, height: 24),

            // Language Selector
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Choose Language:', style: TextStyle(color: Colors.white70, fontSize: 13)),
                DropdownButton<String>(
                  value: _language,
                  dropdownColor: const Color(0xFF0D2419),
                  style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                  underline: const SizedBox(),
                  items: const [
                    DropdownMenuItem(value: 'en-US', child: Text('English')),
                    DropdownMenuItem(value: 'ml-IN', child: Text('മലയാളം (Malayalam)')),
                    DropdownMenuItem(value: 'kn-IN', child: Text('ಕನ್ನಡ (Kannada)')),
                  ],
                  onChanged: (val) {
                    if (val != null) {
                      setState(() {
                        _language = val;
                      });
                    }
                  },
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Speech Bubbles & Content View
            Container(
              height: 160,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.25),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withOpacity(0.05)),
              ),
              child: ListView(
                physics: const BouncingScrollPhysics(),
                children: [
                  if (_transcript.isNotEmpty) ...[
                    Align(
                      alignment: Alignment.centerRight,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppTheme.success.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppTheme.success.withOpacity(0.3)),
                        ),
                        child: Text(
                          _transcript,
                          style: const TextStyle(color: Colors.white, fontSize: 13),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  if (_response.isNotEmpty) ...[
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.06),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.white.withOpacity(0.1)),
                        ),
                        child: Text(
                          _response,
                          style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
                        ),
                      ),
                    ),
                  ],
                  if (_transcript.isEmpty && _response.isEmpty)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.only(top: 40),
                        child: Text(
                          'Try asking: "What is my crop stress?"\nor "Turn on the water pump"',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.white38, fontSize: 13, height: 1.4),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Mic Button Area
            Center(
              child: Column(
                children: [
                  AnimatedBuilder(
                    animation: _pulseController,
                    builder: (context, child) {
                      final scale = 1.0 + (_pulseController.value * 0.18);
                      return Transform.scale(
                        scale: _isListening ? scale : 1.0,
                        child: Container(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            boxShadow: [
                              if (_isListening)
                                BoxShadow(
                                  color: AppTheme.success.withOpacity(0.4),
                                  blurRadius: 18,
                                  spreadRadius: 4,
                                )
                            ],
                          ),
                          child: CircleAvatar(
                            radius: 36,
                            backgroundColor: _isListening ? AppTheme.danger : AppTheme.success,
                            child: IconButton(
                              iconSize: 34,
                              color: Colors.white,
                              icon: Icon(_isListening ? Icons.mic_off : Icons.mic),
                              onPressed: _isListening ? _stopListening : _startListening,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _status,
                    style: TextStyle(
                      color: _status.startsWith('Error')
                          ? AppTheme.danger
                          : _isListening
                              ? AppTheme.success
                              : Colors.white70,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
