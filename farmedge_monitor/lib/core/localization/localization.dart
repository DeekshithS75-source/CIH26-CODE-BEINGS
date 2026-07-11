import '../../providers/farm_provider.dart';

class Localization {
  static const Map<String, Map<AppLanguage, String>> _keys = {
    // Nav Rail
    'overview': {
      AppLanguage.en: 'Overview',
      AppLanguage.ml: 'അവലോകനം',
      AppLanguage.kn: 'ಅವಲೋಕನ'
    },
    'details': {
      AppLanguage.en: 'Details',
      AppLanguage.ml: 'വിശദാംശങ്ങൾ',
      AppLanguage.kn: 'ವಿವರಗಳು'
    },
    'advisor': {
      AppLanguage.en: 'Advisor',
      AppLanguage.ml: 'ഉപദേശകൻ',
      AppLanguage.kn: 'ಸಲಹೆಗಾರ'
    },
    'settings': {
      AppLanguage.en: 'Settings',
      AppLanguage.ml: 'ക്രമീകരണങ്ങൾ',
      AppLanguage.kn: 'ಸಂಯೋಜನೆಗಳು'
    },
    // Titles
    'farm_overview': {
      AppLanguage.en: 'Farm Overview',
      AppLanguage.ml: 'ഫാം അവലോകനം',
      AppLanguage.kn: 'ಫಾರ್ಮ್ ಅವಲೋಕನ'
    },
    'telemetry_data': {
      AppLanguage.en: 'Telemetry Data',
      AppLanguage.ml: 'ടെലിമെട്രി ഡാറ്റ',
      AppLanguage.kn: 'ಟೆಲಿಮೆಟ್ರಿ ಡೇಟಾ'
    },
    'view_all_sensors': {
      AppLanguage.en: 'View All Sensors',
      AppLanguage.ml: 'എല്ലാ സെൻസറുകളും കാണുക',
      AppLanguage.kn: 'ಎಲ್ಲಾ ಸೆನ್ಸಾರ್‌ಗಳನ್ನು ನೋಡಿ'
    },
    // Cards
    'soil_moisture': {
      AppLanguage.en: 'Soil Moisture',
      AppLanguage.ml: 'മണ്ണിലെ ഈർപ്പം',
      AppLanguage.kn: 'ಮಣ್ಣಿನ ತೇವಾಂಶ'
    },
    'temperature': {
      AppLanguage.en: 'Temperature',
      AppLanguage.ml: 'താപനില',
      AppLanguage.kn: 'ತಾಪಮಾನ'
    },
    'humidity': {
      AppLanguage.en: 'Humidity',
      AppLanguage.ml: 'അന്തരീക്ഷ ഈർപ്പം',
      AppLanguage.kn: 'ಆರ್ದ್ರತೆ'
    },
    'battery': {
      AppLanguage.en: 'Battery',
      AppLanguage.ml: 'ബാറ്ററി',
      AppLanguage.kn: 'ಬ್ಯಾಟರಿ'
    },
    'air_pressure': {
      AppLanguage.en: 'Air Pressure',
      AppLanguage.ml: 'വായു മർദ്ദം',
      AppLanguage.kn: 'ವಾಯು ಒತ್ತಡ'
    },
    'rain': {
      AppLanguage.en: 'Rain',
      AppLanguage.ml: 'മഴ',
      AppLanguage.kn: 'ಮಳೆ'
    },
    'pump_status': {
      AppLanguage.en: 'Pump Status',
      AppLanguage.ml: 'പമ്പ് നില',
      AppLanguage.kn: 'ಪಂಪ್ ಸ್ಥಿತಿ'
    },
    'weather_api': {
      AppLanguage.en: 'Weather API',
      AppLanguage.ml: 'കാലാവസ്ഥ API',
      AppLanguage.kn: 'ಹವಾಮಾನ API'
    },
    'edge_ml_forecast': {
      AppLanguage.en: 'Edge ML Forecast',
      AppLanguage.ml: 'എഡ്ജ് ML പ്രവചനം',
      AppLanguage.kn: 'ಎಡ್ಜ್ ML ಮುನ್ಸೂಚನೆ'
    },
    'crop_stress_index': {
      AppLanguage.en: 'Crop Stress Index',
      AppLanguage.ml: 'വിള സമ്മർദ്ദ സൂചിക',
      AppLanguage.kn: 'ಬೆಳೆ ಒತ್ತಡದ ಸೂಚ್ಯಂಕ'
    },
    'environmental_trends': {
      AppLanguage.en: 'Environmental Trends',
      AppLanguage.ml: 'പരിസ്ഥിതി പ്രവണതകൾ',
      AppLanguage.kn: 'ಪರಿಸರ ಪ್ರವೃತ್ತಿಗಳು'
    },
    'live_sync_active': {
      AppLanguage.en: 'Live Sync Active',
      AppLanguage.ml: 'തത്സമയ സമന്വയം സജീവമാണ്',
      AppLanguage.kn: 'ಲೈವ್ ಸಿಂಕ್ സಕ್ರಿಯವಾಗಿದೆ'
    },
    'offline_cache': {
      AppLanguage.en: 'Offline Cache',
      AppLanguage.ml: 'ഓഫ്‌ലൈൻ കാഷെ',
      AppLanguage.kn: 'ಆಫ್‌ಲೈನ್ ക്യാಶ್'
    },
    'search_farm_data': {
      AppLanguage.en: 'Search farm data...',
      AppLanguage.ml: 'ഫാം വിവരങ്ങൾ തിരയുക...',
      AppLanguage.kn: 'ಫಾರ್ಮ್ ಡೇಟಾ ಹುಡುಕಿ...'
    },
    // Dialog / Actions
    'ai_tomorrow': {
      AppLanguage.en: 'AI Tomorrow',
      AppLanguage.ml: 'നാളെത്തെ പ്രവചനം',
      AppLanguage.kn: 'ನಾಳೆಯ ಮುನ್ಸೂಚನೆ'
    },
    'ask_ai_advisor': {
      AppLanguage.en: 'Ask AI Advisor',
      AppLanguage.ml: 'AI ഉപദേശകനോട് ചോദിക്കുക',
      AppLanguage.kn: 'AI ಸಲಹೆಗಾರರನ್ನು ಕೇಳಿ'
    },
    // Crop Status / Advisories
    'low': {
      AppLanguage.en: 'LOW',
      AppLanguage.ml: 'കുറഞ്ഞത്',
      AppLanguage.kn: 'ಕಡಿಮೆ'
    },
    'medium': {
      AppLanguage.en: 'MEDIUM',
      AppLanguage.ml: 'മിതമായി',
      AppLanguage.kn: 'ಮಧ್ಯಮ'
    },
    'high': {
      AppLanguage.en: 'HIGH',
      AppLanguage.ml: 'കൂടുതൽ',
      AppLanguage.kn: 'ಹೆಚ್ಚು'
    },
    'stable': {
      AppLanguage.en: 'STABLE',
      AppLanguage.ml: 'സ്ഥിരതയുള്ളത്',
      AppLanguage.kn: 'ಸ್ಥಿರವಾಗಿದೆ'
    },
    'flowing': {
      AppLanguage.en: 'FLOWING',
      AppLanguage.ml: 'പ്രവഹിക്കുന്നു',
      AppLanguage.kn: 'ಹರಿಯುತ್ತಿದೆ'
    },
    'idle': {
      AppLanguage.en: 'IDLE',
      AppLanguage.ml: 'നിഷ്‌ക്രിയം',
      AppLanguage.kn: 'ಬಂದ್ ಆಗಿದೆ'
    },
    'clear': {
      AppLanguage.en: 'Clear',
      AppLanguage.ml: 'തെളിഞ്ഞത്',
      AppLanguage.kn: 'ಸ್ಪಷ್ಟವಾಗಿದೆ'
    },
    'rain_detected': {
      AppLanguage.en: 'Rain',
      AppLanguage.ml: 'മഴ',
      AppLanguage.kn: 'ಮಳೆ ಬರುತಿದೆ'
    },
    // Metrics
    'measured_moisture': {
      AppLanguage.en: 'Measured Moisture',
      AppLanguage.ml: 'അളന്ന ഈർപ്പം',
      AppLanguage.kn: 'ಅಳೆದ ತೇವಾಂಶ'
    },
    'target_baseline': {
      AppLanguage.en: 'Target Baseline',
      AppLanguage.ml: 'ലക്ഷ്യ പരിധി',
      AppLanguage.kn: 'ಗುರಿ ಬೇಸ್‌ಲೈನ್'
    },
    'stress_category': {
      AppLanguage.en: 'Stress Category',
      AppLanguage.ml: 'സമ്മർദ്ദ വിഭാഗം',
      AppLanguage.kn: 'ಒತ್ತಡದ ವರ್ಗ'
    },
    'ai_confidence': {
      AppLanguage.en: 'AI Model Confidence',
      AppLanguage.ml: 'AI മാതൃക ഉറപ്പ്',
      AppLanguage.kn: 'AI ಮಾದರಿ ನಿಖರತೆ'
    },
    'air_temperature': {
      AppLanguage.en: 'Air Temperature',
      AppLanguage.ml: 'വായു താപനില',
      AppLanguage.kn: 'ಗಾಳಿಯ ತಾಪಮಾನ'
    },
    'air_humidity': {
      AppLanguage.en: 'Air Humidity',
      AppLanguage.ml: 'വായു ഈർപ്പം',
      AppLanguage.kn: 'ಗಾಳಿಯ ಆರ್ದ್ರತೆ'
    },
    'pump_switch': {
      AppLanguage.en: 'Pump Switch State',
      AppLanguage.ml: 'പമ്പ് സ്വിച്ച് നില',
      AppLanguage.kn: 'ಪಂಪ್ ಸ್ವಿಚ್ ಸ್ಥಿತಿ'
    },
    'trigger_mode': {
      AppLanguage.en: 'Smart Trigger Mode',
      AppLanguage.ml: 'സ്മാർട്ട് ട്രിഗർ മോഡ്',
      AppLanguage.kn: 'ಸ್ಮಾರ್ಟ್ ಟ್ರಿಗರ್ ಮೋಡ್'
    },
  };

  static String translate(String key, AppLanguage lang) {
    return _keys[key]?[lang] ?? key;
  }
}
