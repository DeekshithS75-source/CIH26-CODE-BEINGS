import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../providers/farm_provider.dart';
import '../../widgets/connection_status.dart';
import '../../widgets/line_chart.dart';

class FarmDetailsScreen extends ConsumerWidget {
  const FarmDetailsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final farm = ref.watch(farmProvider);
    final status = farm.status;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Farm Details'),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.go('/dashboard')),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Center(
              child: ConnectionStatus(
                isOnline: farm.isOnline,
                label: farm.isOnline ? 'ESP32 Live' : 'Device Offline',
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Wrap(
                  spacing: 18,
                  runSpacing: 12,
                  children: [
                    _Metric(label: 'Last ESP32 Update', value: status == null ? '--' : _formatDate(status.lastUpdated)),
                    _Metric(label: 'Last Poll', value: farm.lastPollAt == null ? '--' : _formatTime(farm.lastPollAt!)),
                    _Metric(label: 'Samples Stored', value: '${farm.history.length}/50'),
                    _Metric(label: 'Endpoint State', value: farm.lastError ?? 'Connected'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
            LayoutBuilder(
              builder: (context, constraints) {
                final wide = constraints.maxWidth >= 760;
                final charts = [
                  _ChartCard(
                    title: 'Temperature Graph',
                    values: farm.history.map((sample) => sample.temperature).toList(),
                    color: AppTheme.warning,
                    minY: 0,
                    maxY: 60,
                  ),
                  _ChartCard(
                    title: 'Humidity Graph',
                    values: farm.history.map((sample) => sample.humidity).toList(),
                    color: Colors.lightBlue,
                    minY: 0,
                    maxY: 100,
                  ),
                  _ChartCard(
                    title: 'Moisture Graph',
                    values: farm.history.map((sample) => sample.moisture).toList(),
                    color: AppTheme.success,
                    minY: 0,
                    maxY: 100,
                  ),
                  _ChartCard(
                    title: 'Battery Graph',
                    values: farm.history.map((sample) => sample.battery).toList(),
                    color: Colors.tealAccent,
                    minY: 0,
                    maxY: 100,
                  ),
                ];
                if (!wide) {
                  return Column(
                    children: [
                      for (final chart in charts) ...[chart, const SizedBox(height: 14)],
                    ],
                  );
                }
                return GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 14,
                  mainAxisSpacing: 14,
                  childAspectRatio: 1.45,
                  children: charts,
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  static String _formatTime(DateTime value) {
    return '${value.hour.toString().padLeft(2, '0')}:${value.minute.toString().padLeft(2, '0')}:${value.second.toString().padLeft(2, '0')}';
  }

  static String _formatDate(DateTime value) {
    return '${value.year}-${value.month.toString().padLeft(2, '0')}-${value.day.toString().padLeft(2, '0')} ${_formatTime(value)}';
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 170,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.labelMedium),
          const SizedBox(height: 4),
          Text(value, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }
}

class _ChartCard extends StatelessWidget {
  const _ChartCard({
    required this.title,
    required this.values,
    required this.color,
    required this.minY,
    required this.maxY,
  });

  final String title;
  final List<double> values;
  final Color color;
  final double minY;
  final double maxY;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900)),
            const SizedBox(height: 14),
            Expanded(
              child: FarmLineChart(values: values, color: color, minY: minY, maxY: maxY),
            ),
          ],
        ),
      ),
    );
  }
}
