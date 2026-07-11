import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../models/farm_status.dart';
import '../../providers/farm_provider.dart';
import '../../widgets/connection_status.dart';
import '../../widgets/line_chart.dart';
import '../../widgets/pump_indicator.dart';
import '../../widgets/sensor_card.dart';
import '../../widgets/weather_card.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  late Timer _clockTimer;
  DateTime _now = DateTime.now();

  @override
  void initState() {
    super.initState();
    _clockTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _now = DateTime.now());
    });
  }

  @override
  void dispose() {
    _clockTimer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final farm = ref.watch(farmProvider);
    final settings = ref.watch(settingsProvider);
    final status = farm.status;
    final temperature = _displayTemperature(status?.temperature ?? 0, settings.temperatureUnit);
    final tempUnit = settings.temperatureUnit == TemperatureUnit.celsius ? '°C' : '°F';

    return Scaffold(
      body: Row(
        children: [
          _SideNav(
            selectedIndex: 0,
            onDashboard: () {},
            onDetails: () => context.go('/details'),
            onSettings: () => context.go('/settings'),
          ),
          Expanded(
            child: SafeArea(
              child: RefreshIndicator(
                onRefresh: () => ref.read(farmProvider.notifier).refresh(),
                child: CustomScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  slivers: [
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(18, 14, 18, 18),
                      sliver: SliverList(
                        delegate: SliverChildListDelegate([
                          _TopBar(isOnline: farm.isOnline),
                          const SizedBox(height: 18),
                          _HeroOverview(
                            status: status,
                            now: _now,
                            isOnline: farm.isOnline,
                            temperature: temperature,
                            tempUnit: tempUnit,
                          ),
                          const SizedBox(height: 18),
                          _TelemetryGrid(
                            status: status,
                            temperature: temperature,
                            tempUnit: tempUnit,
                            onViewAll: () => context.go('/details'),
                          ),
                          const SizedBox(height: 14),
                          LayoutBuilder(
                            builder: (context, constraints) {
                              final wide = constraints.maxWidth >= 760;
                              final children = [
                                _CropStressPanel(status: status),
                                _TrendsPanel(history: farm.history),
                              ];
                              return wide
                                  ? Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Expanded(flex: 4, child: children[0]),
                                        const SizedBox(width: 14),
                                        Expanded(flex: 7, child: children[1]),
                                      ],
                                    )
                                  : Column(children: [children[0], const SizedBox(height: 14), children[1]]);
                            },
                          ),
                          const SizedBox(height: 14),
                          LayoutBuilder(
                            builder: (context, constraints) {
                              final statusValue = status;
                              final cards = [
                                WeatherCard(
                                  rain: statusValue?.rain ?? false,
                                  temperature: statusValue?.temperature ?? 0,
                                  humidity: statusValue?.humidity ?? 0,
                                ),
                                PumpIndicator(isActive: statusValue?.pump ?? false),
                              ];
                              if (constraints.maxWidth >= 700) {
                                return Row(
                                  children: [
                                    Expanded(child: SizedBox(height: 168, child: cards[0])),
                                    const SizedBox(width: 14),
                                    Expanded(child: SizedBox(height: 168, child: cards[1])),
                                  ],
                                );
                              }
                              return Column(
                                children: [
                                  SizedBox(height: 168, child: cards[0]),
                                  const SizedBox(height: 14),
                                  SizedBox(height: 168, child: cards[1]),
                                ],
                              );
                            },
                          ),
                          const SizedBox(height: 20),
                        ]),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  double _displayTemperature(double celsius, TemperatureUnit unit) {
    return unit == TemperatureUnit.celsius ? celsius : (celsius * 9 / 5) + 32;
  }
}

class _SideNav extends StatelessWidget {
  const _SideNav({
    required this.selectedIndex,
    required this.onDashboard,
    required this.onDetails,
    required this.onSettings,
  });

  final int selectedIndex;
  final VoidCallback onDashboard;
  final VoidCallback onDetails;
  final VoidCallback onSettings;

  @override
  Widget build(BuildContext context) {
    return NavigationRail(
      extended: MediaQuery.sizeOf(context).width > 920,
      selectedIndex: selectedIndex,
      onDestinationSelected: (index) {
        if (index == 0) onDashboard();
        if (index == 1) onDetails();
        if (index == 2) onSettings();
      },
      leading: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14),
        child: Column(
          children: [
            const Icon(Icons.eco, color: AppTheme.success),
            const SizedBox(height: 6),
            if (MediaQuery.sizeOf(context).width > 920)
              Text('FarmEdge', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w900)),
          ],
        ),
      ),
      destinations: const [
        NavigationRailDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: Text('Overview')),
        NavigationRailDestination(icon: Icon(Icons.analytics_outlined), selectedIcon: Icon(Icons.analytics), label: Text('Details')),
        NavigationRailDestination(icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings), label: Text('Settings')),
      ],
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({required this.isOnline});

  final bool isOnline;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Container(
            height: 42,
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: Theme.of(context).colorScheme.outline.withValues(alpha: .14)),
            ),
            child: Row(
              children: [
                Icon(Icons.search, size: 18, color: Theme.of(context).colorScheme.outline),
                const SizedBox(width: 8),
                Text('Search farm data...', style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
        ),
        const SizedBox(width: 12),
        ConnectionStatus(isOnline: isOnline, label: isOnline ? 'ESP32 Live' : 'Device Offline'),
      ],
    );
  }
}

class _HeroOverview extends StatelessWidget {
  const _HeroOverview({
    required this.status,
    required this.now,
    required this.isOnline,
    required this.temperature,
    required this.tempUnit,
  });

  final FarmStatus? status;
  final DateTime now;
  final bool isOnline;
  final double temperature;
  final String tempUnit;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: Container(
        height: 220,
        decoration: const BoxDecoration(
          image: DecorationImage(image: AssetImage('assets/images/farm_hero.png'), fit: BoxFit.cover),
        ),
        child: Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [Colors.black.withValues(alpha: .68), Colors.black.withValues(alpha: .12)],
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'Farm Overview',
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                  ),
                  ConnectionStatus(isOnline: isOnline, label: isOnline ? 'Live Sync Active' : 'Offline Cache'),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                '${temperature.round()}$tempUnit, ${status?.rain == true ? 'Rain' : 'Clear'}  •  ${_time(now)} Local Time',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
              ),
              const Spacer(),
              Row(
                children: [
                  _HeroStat(label: 'SOIL MOISTURE', value: '${status?.soilMoisture.round() ?? 0}%'),
                  const SizedBox(width: 10),
                  _HeroStat(label: 'PUMP', value: status?.pump == true ? 'ON' : 'OFF'),
                  const SizedBox(width: 10),
                  _HeroStat(label: 'CROP STRESS', value: status?.stressLabel ?? 'UNKNOWN'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _time(DateTime time) {
    final hour = time.hour.toString().padLeft(2, '0');
    final minute = time.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }
}

class _HeroStat extends StatelessWidget {
  const _HeroStat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: .32),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.white.withValues(alpha: .18)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w700)),
            const SizedBox(height: 5),
            Text(value, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900)),
          ],
        ),
      ),
    );
  }
}

