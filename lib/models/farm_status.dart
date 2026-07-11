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
    required this.lastUpdated,
  });

  final double temperature;
  final double humidity;
  final double soilMoisture;
  final double battery;
  final bool pump;
  final bool rain;
  final CropStress cropStress;
  final DateTime lastUpdated;

  factory FarmStatus.fromJson(Map<String, dynamic> json) {
    return FarmStatus(
      temperature: (json['temperature'] as num?)?.toDouble() ?? 0,
      humidity: (json['humidity'] as num?)?.toDouble() ?? 0,
      soilMoisture: (json['soilMoisture'] as num?)?.toDouble() ?? 0,
      battery: (json['battery'] as num?)?.toDouble() ?? 0,
      pump: json['pump'] as bool? ?? false,
      rain: json['rain'] as bool? ?? false,
      cropStress: _stressFromJson(json['cropStress']),
      lastUpdated: DateTime.tryParse('${json['lastUpdated']}') ?? DateTime.now(),
    );
  }

  static CropStress _stressFromJson(Object? value) {
    return switch ('$value'.toUpperCase()) {
      'LOW' => CropStress.low,
      'MEDIUM' => CropStress.medium,
      'HIGH' => CropStress.high,
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
