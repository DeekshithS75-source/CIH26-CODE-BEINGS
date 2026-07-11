import 'package:flutter/material.dart';

import '../core/theme/app_theme.dart';

class BatteryCard extends StatelessWidget {
  const BatteryCard({super.key, required this.level});

  final double level;

  @override
  Widget build(BuildContext context) {
    final color = level < 25 ? AppTheme.danger : level < 50 ? AppTheme.warning : AppTheme.success;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.battery_charging_full, color: color),
                const SizedBox(width: 8),
                Text('Node Battery', style: Theme.of(context).textTheme.titleSmall),
              ],
            ),
            const SizedBox(height: 18),
            TweenAnimationBuilder<double>(
              tween: Tween(end: level.clamp(0, 100)),
              duration: const Duration(milliseconds: 500),
              builder: (context, value, _) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    LinearProgressIndicator(
                      value: value / 100,
                      color: color,
                      minHeight: 10,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      '${value.round()}%',
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w900),
                    ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
