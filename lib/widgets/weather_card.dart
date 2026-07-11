import 'package:flutter/material.dart';

import '../core/theme/app_theme.dart';

class WeatherCard extends StatelessWidget {
  const WeatherCard({
    super.key,
    required this.rain,
    required this.temperature,
    required this.humidity,
  });

  final bool rain;
  final double temperature;
  final double humidity;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(rain ? Icons.water_drop : Icons.wb_sunny, color: rain ? Colors.lightBlue : AppTheme.warning),
                const SizedBox(width: 8),
                Text('Field Weather', style: Theme.of(context).textTheme.titleSmall),
              ],
            ),
            const SizedBox(height: 16),
            Text(rain ? 'Rain Detected' : 'No Rain', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 8),
            Text('${temperature.round()}°C  •  ${humidity.round()}% humidity'),
          ],
        ),
      ),
    );
  }
}
