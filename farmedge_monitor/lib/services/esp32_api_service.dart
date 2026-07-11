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
}
