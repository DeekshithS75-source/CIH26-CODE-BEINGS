import 'package:dio/dio.dart';

import '../core/network/dio_client.dart';
import '../models/farm_status.dart';

class Esp32ApiService {
  Esp32ApiService({required String baseUrl}) : _dio = DioClient().create(baseUrl);

  final Dio _dio;

  Future<FarmStatus> fetchStatus() async {
    final response = await _dio.get<Map<String, dynamic>>('/status');
    final data = response.data;
    if (data == null) {
      throw StateError('ESP32 returned an empty response.');
    }
    return FarmStatus.fromJson(data);
  }

  Future<Map<String, dynamic>> fetchTomorrowPrediction(String zone) async {
    final response = await _dio.get<Map<String, dynamic>>('/api/weather/predict-tomorrow', queryParameters: {'zone': zone});
    final data = response.data;
    if (data == null) {
      throw StateError('Prediction API returned an empty response.');
    }
    return data;
  }

  Future<Map<String, dynamic>> fetchVoiceChat(String query) async {
    final response = await _dio.get<Map<String, dynamic>>('/api/voice-chat', queryParameters: {'query': query});
    final data = response.data;
    if (data == null) {
      throw StateError('Voice API returned an empty response.');
    }
    return data;
  }

  Future<void> updateTriggerMode(String mode) async {
    await _dio.post<dynamic>('/api/trigger-mode', data: {'mode': mode});
  }

  Future<void> toggleIrrigation(String zone, bool value) async {
    await _dio.post<dynamic>('/api/zone/$zone/irrigation', data: {'irrigation': value});
  }

  Future<void> clearAlert(String zone) async {
    await _dio.post<dynamic>('/api/zone/$zone/alert', data: {'alert': 'NONE'});
  }
}
