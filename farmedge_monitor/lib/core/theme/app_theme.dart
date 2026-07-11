import 'package:flutter/material.dart';

class AppTheme {
  static const _seed = Color(0xFF0F3F2A);
  static const success = Color(0xFF10B981); // Emerald Green
  static const warning = Color(0xFFF59E0B); // Amber
  static const danger = Color(0xFFEF4444);  // Red
  static const panel = Color(0xFF0D2419);   // Deep Forest Card Color
  static const panelAlt = Color(0xFF133224);

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
      scaffoldBackgroundColor: const Color(0xFF05110B), // Rich Deep Green-Black
      fontFamily: 'Roboto',
      cardTheme: CardThemeData(
        color: panel,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16), // Premium rounded corners
          side: BorderSide(color: Colors.white.withOpacity(0.06), width: 1), // Polished border highlight
        ),
      ),
      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: const Color(0xFF040D08),
        selectedIconTheme: const IconThemeData(color: success),
        selectedLabelTextStyle: const TextStyle(color: success),
        unselectedIconTheme: IconThemeData(color: Colors.white.withOpacity(.55)),
        unselectedLabelTextStyle: TextStyle(color: Colors.white.withOpacity(.65)),
      ),
    );
  }

  static ThemeData get light {
    final scheme = ColorScheme.fromSeed(seedColor: _seed);
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: const Color(0xFFF1F5F0), //Sage/Light Grey background
      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 2,
        shadowColor: Colors.black.withOpacity(0.04),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: Colors.black.withOpacity(0.03), width: 1),
        ),
      ),
    );
  }
}
