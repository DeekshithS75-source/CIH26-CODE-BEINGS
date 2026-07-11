import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants/app_constants.dart';
import '../../providers/farm_provider.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  late final TextEditingController _baseUrlController;
  late final TextEditingController _pollingController;

  @override
  void initState() {
    super.initState();
    final settings = ref.read(settingsProvider);
    _baseUrlController = TextEditingController(text: settings.baseUrl);
    _pollingController = TextEditingController(text: settings.pollingSeconds.toString());
  }

  @override
  void dispose() {
    _baseUrlController.dispose();
    _pollingController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final settings = ref.watch(settingsProvider);

    if (_baseUrlController.text != settings.baseUrl) {
      _baseUrlController.text = settings.baseUrl;
    }
    if (_pollingController.text != settings.pollingSeconds.toString()) {
      _pollingController.text = settings.pollingSeconds.toString();
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Farm Settings'),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.go('/dashboard')),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('ESP32 Connection', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900)),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _baseUrlController,
                      decoration: const InputDecoration(
                        labelText: 'ESP32 IP Address',
                        hintText: AppConstants.defaultBaseUrl,
                        prefixIcon: Icon(Icons.router),
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.url,
                      onSubmitted: (_) => _save(settings),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: _pollingController,
                      decoration: const InputDecoration(
                        labelText: 'Polling Interval',
                        suffixText: 'seconds',
                        prefixIcon: Icon(Icons.timer),
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      onSubmitted: (_) => _save(settings),
                    ),
                    const SizedBox(height: 14),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Dark Mode'),
                      secondary: const Icon(Icons.dark_mode),
                      value: settings.darkMode,
                      onChanged: (value) => _save(settings.copyWith(darkMode: value)),
                    ),
                    const SizedBox(height: 4),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Semi-Automated Irrigation'),
                      subtitle: const Text('Require confirmation before turning on sprinkler pump'),
                      secondary: const Icon(Icons.water_drop),
                      value: settings.smartTriggerMode == 'CONFIRMATION',
                      onChanged: (value) async {
                        final nextMode = value ? 'CONFIRMATION' : 'AUTOMATED';
                        // Optimistic local update first so toggle responds immediately
                        await ref.read(settingsProvider.notifier).update(
                          settings.copyWith(smartTriggerMode: nextMode),
                        );
                        // Then sync to backend
                        try {
                          await ref.read(farmProvider.notifier).setTriggerMode(nextMode);
                        } catch (_) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Could not sync mode to backend')),
                            );
                          }
                        }
                      },
                    ),
                    const SizedBox(height: 4),
                    SegmentedButton<TemperatureUnit>(
                      segments: const [
                        ButtonSegment(value: TemperatureUnit.celsius, label: Text('Celsius'), icon: Icon(Icons.thermostat)),
                        ButtonSegment(value: TemperatureUnit.fahrenheit, label: Text('Fahrenheit'), icon: Icon(Icons.device_thermostat)),
                      ],
                      selected: {settings.temperatureUnit},
                      onSelectionChanged: (selection) {
                        _save(settings.copyWith(temperatureUnit: selection.first));
                      },
                    ),
                    const SizedBox(height: 18),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: () => _save(settings),
                        icon: const Icon(Icons.save),
                        label: const Text('Save Settings'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Offline Operation', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900)),
                    const SizedBox(height: 10),
                    const Text('FarmEdge Monitor uses only the local ESP32 REST API. Last received telemetry remains visible when the device disconnects.'),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _save(AppSettings settings) async {
    final polling = int.tryParse(_pollingController.text) ?? settings.pollingSeconds;
    await ref.read(settingsProvider.notifier).update(
          settings.copyWith(
            baseUrl: _baseUrlController.text,
            pollingSeconds: polling.clamp(
              AppConstants.minPollingSeconds,
              AppConstants.maxPollingSeconds,
            ).toInt(),
          ),
        );
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Settings saved')));
    }
  }
}
