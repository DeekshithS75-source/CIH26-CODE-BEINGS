#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ==========================================
// CONFIGURATION
// ==========================================
// WiFi credentials (Wokwi uses Wokwi-GUEST, no password)
const char* ssid = "Wokwi-GUEST";
const char* password = "";


const char* serverUrl = "https://nonexchangeable-lidia-galloping.ngrok-free.dev";

const String zoneId = "A";

// Actuator Pin Configurations (matching your diagram.json)
const int RELAY_PIN = 26;    // Relay module representing the irrigation valve
const int RED_LED_PIN = 27;  // Red LED representing the heat warning buzzer/light

// Keep track of current states to avoid redundant HTTP requests
bool isIrrigating = false;
bool isAlertActive = false;
unsigned long lastQueryTime = 0;
const unsigned long queryInterval = 3000; // Query every 3 seconds

void setup() {
  Serial.begin(115200);
  delay(10);
  
  // Set pin modes
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  
  // Initialize actuators to OFF
  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(RED_LED_PIN, LOW);

  Serial.println("=========================================");
  Serial.println("🌱 Smart Farm IoT Edge Simulator Starting");
  Serial.println("=========================================");
  
  // Connect to WiFi
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("Wi-Fi connected successfully!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  Serial.println("Listening to Digital Twin for Zone: " + zoneId);
  Serial.println("=========================================");
}

void loop() {
  // Check WiFi connection status
  if (WiFi.status() == WL_CONNECTED) {
    unsigned long currentMillis = millis();
    
    // Periodically query sensor telemetry from Digital Twin
    if (currentMillis - lastQueryTime >= queryInterval) {
      lastQueryTime = currentMillis;
      queryTelemetry();
    }
  } else {
    Serial.println("WiFi Disconnected! Reconnecting...");
    WiFi.begin(ssid, password);
    delay(2000);
  }
}

// Function to fetch telemetry and apply edge rules
void queryTelemetry() {
  WiFiClientSecure client;
  client.setInsecure(); // Bypass SSL certificate validation for secure tunnels
  
  HTTPClient http;
  
  // Construct GET request URL (fetch flat JSON for specific zone)
  String requestPath = String(serverUrl) + "/api/farm-data?zone=" + zoneId;
  
  Serial.print("[HTTP] Fetching telemetry from: ");
  Serial.println(requestPath);
  
  http.begin(client, requestPath); // Pass secure client
  
  // Add warning bypass headers for BOTH ngrok and localtunnel
  http.addHeader("ngrok-skip-browser-warning", "true"); 
  http.addHeader("Bypass-Tunnel-Reminder", "true"); 
  http.addHeader("User-Agent", "ESP32-EdgeDevice");
  
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS); // Follow redirects
  
  int httpCode = http.GET();
  
  if (httpCode > 0) {
    Serial.printf("[HTTP] GET Code: %d\n", httpCode);
    
    if (httpCode == HTTP_CODE_OK) {
      String payload = http.getString();
      Serial.println("[HTTP] Response payload:");
      Serial.println(payload);
      
      // Parse JSON response
      DynamicJsonDocument doc(1024);
      DeserializationError error = deserializeJson(doc, payload);
      
      if (!error) {
        float temperature = doc["temperature"];
        float humidity = doc["humidity"];
        float soilMoisture = doc["soil_moisture"];
        int light = doc["light"];
        String irrigationStr = doc["irrigation"];
        
        // Print parsed data to Serial
        Serial.println("-----------------------------------------");
        Serial.printf("Zone %s Telemetry:\n", zoneId.c_str());
        Serial.printf("  - Temperature:   %.1f C\n", temperature);
        Serial.printf("  - Humidity:      %.1f%%\n", humidity);
        Serial.printf("  - Soil Moisture: %.1f%%\n", soilMoisture);
        Serial.printf("  - Sunlight:      %d\n", light);
        Serial.printf("  - Sprinklers:    %s\n", irrigationStr.c_str());
        Serial.println("-----------------------------------------");

        // --- EDGE COMPUTING / DECISION LOGIC ---
        
        // 1. Soil Moisture Control (Irrigation Relay on Pin 26)
        if (soilMoisture < 30.0 && !isIrrigating) {
          Serial.println("[Edge Decider] Soil moisture low (<30%). ACTUATING RELAY ON!");
          setIrrigationState(true);
        } 
        else if (soilMoisture > 70.0 && isIrrigating) {
          Serial.println("[Edge Decider] Soil moisture restored (>70%). DEACTIVATING RELAY.");
          setIrrigationState(false);
        }

        // 2. Temperature Threshold Monitoring (Heat Alarm Red LED on Pin 27)
        if (temperature > 38.0 && !isAlertActive) {
          Serial.println("[Edge Decider] Danger! Extreme Heat (>38C). ACTUATING ALARM LED ON!");
          setAlertState("HEAT_WARNING");
        } 
        else if (temperature <= 38.0 && isAlertActive) {
          Serial.println("[Edge Decider] Temperature normalized. CLEARING ALARM LED.");
          setAlertState("NONE");
        }

      } else {
        Serial.print("deserializeJson() failed: ");
        Serial.println(error.f_str());
      }
    }
  } else {
    Serial.printf("[HTTP] GET failed, error: %s\n", http.errorToString(httpCode).c_str());
  }
  
  http.end();
}

