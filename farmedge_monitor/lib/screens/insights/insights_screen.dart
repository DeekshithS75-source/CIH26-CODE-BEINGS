import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_theme.dart';
import '../../core/localization/localization.dart';
import '../../models/farm_status.dart';
import '../../providers/farm_provider.dart';
import '../../widgets/connection_status.dart';
import '../../widgets/voice_assistant_dialog.dart';

class InsightsScreen extends ConsumerWidget {
  const InsightsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final farm = ref.watch(farmProvider);
    final settings = ref.watch(settingsProvider);
    final status = farm.status;
    final lang = settings.language;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          lang == AppLanguage.ml 
              ? 'AI കർഷക സഹായി' 
              : (lang == AppLanguage.kn ? 'AI ಕೃಷಿ ಸಲಹೆಗಾರ' : 'AI Crop Advisor'),
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/dashboard'),
        ),
        actions: [
          // Quick Language dropdown directly in appbar
          Container(
            margin: const EdgeInsets.symmetric(vertical: 10),
            padding: const EdgeInsets.symmetric(horizontal: 10),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.06),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white.withOpacity(0.12)),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<AppLanguage>(
                value: lang,
                icon: const Icon(Icons.translate, size: 14, color: Colors.white70),
                dropdownColor: const Color(0xFF0D2419),
                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                onChanged: (newLang) {
                  if (newLang != null) {
                    ref.read(settingsProvider.notifier).update(
                          settings.copyWith(language: newLang),
                        );
                  }
                },
                items: const [
                  DropdownMenuItem(value: AppLanguage.en, child: Text('EN ')),
                  DropdownMenuItem(value: AppLanguage.ml, child: Text('മല ')),
                  DropdownMenuItem(value: AppLanguage.kn, child: Text('ಕನ್ನ ')),
                ],
              ),
            ),
          ),
          const SizedBox(width: 10),
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
        child: status == null
            ? const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(),
                    SizedBox(height: 16),
                    Text('Waiting for ESP32 telemetry data...', style: TextStyle(color: Colors.white60)),
                  ],
                ),
              )
            : ListView(
                padding: const EdgeInsets.all(18),
                children: [
                  // 1. High Impact Executive Summary Grid (Three Big Cards)
                  _buildExecutiveSummaryGrid(context, status, lang),
                  const SizedBox(height: 20),

                  // 2. Soil Advisory Card
                  _buildSoilAdvisoryCard(context, status, lang),
                  const SizedBox(height: 16),

                  // 3. Crop Stress Card
                  _buildCropStressAdvisoryCard(context, status, lang),
                  const SizedBox(height: 16),

                  // 4. Weather Advisory Card
                  _buildWeatherAdvisoryCard(context, status, lang),
                  const SizedBox(height: 16),

                  // 5. Pump Advisory Card
                  _buildPumpAdvisoryCard(context, status, lang),
                ],
              ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openVoiceAssistant(context),
        icon: const Icon(Icons.mic),
        label: Text(Localization.translate('ask_ai_advisor', lang)),
        backgroundColor: AppTheme.success,
        foregroundColor: Colors.white,
      ),
    );
  }

  void _openVoiceAssistant(BuildContext context) {
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (_) => const VoiceAssistantDialog(),
    );
  }

  // Row of 3 Large status cards for quick scanning
  Widget _buildExecutiveSummaryGrid(BuildContext context, FarmStatus status, AppLanguage lang) {
    // Soil Card Values
    final soilVal = '${status.soilMoisture.round()}%';
    final soilStatus = status.soilMoisture < 15.0 
        ? (lang == AppLanguage.ml ? 'വരണ്ടത്' : (lang == AppLanguage.kn ? 'ಒಣಗಿದೆ' : 'DRY'))
        : (lang == AppLanguage.ml ? 'തൃപ്തികരം' : (lang == AppLanguage.kn ? 'ಉತ್ತಮ' : 'OK'));
    final soilColor = status.soilMoisture < 15.0 ? AppTheme.danger : AppTheme.success;

    // Crop Card Values
    final cropVal = status.cropStress == CropStress.low 
        ? (lang == AppLanguage.ml ? 'സുരക്ഷിതം' : (lang == AppLanguage.kn ? 'ಸುರಕ್ಷಿತ' : 'HEALTHY'))
        : (lang == AppLanguage.ml ? 'സമ്മർദ്ദം' : (lang == AppLanguage.kn ? 'ಒತ್ತಡ' : 'STRESS'));
    final cropColor = status.cropStress == CropStress.low ? AppTheme.success : AppTheme.danger;

    // Weather Card Values
    final weatherVal = status.apiRain 
        ? (lang == AppLanguage.ml ? 'മഴ' : (lang == AppLanguage.kn ? 'ಮಳೆ' : 'RAIN'))
        : (lang == AppLanguage.ml ? 'വെയിൽ' : (lang == AppLanguage.kn ? 'ಬಿಸಿಲು' : 'SUNNY'));
    final weatherColor = status.apiRain ? Colors.blue : AppTheme.warning;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          lang == AppLanguage.ml ? 'തത്സമയ വിശകലനം' : (lang == AppLanguage.kn ? 'ತ್ವರಿತ ವಿಶ್ಲೇಷಣೆ' : 'Live Analysis'),
          style: const TextStyle(color: Colors.white30, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.2),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(child: _buildSummaryMiniCard(
              lang == AppLanguage.ml ? 'മണ്ണ്' : (lang == AppLanguage.kn ? 'ಮಣ್ಣು' : 'SOIL'),
              soilVal,
              soilStatus,
              soilColor
            )),
            const SizedBox(width: 10),
            Expanded(child: _buildSummaryMiniCard(
              lang == AppLanguage.ml ? 'വിള' : (lang == AppLanguage.kn ? 'ಬೆಳೆ' : 'CROP'),
              cropVal,
              status.stressLabel,
              cropColor
            )),
            const SizedBox(width: 10),
            Expanded(child: _buildSummaryMiniCard(
              lang == AppLanguage.ml ? 'കാലാവസ്ഥ' : (lang == AppLanguage.kn ? 'ಹವಾಮಾನ' : 'WEATHER'),
              weatherVal,
              status.weatherForecast,
              weatherColor
            )),
          ],
        ),
      ],
    );
  }

  Widget _buildSummaryMiniCard(String title, String mainValue, String badgeText, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF0D2419),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.24), width: 1.5),
        gradient: LinearGradient(
          colors: [color.withOpacity(0.06), Colors.transparent],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        )
      ),
      child: Column(
        children: [
          Text(title, style: const TextStyle(color: Colors.white30, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.0)),
          const SizedBox(height: 8),
          Text(
            mainValue,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: -0.5),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              badgeText,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  // Soil Advisory Card
  Widget _buildSoilAdvisoryCard(BuildContext context, FarmStatus status, AppLanguage lang) {
    final moisture = status.soilMoisture;
    String statusText = "OPTIMAL";
    Color color = AppTheme.success;

    if (moisture < 15.0) {
      statusText = lang == AppLanguage.ml ? 'അതീവ വരൾച്ച' : (lang == AppLanguage.kn ? 'ಅತ್ಯಂತ ಒಣಗಿದೆ' : 'CRITICALLY DRY');
      color = AppTheme.danger;
    } else if (moisture >= 15.0 && moisture < 40.0) {
      statusText = lang == AppLanguage.ml ? 'സാധാരണം' : (lang == AppLanguage.kn ? 'ಸಾಧಾರಣ' : 'STABLE / MODERATE');
      color = AppTheme.warning;
    } else if (moisture > 45.0) {
      statusText = lang == AppLanguage.ml ? 'കൂടുതൽ നനഞ്ഞത്' : (lang == AppLanguage.kn ? 'ಅತಿಯಾದ ತೇವಾಂಶ' : 'WET / OVERSATURATED');
      color = Colors.lightBlue;
    }

    final advisory = _getSoilAdvisoryText(moisture, lang);

    return _buildAdvisorSection(
      context: context,
      title: Localization.translate('soil_moisture', lang),
      icon: Icons.opacity,
      color: color,
      statusLabel: statusText,
      explanation: advisory,
      metrics: [
        _MetricItem(label: Localization.translate('measured_moisture', lang), value: '${moisture.round()}%'),
        _MetricItem(label: Localization.translate('target_baseline', lang), value: '40%'),
      ],
    );
  }

  String _getSoilAdvisoryText(double moisture, AppLanguage lang) {
    if (moisture < 15.0) {
      return switch(lang) {
        AppLanguage.ml => "മണ്ണ് വളരെ വരണ്ടതാണ് (${moisture.round()}%). ചെടിയുടെ വേരുകൾക്ക് ആവശ്യത്തിന് വെള്ളമില്ല. തുള്ളിനന സംവിധാനം ഉടനടി പ്രവർത്തിപ്പിക്കേണ്ടതുണ്ട്.",
        AppLanguage.kn => "ಮಣ್ಣು ತುಂಬಾ ಒಣಗಿದೆ (${moisture.round()}%). ಬೇರುಗಳಿಗೆ ತಕ್ಷಣ ನೀರಿನ ಅವಶ್ಯಕತೆ ಇದೆ. ಡ್ರಿಪ್ ಪಂಪ್ ಅನ್ನು ತಕ್ಷಣ ಚಾಲನೆಗೊಳಿಸಿ.",
        _ => "Soil is critically dry (${moisture.round()}%). Drip lines must be turned ON immediately to prevent root damage."
      };
    } else if (moisture >= 15.0 && moisture < 40.0) {
      return switch(lang) {
        AppLanguage.ml => "മണ്ണിലെ ഈർപ്പം സാധാരണ നിലയിലാണ് (${moisture.round()}%). അടുത്ത ഏതാനും മണിക്കൂറുകൾക്കുള്ളിൽ നനയ്ക്കാൻ ക്രമീകരിക്കുക.",
        AppLanguage.kn => "ಮಣ್ಣಿನ ತೇವಾಂಶ ಸಾಧಾರಣವಾಗಿದೆ (${moisture.round()}%). ಮುಂದಿನ ಕೆಲವೇ ಗಂಟೆಗಳಲ್ಲಿ ನೀರು ಹರಿಸಲು ನಿಗದಿಪಡಿಸಿ.",
        _ => "Soil moisture is stable but moderate (${moisture.round()}%). Prepare to schedule irrigation event in the next few hours."
      };
    } else {
      return switch(lang) {
        AppLanguage.ml => "മണ്ണിൽ ആവശ്യത്തിലധികം ഈർപ്പമുണ്ട് (${moisture.round()}%). വെള്ളം കെട്ടിക്കിടക്കുന്നത് തടയാൻ പമ്പ് പ്രവർത്തിപ്പിക്കരുത്.",
        AppLanguage.kn => "ಮಣ್ಣಿನಲ್ಲಿ ಅತಿಯಾದ ತೇವಾಂಶವಿದೆ (${moisture.round()}%). ಬೇರುಗಳು ಕೊಳೆಯದಂತೆ ತಡೆಯಲು ಪಂಪ್ ಆಫ್ ಮಾಡಿ.",
        _ => "Soil is highly saturated (${moisture.round()}%). Keep the irrigation pump OFF to conserve water and prevent root decay."
      };
    }
  }

  // Crop Health Card
  Widget _buildCropStressAdvisoryCard(BuildContext context, FarmStatus status, AppLanguage lang) {
    String healthText = lang == AppLanguage.ml ? 'ആരോഗ്യമുള്ളത്' : (lang == AppLanguage.kn ? 'ಆರೋಗ್ಯಕರ' : 'HEALTHY / STABLE');
    Color color = AppTheme.success;

    if (status.cropStress == CropStress.medium) {
      healthText = lang == AppLanguage.ml ? 'മിതമായ സമ്മർദ്ദം' : (lang == AppLanguage.kn ? 'ಸಾಧಾರಣ ಒತ್ತಡ' : 'MODERATE STRESS');
      color = AppTheme.warning;
    } else if (status.cropStress == CropStress.high) {
      healthText = lang == AppLanguage.ml ? 'അതീവ സമ്മർദ്ദം' : (lang == AppLanguage.kn ? 'ಅತ್ಯಂತ ಒತ್ತಡ' : 'CRITICAL HEAT/WATER STRESS');
      color = AppTheme.danger;
    }

    final advisory = _getCropAdvisoryText(status.cropStress, lang);

    return _buildAdvisorSection(
      context: context,
      title: Localization.translate('crop_stress_index', lang),
      icon: Icons.psychology,
      color: color,
      statusLabel: healthText,
      explanation: advisory,
      metrics: [
        _MetricItem(label: Localization.translate('stress_category', lang), value: Localization.translate(status.stressLabel.toLowerCase(), lang)),
        _MetricItem(label: Localization.translate('ai_confidence', lang), value: '94%'),
      ],
    );
  }

  String _getCropAdvisoryText(CropStress stress, AppLanguage lang) {
    if (stress == CropStress.low) {
      return switch(lang) {
        AppLanguage.ml => "വിളകൾ പൂർണ്ണ ആരോഗ്യത്തോടെയിരിക്കുന്നു. തത്സമയ AI പ്രവചനങ്ങൾ കുറഞ്ഞ രോഗസാധ്യതയാണ് കാണിക്കുന്നത്. സാധാരണ പരിപാലനം തുടരുക.",
        AppLanguage.kn => "ಬೆಳೆಗಳು ಅತ್ಯಂತ ಆರೋಗ್ಯಕರವಾಗಿವೆ. ರೋಗಬಾಧೆ ಬರುವ ಸಾಧ್ಯತೆ ಕಡಿಮೆ ಇದೆ ಎಂದು AI ಮಾದರಿ ತಿಳಿಸುತ್ತದೆ. ಸದ್ಯದ ಪಾಲನೆ ಮುಂದುವರಿಸಿ.",
        _ => "Crop health index is optimal. Neural network predicts low environmental stress. Continue standard crop maintenance."
      };
    } else if (stress == CropStress.medium) {
      return switch(lang) {
        AppLanguage.ml => "ചെറിയ തോതിൽ ഇലകളിൽ നിർജ്ജലീകരണം കാണിക്കുന്നു. മണ്ണിലെ ഈർപ്പം കുറയുന്നതാണ് കാരണം. ഉടൻ നനയ്ക്കുക.",
        AppLanguage.kn => "ಎಲೆಗಳಲ್ಲಿ ನೀರಿನ ಕೊರತೆ ಕಾಣಿಸುತ್ತಿದೆ. ತೇವಾಂಶ ಕಡಿಮೆಯಿರುವುದೇ ಇದಕ್ಕೆ ಕಾರಣ. ಆದಷ್ಟು ಬೇಗ ನೀರು ಹರಿಸಿ.",
        _ => "Minor dehydration detected in leaves due to drop in moisture. Plan watering to restore leaf turgor pressure."
      };
    } else {
      return switch(lang) {
        AppLanguage.ml => "അതീവ വിള സമ്മർദ്ദം! ഉയർന്ന ഊഷ്മാവും കുറഞ്ഞ ഈർപ്പവും വിളകളെ ദോഷമായി ബാധിക്കുന്നു. ഉടൻ പമ്പ് ഓൺ ചെയ്യുക.",
        AppLanguage.kn => "ಬೆಳೆಗಳಿಗೆ ತೀವ್ರ ಒತ್ತಡವಿದೆ! ಹೆಚ್ಚಿನ ತಾಪಮಾನದಿಂದ ತೊಂದರೆಯಾಗುತ್ತಿದೆ. ತಕ್ಷಣವೇ ನೀರು ಹರಿಸಿ ತಂಪುಗೊಳಿಸಿ.",
        _ => "Critical stress alert! High temperatures and dry soil are impacting leaf stomata. Trigger irrigation immediately."
      };
    }
  }

  // Weather Card
  Widget _buildWeatherAdvisoryCard(BuildContext context, FarmStatus status, AppLanguage lang) {
    final temp = status.apiTemperature;
    final rain = status.apiRain;

    String weatherSummary = "";
    Color color = AppTheme.success;
    String badge = "CLEAR";

    if (rain) {
      weatherSummary = switch(lang) {
        AppLanguage.ml => "കാലാവസ്ഥാ API മഴ രേഖപ്പെടുത്തിയിട്ടുണ്ട്. മണ്ണിലെ നനവ് ഒഴിവാക്കാൻ പമ്പ് ഓഫ് ചെയ്യുക, വളപ്രയോഗം മാറ്റിവെയ്ക്കുക.",
        AppLanguage.kn => "ಹವಾಮಾನ ವರದಿಯಲ್ಲಿ ಮಳೆ ದಾಖಲಾಗಿದೆ. ಮಣ್ಣಿನಲ್ಲಿ ಹೆಚ್ಚಿನ ನೀರಾವರಿ ತಡೆಯಲು ಪಂಪ್ ಆಫ್ ಮಾಡಿ, ಗೊಬ್ಬರ ಹಾಕುವುದನ್ನು ಮುಂದೂಡಿ.",
        _ => "OpenWeather API reports active rain. Suspend pump activities and fertilizer application to prevent nutrient runoff."
      };
      color = Colors.blue;
      badge = lang == AppLanguage.ml ? 'മഴയുണ്ട്' : (lang == AppLanguage.kn ? 'ಮಳೆ ಬರುತಿದೆ' : 'RAIN DETECTED');
    } else if (temp > 38.0) {
      weatherSummary = switch(lang) {
        AppLanguage.ml => "അതിശക്തമായ ചൂട് (${temp.round()}°C) രേഖപ്പെടുത്തുന്നു. ബാഷ്പീകരണം കൂടുമെന്നതിനാൽ മണ്ണിൽ നനവ് ഉറപ്പാക്കുക.",
        AppLanguage.kn => "ಹೆಚ್ಚಿನ ತಾಪಮಾನವಿದೆ (${temp.round()}°C). ಆವಿಯಾಗುವಿಕೆ ಹೆಚ್ಚಾಗುವುದರಿಂದ ಮಣ್ಣು ಒಣಗದಂತೆ ನೋಡಿಕೊಳ್ಳಿ.",
        _ => "Extreme temperature warning (${temp.round()}°C). EV transpiration rates are high; monitor soil moisture closely."
      };
      color = AppTheme.warning;
      badge = lang == AppLanguage.ml ? 'ഉയർന്ന ചൂട്' : (lang == AppLanguage.kn ? 'ಹೆಚ್ಚಿನ ತಾಪಮಾನ' : 'EXTREME HEAT');
    } else {
      weatherSummary = switch(lang) {
        AppLanguage.ml => "കാലാവസ്ഥ തെളിഞ്ഞതാണ്. കീടനാശിനി പ്രയോഗത്തിനും ഫാം ജോലികൾക്കും അനുകൂല സമയമാണ്.",
        AppLanguage.kn => "ಹವಾಮಾನ ಸ್ವಚ್ಛವಾಗಿದೆ. ಗೊಬ್ಬರ ಹಾಕಲು ಮತ್ತು ಇತರ ಕೆಲಸಗಳನ್ನು ಮಾಡಲು ಉತ್ತಮ ಸಮಯ.",
        _ => "Weather is clear. Favorable conditions for spray application and general agricultural field operations."
      };
      color = AppTheme.success;
      badge = lang == AppLanguage.ml ? 'തെളിഞ്ഞത്' : (lang == AppLanguage.kn ? 'ಸ್ವಚ್ಛ ಹವಾಮಾನ' : 'CLEAR');
    }

    return _buildAdvisorSection(
      context: context,
      title: Localization.translate('weather_api', lang),
      icon: Icons.cloud_outlined,
      color: color,
      statusLabel: badge,
      explanation: weatherSummary,
      metrics: [
        _MetricItem(label: Localization.translate('air_temperature', lang), value: '${temp.round()}°C'),
        _MetricItem(label: Localization.translate('air_humidity', lang), value: '${status.apiHumidity.round()}%'),
      ],
    );
  }

  // Pump Card
  Widget _buildPumpAdvisoryCard(BuildContext context, FarmStatus status, AppLanguage lang) {
    final pump = status.pump;
    String statusLabel = pump 
        ? (lang == AppLanguage.ml ? 'പ്രവർത്തിക്കുന്നു' : (lang == AppLanguage.kn ? 'ಚಾಲನೆಯಲ್ಲಿದೆ' : 'ACTIVE / WATERING'))
        : (lang == AppLanguage.ml ? 'കാത്തിരിപ്പിൽ' : (lang == AppLanguage.kn ? 'ಸ್ಥಗಿತಗೊಂಡಿದೆ' : 'STANDBY / IDLE'));
    
    String advisory = pump
        ? (lang == AppLanguage.ml 
            ? "പമ്പ് ഇപ്പോൾ പ്രവർത്തിക്കുന്നു. മണ്ണിലെ ഈർപ്പം 40% എന്ന ലക്ഷ്യത്തിലേക്ക് എത്തിക്കാൻ ജലസേചനം തുടരുന്നു."
            : (lang == AppLanguage.kn 
                ? "ಸ್ಪ್ರಿಂಕ್ಲರ್ ಪಂಪ್ ಈಗ ಚಾಲನೆಯಲ್ಲಿದೆ. ತೇವಾಂಶವನ್ನು 40% ಗುರಿಗೆ ತಲುಪಿಸಲು ನೀರು ಹರಿಯುತ್ತಿದೆ."
                : "The water pump is ON. Water is flowing to restore soil moisture to the 40% target baseline."))
        : (lang == AppLanguage.ml 
            ? "പമ്പ് ഓഫ് ആണ്. മണ്ണിൽ ആവശ്യത്തിന് ഈർപ്പമുള്ളതിനാൽ ജലസേചനം ആവശ്യമില്ല."
            : (lang == AppLanguage.kn 
                ? "ಪಂಪ್ ಬಂದ್ ಆಗಿದೆ. ಮಣ್ಣಿನಲ್ಲಿ ಸಾಕಷ್ಟು ತೇವಾಂಶ ಇರುವುದರಿಂದ ನೀರು ಹರಿಸುವ ಅವಶ್ಯಕತೆ ಇಲ್ಲ."
                : "The water pump is OFF. Soil moisture is sufficient. Drip line irrigation system is idle."));

    Color color = pump ? AppTheme.success : Theme.of(context).colorScheme.outline;

    return _buildAdvisorSection(
      context: context,
      title: Localization.translate('pump_status', lang),
      icon: Icons.power_settings_new,
      color: color,
      statusLabel: statusLabel,
      explanation: advisory,
      metrics: [
        _MetricItem(label: Localization.translate('pump_switch', lang), value: pump ? 'ON' : 'OFF'),
        _MetricItem(label: Localization.translate('trigger_mode', lang), value: 'AUTOMATED'),
      ],
    );
  }

  Widget _buildAdvisorSection({
    required BuildContext context,
    required String title,
    required IconData icon,
    required Color color,
    required String statusLabel,
    required String explanation,
    required List<_MetricItem> metrics,
  }) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: color, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    title,
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    statusLabel,
                    style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 9.5),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              explanation,
              style: const TextStyle(color: Colors.white70, fontSize: 12.5, height: 1.45),
            ),
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: metrics.map((m) {
                return Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(m.label, style: const TextStyle(color: Colors.white30, fontSize: 10)),
                      const SizedBox(height: 3),
                      Text(m.value, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                    ],
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }
}

class _MetricItem {
  const _MetricItem({required this.label, required this.value});
  final String label;
  final String value;
}
