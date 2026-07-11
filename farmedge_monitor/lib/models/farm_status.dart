enum CropStress { low, medium, high, unknown }

class FarmStatus {
  const FarmStatus({
    required this.temperature,
    required this.humidity,
    required this.soilMoisture,
    required this.battery,
    required this.pump,
    required this.rain,
    required this.cropStress,
    required this.pressure,
    required this.weatherForecast,
    required this.weatherSource,
    required this.batteryHoursRemaining,
    required this.currentDraw,
    required this.lastUpdated,
    required this.apiTemperature,
    required this.apiHumidity,
    required this.apiRain,
    required this.smartTriggerMode,
    required this.alert,
  });

  final double temperature;
  final double humidity;
  final double soilMoisture;
  final double battery;
  final bool pump;
  final bool rain;
  final CropStress cropStress;
  final double pressure;
  final String weatherForecast;
  final String weatherSource;
  final double batteryHoursRemaining;
  final double currentDraw;
  final DateTime lastUpdated;
  final double apiTemperature;
  final double apiHumidity;
  final bool apiRain;
  final String smartTriggerMode;
  final String alert;

  factory FarmStatus.fromJson(Map<String, dynamic> json) {
    return FarmStatus(
      temperature: (json['temperature'] as num?)?.toDouble() ?? 0.0,
      humidity: (json['humidity'] as num?)?.toDouble() ?? 0.0,
      soilMoisture: (json['soilMoisture'] as num?)?.toDouble() ?? 
                    (json['soil_mo_status'] as num?)?.toDouble() ?? 
                    (json['soil_moisture'] as num?)?.toDouble() ?? 0.0,
      battery: (json['battery'] as num?)?.toDouble() ?? 0.0,
      pump: json['pump'] as bool? ?? (json['irrigation'] == "ON") ?? false,
      rain: json['rain'] as bool? ?? false,
      cropStress: _stressFromJson(json['cropStress'] ?? json['crop_health']),
      pressure: (json['pressure'] as num?)?.toDouble() ?? 
                (json['barometric_pressure'] as num?)?.toDouble() ?? 1013.0,
      weatherForecast: json['weatherForecast'] as String? ?? 
                       json['weather_forecast'] as String? ?? 'STABLE',
      weatherSource: json['weatherSource'] as String? ?? 'EDGE_ML_FALLBACK',
      batteryHoursRemaining: (json['batteryHoursRemaining'] as num?)?.toDouble() ?? 
                             (json['battery_time_remaining_hours'] as num?)?.toDouble() ?? 25.0,
      currentDraw: (json['currentDraw'] as num?)?.toDouble() ?? 
                   (json['current_draw_ma'] as num?)?.toDouble() ?? 80.0,
      lastUpdated: DateTime.tryParse('${json['lastUpdated'] ?? json['timestamp']}') ?? DateTime.now(),
      apiTemperature: (json['apiTemperature'] as num?)?.toDouble() ?? 
                      (json['api_temperature'] as num?)?.toDouble() ?? 
                      (json['temperature'] as num?)?.toDouble() ?? 0.0,
      apiHumidity: (json['apiHumidity'] as num?)?.toDouble() ?? 
                   (json['api_humidity'] as num?)?.toDouble() ?? 
                   (json['humidity'] as num?)?.toDouble() ?? 0.0,
      apiRain: json['apiRain'] as bool? ?? json['api_rain'] as bool? ?? json['rain'] as bool? ?? false,
      smartTriggerMode: json['smartTriggerMode'] as String? ?? 
                        json['smart_trigger_mode'] as String? ?? 'AUTOMATED',
      alert: json['alert'] as String? ?? 'NONE',
    );
  }

  static CropStress _stressFromJson(Object? value) {
    final str = '$value'.toUpperCase();
    return switch (str) {
      'LOW' || 'HEALTHY' => CropStress.low,
      'MEDIUM' || 'WATER_STRESSED' => CropStress.medium,
      'HIGH' || 'HEAT_STRESSED' => CropStress.high,
      _ => CropStress.unknown,
    };
  }

  String get stressLabel {
    return switch (cropStress) {
      CropStress.low => 'LOW',
      CropStress.medium => 'MEDIUM',
      CropStress.high => 'HIGH',
      CropStress.unknown => 'UNKNOWN',
    };
  }

  int get stressScore {
    return switch (cropStress) {
      CropStress.low => 22,
      CropStress.medium => 53,
      CropStress.high => 84,
      CropStress.unknown => 0,
    };
  }
}
