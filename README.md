# CIH26 — FarmEdge Monitor

Production-style offline Flutter Android monitoring dashboard for an ESP32 farm controller.

The app reads only from the ESP32 REST API, defaulting to `http://192.168.4.1/status`. It does not use cloud services, Firebase, or any simulator endpoint.

## Run

```sh
flutter pub get
flutter run
```

## ESP32 API

```http
GET /status
```

```json
{
  "temperature": 34,
  "humidity": 62,
  "soilMoisture": 41,
  "battery": 91,
  "pump": true,
  "rain": false,
  "cropStress": "MEDIUM",
  "lastUpdated": "2026-07-11T12:30:15"
}
```
