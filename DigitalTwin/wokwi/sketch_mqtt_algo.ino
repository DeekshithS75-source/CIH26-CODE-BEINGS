#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ==========================================
// CONFIGURATION
// ==========================================
// WiFi credentials (Wokwi uses Wokwi-GUEST, no password)
const char* ssid = "Wokwi-GUEST";
const char* password = "";

// Public Free MQTT Broker
const char* mqttServer = "broker.hivemq.com";
const int mqttPort = 1883;

// Topics for Zone A (Tomato Field)
const char* telemetryTopic = "smartfarm/zones/A/telemetry";
const char* controlTopic = "smartfarm/zones/A/control";

// Actuator Pin Configurations (matching your diagram.json)
const int RELAY_PIN = 26;    // Relay module representing the irrigation valve
const int RED_LED_PIN = 27;  // Red LED representing the heat warning buzzer/light

// Network Clients
WiFiClient espClient;
PubSubClient client(espClient);

// Local State Tracking
bool isIrrigating = false;
bool isAlertActive = false;
unsigned long lastBlinkTime = 0;
bool ledState = false;

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
  Serial.println("🧠 Smart Farm TinyML Edge Simulator Starting");
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
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // Setup MQTT server and callback function
  client.setServer(mqttServer, mqttPort);
  client.setCallback(mqttCallback);

  Serial.println("=========================================");
}

void loop() {
  // Ensure MQTT client is connected
  if (!client.connected()) {
    reconnectMqtt();
  }
  
  // Process incoming messages and keep connection alive
  client.loop();

  // --- NON-BLOCKING LED BLINKING WHEN PUMP IS ACTIVE ---
  if (isIrrigating) {
    unsigned long currentMillis = millis();
    if (currentMillis - lastBlinkTime >= 250) { // Blink rapidly (250ms) to indicate water flow
      lastBlinkTime = currentMillis;
      ledState = !ledState;
      digitalWrite(RED_LED_PIN, ledState ? HIGH : LOW);
    }
  } else {
    // If pump is off, show warning status (static HIGH on alert, LOW otherwise)
    if (isAlertActive) {
      digitalWrite(RED_LED_PIN, HIGH);
    } else {
      digitalWrite(RED_LED_PIN, LOW);
    }
  }
  
  delay(50);
}

// MQTT Message Receiver (Callback)
// Pressure buffering for 3-hour trend calculation (12 ticks = 3 hours simulated time)
float pressureHistory[12];
int pressureCount = 0;
int pressureIndex = 0;

