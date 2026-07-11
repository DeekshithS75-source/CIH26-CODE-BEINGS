import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/constants/app_constants.dart';
import '../models/farm_status.dart';
import '../services/esp32_api_service.dart';

enum TemperatureUnit { celsius, fahrenheit }

class AppSettings {
  const AppSettings({
    required this.baseUrl,
    required this.pollingSeconds,
    required this.darkMode,
    required this.temperatureUnit,
    required this.loaded,
  });

  final String baseUrl;
  final int pollingSeconds;
  final bool darkMode;
  final TemperatureUnit temperatureUnit;
  final bool loaded;

  AppSettings copyWith({
    String? baseUrl,
    int? pollingSeconds,
    bool? darkMode,
    TemperatureUnit? temperatureUnit,
    bool? loaded,
  }) {
    return AppSettings(
      baseUrl: baseUrl ?? this.baseUrl,
      pollingSeconds: pollingSeconds ?? this.pollingSeconds,
      darkMode: darkMode ?? this.darkMode,
      temperatureUnit: temperatureUnit ?? this.temperatureUnit,
      loaded: loaded ?? this.loaded,
    );
  }
}

class SettingsNotifier extends StateNotifier<AppSettings> {
  SettingsNotifier() : super(_defaults()) {
    _load();
  }

  static AppSettings _defaults() {
    return const AppSettings(
      baseUrl: AppConstants.defaultBaseUrl,
      pollingSeconds: 1,
      darkMode: true,
      temperatureUnit: TemperatureUnit.celsius,
      loaded: false,
    );
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    state = AppSettings(
      baseUrl: prefs.getString('baseUrl') ?? AppConstants.defaultBaseUrl,
      pollingSeconds: prefs.getInt('pollingSeconds') ?? 1,
      darkMode: prefs.getBool('darkMode') ?? true,
      temperatureUnit: TemperatureUnit.values.byName(
        prefs.getString('temperatureUnit') ?? TemperatureUnit.celsius.name,
      ),
      loaded: true,
    );
  }

  Future<void> update(AppSettings next) async {
    final normalized = next.copyWith(
      baseUrl: _normalizeBaseUrl(next.baseUrl),
      pollingSeconds: next.pollingSeconds.clamp(
        AppConstants.minPollingSeconds,
        AppConstants.maxPollingSeconds,
      ).toInt(),
      loaded: true,
    );
    state = normalized;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('baseUrl', normalized.baseUrl);
    await prefs.setInt('pollingSeconds', normalized.pollingSeconds);
    await prefs.setBool('darkMode', normalized.darkMode);
    await prefs.setString('temperatureUnit', normalized.temperatureUnit.name);
  }

  static String _normalizeBaseUrl(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return AppConstants.defaultBaseUrl;
    final withScheme = trimmed.startsWith('http://') ? trimmed : 'http://$trimmed';
    return withScheme.endsWith('/') ? withScheme.substring(0, withScheme.length - 1) : withScheme;
  }
}

final settingsProvider = StateNotifierProvider<SettingsNotifier, AppSettings>((ref) {
  return SettingsNotifier();
});

class FarmSample {
  const FarmSample({
    required this.timestamp,
    required this.temperature,
    required this.humidity,
    required this.moisture,
    required this.battery,
  });

  final DateTime timestamp;
  final double temperature;
  final double humidity;
  final double moisture;
  final double battery;
}

class FarmState {
  const FarmState({
    required this.status,
    required this.history,
    required this.isOnline,
    required this.isLoading,
    required this.lastError,
    required this.lastPollAt,
  });

  final FarmStatus? status;
  final List<FarmSample> history;
  final bool isOnline;
  final bool isLoading;
  final String? lastError;
  final DateTime? lastPollAt;

  factory FarmState.initial() {
    return const FarmState(
      status: null,
      history: [],
      isOnline: false,
      isLoading: true,
      lastError: null,
      lastPollAt: null,
    );
  }

  FarmState copyWith({
    FarmStatus? status,
    List<FarmSample>? history,
    bool? isOnline,
    bool? isLoading,
    String? lastError,
    bool clearError = false,
    DateTime? lastPollAt,
  }) {
    return FarmState(
      status: status ?? this.status,
      history: history ?? this.history,
      isOnline: isOnline ?? this.isOnline,
      isLoading: isLoading ?? this.isLoading,
      lastError: clearError ? null : lastError ?? this.lastError,
      lastPollAt: lastPollAt ?? this.lastPollAt,
    );
  }
}

class FarmNotifier extends StateNotifier<FarmState> {
  FarmNotifier(this.ref) : super(FarmState.initial()) {
    ref.listen<AppSettings>(settingsProvider, (_, next) {
      if (next.loaded) _restart();
    }, fireImmediately: true);
  }

  final Ref ref;
  Timer? _timer;

  Future<void> refresh() async {
    final settings = ref.read(settingsProvider);
    if (!settings.loaded) return;
    try {
      final service = Esp32ApiService(baseUrl: settings.baseUrl);
      final status = await service.fetchStatus();
      final history = [
        ...state.history,
        FarmSample(
          timestamp: DateTime.now(),
          temperature: status.temperature,
          humidity: status.humidity,
          moisture: status.soilMoisture,
          battery: status.battery,
        ),
      ];
      state = state.copyWith(
        status: status,
        history: history.length > AppConstants.chartWindow
            ? history.sublist(history.length - AppConstants.chartWindow)
            : history,
        isOnline: true,
        isLoading: false,
        clearError: true,
        lastPollAt: DateTime.now(),
      );
    } catch (error) {
      state = state.copyWith(
        isOnline: false,
        isLoading: false,
        lastError: 'Device Offline',
        lastPollAt: DateTime.now(),
      );
    }
  }

  void _restart() {
    _timer?.cancel();
    refresh();
    final seconds = ref.read(settingsProvider).pollingSeconds;
    _timer = Timer.periodic(Duration(seconds: seconds), (_) => refresh());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}

final farmProvider = StateNotifierProvider<FarmNotifier, FarmState>((ref) {
  return FarmNotifier(ref);
});