// Actuate: Send POST request to update backend irrigation state
void setIrrigationState(bool turnOn) {
  WiFiClientSecure client;
  client.setInsecure(); // Bypass SSL
  
  HTTPClient http;
  String path = String(serverUrl) + "/api/zone/" + zoneId + "/irrigation";
  
  http.begin(client, path); // Pass secure client
  http.addHeader("Content-Type", "application/json");
  http.addHeader("User-Agent", "ESP32-EdgeDevice");
  http.addHeader("ngrok-skip-browser-warning", "true"); 
  http.addHeader("Bypass-Tunnel-Reminder", "true"); 
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  
  String jsonBody = turnOn ? "{\"irrigation\":true}" : "{\"irrigation\":false}";
  
  Serial.printf("[Actuator] Sending command to %s: %s\n", path.c_str(), jsonBody.c_str());
  int httpCode = http.POST(jsonBody);
  
  if (httpCode > 0) {
    Serial.printf("[Actuator] POST Response Code: %d\n", httpCode);
    if (httpCode == HTTP_CODE_OK) {
      isIrrigating = turnOn;
      // Actuate Relay Module connected to Pin 26
      digitalWrite(RELAY_PIN, turnOn ? HIGH : LOW);
      Serial.printf("[Actuator] Pin 26 state set to %s\n", turnOn ? "HIGH" : "LOW");
    }
  } else {
    Serial.print("[Actuator] POST failed: ");
    Serial.println(http.errorToString(httpCode));
  }
  http.end();
}

// Actuate: Send POST request to raise/clear heat alert status
void setAlertState(String alertType) {
  WiFiClientSecure client;
  client.setInsecure(); // Bypass SSL
  
  HTTPClient http;
  String path = String(serverUrl) + "/api/zone/" + zoneId + "/alert";
  
  http.begin(client, path); // Pass secure client
  http.addHeader("Content-Type", "application/json");
  http.addHeader("User-Agent", "ESP32-EdgeDevice");
  http.addHeader("ngrok-skip-browser-warning", "true"); 
  http.addHeader("Bypass-Tunnel-Reminder", "true"); 
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  
  String jsonBody = "{\"alert\":\"" + alertType + "\"}";
  
  Serial.printf("[Alarm] Sending alert status to %s: %s\n", path.c_str(), jsonBody.c_str());
  int httpCode = http.POST(jsonBody);
  
  if (httpCode > 0) {
    Serial.printf("[Alarm] POST Response Code: %d\n", httpCode);
    if (httpCode == HTTP_CODE_OK) {
      isAlertActive = (alertType != "NONE");
      // Actuate Red LED connected to Pin 27
      digitalWrite(RED_LED_PIN, isAlertActive ? HIGH : LOW);
      Serial.printf("[Alarm] Pin 27 state set to %s\n", isAlertActive ? "HIGH" : "LOW");
    }
  } else {
    Serial.print("[Alarm] POST failed: ");
    Serial.println(http.errorToString(httpCode));
  }
  http.end();
}