// MQTT Message Receiver (Callback)
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Convert payload bytes to a string
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  // Parse telemetry JSON payload
  if (String(topic) == telemetryTopic) {
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, message);

    if (!error) {
      float temperature = doc["temperature"];
      float humidity = doc["humidity"];
      float soilMoisture = doc["soil_moisture"];
      int light = doc["light"];
      String irrigationStr = doc["irrigation"];
      String alertStr = doc["alert"];
      float currentPressure = doc["barometric_pressure"];
      String triggerMode = doc["smart_trigger_mode"] | "AUTOMATED";

      // --- DIGITAL TWIN ACTUATOR SYNC ---
      bool externalIrrigation = (irrigationStr == "ON");
      if (externalIrrigation != isIrrigating) {
        Serial.printf("[SYNC] Setting local pump state to %s\n", irrigationStr.c_str());
        isIrrigating = externalIrrigation;
        digitalWrite(RELAY_PIN, isIrrigating ? HIGH : LOW);
      }
      
      bool externalAlert = (alertStr != "NONE" && alertStr != "");
      if (externalAlert != isAlertActive) {
        Serial.printf("[SYNC] Setting local alert to %s\n", alertStr.c_str());
        isAlertActive = externalAlert;
        digitalWrite(RED_LED_PIN, isAlertActive ? HIGH : LOW);
      }

      // --- PRESSURE TREND CALCULATION ---
      float pressureTrend = 0.0;
      if (pressureCount > 0) {
        int oldestIndex = (pressureCount < 12) ? 0 : pressureIndex;
        pressureTrend = currentPressure - pressureHistory[oldestIndex];
      }
      
      // Store current pressure in buffer
      pressureHistory[pressureIndex] = currentPressure;
      pressureIndex = (pressureIndex + 1) % 12;
      if (pressureCount < 12) {
        pressureCount++;
      }

      Serial.println("-----------------------------------------");
      Serial.printf("[TELEMETRY RECEIVED] Temp:%.1fC, Soil:%.1f%%, Light:%d, Trigger:%s\n", temperature, soilMoisture, light, triggerMode.c_str());
      
      // ==========================================
      // 🌿 CROP ENVIRONMENTAL STRESS INDEX (CESI) ALGORITHM 🌿
      // ==========================================
      // We use an Explainable Weighted Scoring Algorithm that calculates a stress 
      // score based on deviations from ideal agricultural conditions.
      
      // 1. Define ideal conditions
      float idealTemp = 25.0;
      float idealMoisture = 40.0;
      
      // 2. Calculate Deviation Penalties (How far are we from ideal?)
      float tempPenalty = (temperature > idealTemp) ? (temperature - idealTemp) * 2.0 : 0;
      float moisturePenalty = (soilMoisture < idealMoisture) ? (idealMoisture - soilMoisture) * 1.5 : 0;
      
      // 3. Calculate Final Stress Score (0 to 100)
      float stressScore = tempPenalty + moisturePenalty;
      if (stressScore > 100.0) stressScore = 100.0;
      
      // 4. Map Score to Health Status
      String mlCropHealth = "HEALTHY";
      if (stressScore > 60.0) {
          mlCropHealth = "HEAT_STRESSED";
      } else if (stressScore > 30.0) {
          mlCropHealth = "WATER_STRESSED";
      }
      
      // 5. Calculate Water Requirement Percentage
      float water_req_score = 0.0;
      if (soilMoisture < 45.0) {
          water_req_score = ((45.0 - soilMoisture) / 40.0) * 100.0;
          if (temperature > 30.0) water_req_score += 10.0; // Heat compensation
      }
      if (water_req_score > 100.0) water_req_score = 100.0;

      // Print Algorithmic results to Wokwi Serial Monitor
      Serial.println("[CESI ALGORITHM EXECUTION]");
      Serial.printf("  - Inputs:   T:%.1f, SoilMoisture:%.1f\n", temperature, soilMoisture);
      Serial.printf("  - Stress Score: %.1f -> Class: %s\n", stressScore, mlCropHealth.c_str());
      Serial.printf("  - Water Need Score: %.2f%%\n", water_req_score);

      // --- ML-DRIVEN ACTUATOR DECISIONS ---
      
      // 1. Water control based on Crop moisture levels (independent actuator logic)
      if (soilMoisture < 15.0 && alertStr != "STORM_ALERT" && !isIrrigating) {
        if (triggerMode == "AUTOMATED") {
          Serial.println("[ML Decision] Soil is dry. AUTOMATED: Actuating Relay ON & Publishing.");
          isIrrigating = true;
          digitalWrite(RELAY_PIN, HIGH);
          publishEdgePrediction(isIrrigating, alertStr, mlCropHealth, water_req_score);
        } else {
          if (alertStr != "NEEDS_WATER") {
            Serial.println("[ML Decision] Soil is dry. CONFIRMATION: Setting alert NEEDS_WATER & Publishing.");
            publishEdgePrediction(isIrrigating, "NEEDS_WATER", mlCropHealth, water_req_score);
          }
        }
      } 
      else if ((soilMoisture > 40.0 || alertStr == "STORM_ALERT") && isIrrigating) {
        Serial.println("[ML Decision] Soil moisture restored (or storm incoming)! Actuating Relay OFF & Publishing.");
        isIrrigating = false;
        digitalWrite(RELAY_PIN, LOW);
        publishEdgePrediction(isIrrigating, alertStr == "STORM_ALERT" ? "STORM_ALERT" : "NONE", mlCropHealth, water_req_score);
      }

      // 2. Red Alert LED is synced at the beginning of the callback
      
      // Send periodic sync updates
      static int telemetryCount = 0;
      if (++telemetryCount % 3 == 0) {
         publishEdgePrediction(isIrrigating, alertStr, mlCropHealth, water_req_score);
      }
      
      Serial.println("-----------------------------------------");

    } else {
      Serial.print("deserializeJson() failed: ");
      Serial.println(error.f_str());
    }
  }
}

// Publish edge predictions and actuator statuses back to the Digital Twin
void publishEdgePrediction(bool irrigationState, String alertType, String mlCropHealth, float mlScore) {
  DynamicJsonDocument doc(512);
  doc["irrigation"] = irrigationState;
  doc["alert"] = alertType;
  doc["crop_health"] = mlCropHealth;
  doc["water_requirement"] = mlScore;

  String jsonStr;
  serializeJson(doc, jsonStr);

  Serial.printf("[MQTT Publish] Edge decisions to %s: %s\n", controlTopic, jsonStr.c_str());
  client.publish(controlTopic, jsonStr.c_str());
}

// Connect/Reconnect to the MQTT broker
void reconnectMqtt() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT Broker: ");
    Serial.println(mqttServer);
    
    // Create a unique client ID based on MAC address
    String clientId = "ESP32Client-" + String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("CONNECTED to MQTT Broker!");
      
      // Subscribe to telemetry topic to receive digital twin state
      client.subscribe(telemetryTopic);
      Serial.printf("Subscribed to telemetry stream: %s\n", telemetryTopic);
      Serial.println("=========================================");
    } else {
      Serial.print("Failed to connect, rc=");
      Serial.print(client.state());
      Serial.println(" - Retrying in 3 seconds...");
      delay(3000);
    }
  }
}
