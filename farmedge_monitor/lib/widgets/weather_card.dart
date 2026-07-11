import 'package:flutter/material.dart';

import '../core/theme/app_theme.dart';

class WeatherCard extends StatelessWidget {
  const WeatherCard({
    super.key,
    required this.rain,
    required this.temperature,
    required this.humidity,
    this.weatherSource = 'EDGE_ML_FALLBACK',
    this.onPredictTomorrow,
  });

  final bool rain;
  final double temperature;
  final double humidity;
  final String weatherSource;
  final VoidCallback? onPredictTomorrow;

  @override
  Widget build(BuildContext context) {
    final isApi = weatherSource == 'REAL_TIME_API';
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
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: isApi ? Colors.green.withOpacity(0.15) : Colors.orange.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(
                      color: isApi ? Colors.green.withOpacity(0.5) : Colors.orange.withOpacity(0.5),
                      width: 1,
                    ),
                  ),
                  child: Text(
                    isApi ? 'API ACTIVE' : 'ML FALLBACK',
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.bold,
                      color: isApi ? Colors.green : Colors.orange,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(rain ? 'Rain Detected' : 'No Rain', style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 8),
            Row(
              children: [
                Text('${temperature.round()}°C  •  ${humidity.round()}% humidity'),
                if (onPredictTomorrow != null) ...[
                  const Spacer(),
                  TextButton.icon(
                    onPressed: onPredictTomorrow,
                    icon: const Icon(Icons.psychology, size: 16, color: Colors.blueAccent),
                    label: const Text('AI Tomorrow', style: TextStyle(fontSize: 11, color: Colors.blueAccent)),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}
