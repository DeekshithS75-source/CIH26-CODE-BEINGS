import 'package:flutter/material.dart';

class AppTheme {
  static const _seed = Color(0xFF2F5D3A);
  static const success = Color(0xFF2FC36B);
  static const warning = Color(0xFFF0A43A);
  static const danger = Color(0xFFE35C5C);
  static const panel = Color(0xFF111814);
  static const panelAlt = Color(0xFF17211B);

  static ThemeData get dark {
    final scheme = ColorScheme.fromSeed(
      seedColor: _seed,
      brightness: Brightness.dark,
      primary: success,
      secondary: warning,
      surface: panel,
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: const Color(0xFF07100B),
      fontFamily: 'Roboto',
      cardTheme: CardThemeData(
        color: panel,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: const Color(0xFF0D150F),
        selectedIconTheme: const IconThemeData(color: success),
        selectedLabelTextStyle: const TextStyle(color: success),
        unselectedIconTheme: IconThemeData(color: Colors.white.withValues(alpha: .55)),
        unselectedLabelTextStyle: TextStyle(color: Colors.white.withValues(alpha: .65)),
      ),
    );
  }

  static ThemeData get light {
    final scheme = ColorScheme.fromSeed(seedColor: _seed);
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: const Color(0xFFF4F7F1),
      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }
}
