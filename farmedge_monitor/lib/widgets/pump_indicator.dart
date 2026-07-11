import 'package:flutter/material.dart';

import '../core/theme/app_theme.dart';

class PumpIndicator extends StatelessWidget {
  const PumpIndicator({super.key, required this.isActive});

  final bool isActive;

  @override
  Widget build(BuildContext context) {
    final color = isActive ? AppTheme.success : Theme.of(context).colorScheme.outline;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.water, color: color),
                const SizedBox(width: 8),
                Text('Irrigation Pipeline', style: Theme.of(context).textTheme.titleSmall),
              ],
            ),
            const Spacer(),
            Row(
              children: [
                const _Node(icon: Icons.sensors, label: 'Relay', active: true),
                Expanded(child: Divider(color: color, thickness: 1.2)),
                _Node(icon: Icons.power_settings_new, label: isActive ? 'Pump On' : 'Pump Off', active: isActive),
                Expanded(child: Divider(color: color, thickness: 1.2)),
                _Node(icon: Icons.grass, label: 'Field', active: isActive),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Node extends StatelessWidget {
  const _Node({required this.icon, required this.label, required this.active});

  final IconData icon;
  final String label;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final color = active ? AppTheme.success : Theme.of(context).colorScheme.outline;
    return Column(
      children: [
        CircleAvatar(
          radius: 17,
          backgroundColor: color.withValues(alpha: .18),
          child: Icon(icon, color: color, size: 17),
        ),
        const SizedBox(height: 6),
        Text(label, style: Theme.of(context).textTheme.labelSmall),
      ],
    );
  }
}