class _TelemetryGrid extends StatelessWidget {
  const _TelemetryGrid({
    required this.status,
    required this.temperature,
    required this.tempUnit,
    required this.onViewAll,
  });

  final FarmStatus? status;
  final double temperature;
  final String tempUnit;
  final VoidCallback onViewAll;

  @override
  Widget build(BuildContext context) {
    final cards = [
      SensorCard(
        title: 'Soil Moisture',
        value: status?.soilMoisture ?? 0,
        unit: '%',
        icon: Icons.grass,
        color: AppTheme.success,
        status: (status?.soilMoisture ?? 0) < 40 ? 'LOW' : 'STABLE',
      ),
      SensorCard(
        title: 'Temperature',
        value: temperature,
        unit: tempUnit,
        icon: Icons.thermostat,
        color: AppTheme.warning,
        status: (status?.temperature ?? 0) > 38 ? 'HIGH' : 'STABLE',
      ),
      SensorCard(
        title: 'Humidity',
        value: status?.humidity ?? 0,
        unit: '%',
        icon: Icons.air,
        color: Colors.lightBlue,
      ),
      SensorCard(
        title: 'Battery',
        value: status?.battery ?? 0,
        unit: '%',
        icon: Icons.battery_5_bar,
        color: AppTheme.success,
      ),
      SensorCard(
        title: 'Sunlight',
        value: 0,
        unit: '',
        valueLabel: 'N/A',
        icon: Icons.wb_sunny_outlined,
        color: Theme.of(context).colorScheme.outline,
        status: 'NO API FIELD',
      ),
      SensorCard(
        title: 'Rain',
        value: 0,
        unit: '',
        valueLabel: status?.rain == true ? 'YES' : 'NO',
        icon: Icons.water_drop_outlined,
        color: status?.rain == true ? Colors.lightBlue : AppTheme.success,
        status: status?.rain == true ? 'DETECTED' : 'CLEAR',
      ),
      SensorCard(
        title: 'Pump Status',
        value: 0,
        unit: '',
        valueLabel: status?.pump == true ? 'ON' : 'OFF',
        icon: Icons.power_settings_new,
        color: status?.pump == true ? AppTheme.success : Theme.of(context).colorScheme.outline,
        status: status?.pump == true ? 'FLOWING' : 'IDLE',
      ),
      SensorCard(
        title: 'Crop Stress',
        value: 0,
        unit: '',
        valueLabel: status?.stressLabel ?? 'UNKNOWN',
        icon: Icons.health_and_safety_outlined,
        color: _stressColor(status?.cropStress),
        status: 'ESP32',
      ),
    ];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text('Telemetry Data', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900)),
                ),
                TextButton(onPressed: onViewAll, child: const Text('View All Sensors')),
              ],
            ),
            const SizedBox(height: 12),
            LayoutBuilder(
              builder: (context, constraints) {
                final width = constraints.maxWidth;
                final columns = width >= 980 ? 4 : width >= 620 ? 2 : 1;
                return GridView.count(
                  crossAxisCount: columns,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  childAspectRatio: columns == 1 ? 3.3 : 1.75,
                  crossAxisSpacing: 10,
                  mainAxisSpacing: 10,
                  children: cards,
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  static Color _stressColor(CropStress? stress) {
    return switch (stress) {
      CropStress.low => AppTheme.success,
      CropStress.medium => AppTheme.warning,
      CropStress.high => AppTheme.danger,
      _ => Colors.grey,
    };
  }
}

class _CropStressPanel extends StatelessWidget {
  const _CropStressPanel({required this.status});

  final FarmStatus? status;

  @override
  Widget build(BuildContext context) {
    final score = status?.stressScore ?? 0;
    final color = score >= 70 ? AppTheme.danger : score >= 40 ? AppTheme.warning : AppTheme.success;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Crop Stress Index', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900)),
            Text('ESP32 Analysis', style: Theme.of(context).textTheme.labelMedium),
            const SizedBox(height: 18),
            Center(
              child: SizedBox(
                width: 122,
                height: 122,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    CircularProgressIndicator(
                      value: score / 100,
                      strokeWidth: 10,
                      color: color,
                      backgroundColor: color.withValues(alpha: .12),
                    ),
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('$score', style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: color, fontWeight: FontWeight.w900)),
                        const Text('/ 100'),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 18),
            const _Finding(icon: Icons.close, color: AppTheme.danger, text: 'Moisture below 40% when reported low'),
            const _Finding(icon: Icons.warning_amber, color: AppTheme.warning, text: 'Temperature watched from ESP32 status'),
            const _Finding(icon: Icons.check_circle_outline, color: AppTheme.success, text: 'Humidity and battery retained offline'),
          ],
        ),
      ),
    );
  }
}

class _Finding extends StatelessWidget {
  const _Finding({required this.icon, required this.color, required this.text});

  final IconData icon;
  final Color color;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 9),
      child: Row(
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 8),
          Expanded(child: Text(text, style: Theme.of(context).textTheme.bodySmall)),
        ],
      ),
    );
  }
}

class _TrendsPanel extends StatelessWidget {
  const _TrendsPanel({required this.history});

  final List<FarmSample> history;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Environmental Trends', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900)),
            const SizedBox(height: 16),
            SizedBox(
              height: 230,
              child: FarmLineChart(
                values: history.map((sample) => sample.moisture).toList(),
                color: AppTheme.success,
                minY: 0,
                maxY: 100,
              ),
            ),
            const SizedBox(height: 10),
            const Wrap(
              spacing: 14,
              children: [
                _Legend(color: AppTheme.success, label: 'Moisture'),
                _Legend(color: AppTheme.warning, label: 'Temperature'),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Legend extends StatelessWidget {
  const _Legend({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.circle, color: color, size: 9),
        const SizedBox(width: 5),
        Text(label, style: Theme.of(context).textTheme.labelSmall),
      ],
    );
  }
}
