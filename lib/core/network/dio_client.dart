import 'package:dio/dio.dart';

class DioClient {
  DioClient();

  Dio create(String baseUrl) {
    return Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 3),
        receiveTimeout: const Duration(seconds: 3),
        sendTimeout: const Duration(seconds: 3),
        responseType: ResponseType.json,
        headers: {'Accept': 'application/json'},
      ),
    );
  }
}
