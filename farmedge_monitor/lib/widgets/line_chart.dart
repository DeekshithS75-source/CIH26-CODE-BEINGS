import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

class FarmLineChart extends StatelessWidget {
  const FarmLineChart({
    super.key,
    required this.values,
    required this.color,
    required this.minY,
    required this.maxY,
  });

  final List<double> values;
  final Color color;
  final double minY;
  final double maxY;

  @override
  Widget build(BuildContext context) {
    final spots = <FlSpot>[
      for (var i = 0; i < values.length; i++) FlSpot(i.toDouble(), values[i]),
    ];

    return LineChart(
      LineChartData(
        minY: minY,
        maxY: maxY,
        gridData: FlGridData(
          drawVerticalLine: false,
          getDrawingHorizontalLine: (_) => FlLine(
            color: Theme.of(context).colorScheme.outline.withOpacity(.13),
            strokeWidth: 1,
            dashArray: [4, 4],
          ),
        ),
        titlesData: FlTitlesData(
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 34,
              getTitlesWidget: (value, _) => Text(
                value.round().toString(),
                style: Theme.of(context).textTheme.labelSmall,
              ),
            ),
          ),
        ),
        borderData: FlBorderData(
          show: true,
          border: Border.all(color: Theme.of(context).colorScheme.outline.withOpacity(.16)),
        ),
        lineBarsData: [
          LineChartBarData(
            spots: spots.isEmpty ? const [FlSpot(0, 0)] : spots,
            isCurved: true,
            color: color,
            barWidth: 2,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(show: true, color: color.withOpacity(.12)),
          ),
        ],
      ),
      duration: const Duration(milliseconds: 450),
    );
  }
}
