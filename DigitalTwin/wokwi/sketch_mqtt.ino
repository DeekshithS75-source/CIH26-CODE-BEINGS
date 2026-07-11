#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "model_weights.h" // Include our trained Neural Network weights & inference code

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
      Serial.printf("[TELEMETRY RECEIVED] Temp:%.1fC, Soil:%.1f%%, Light:%d\n", temperature, soilMoisture, light);
      
      // ==========================================
      // 🧠 EDGE TINYML NEURAL NETWORK INFERENCE 🧠
      // ==========================================
      // Pass raw sensor values directly to the inference engine (Temp, Hum, Soil, Light)
      EdgeML::Prediction pred = EdgeML::predict(temperature, humidity, soilMoisture, (float)light);
      
      // Map class indices to Crop Health Stress strings
      String mlCropHealth = "HEALTHY";
      if (pred.crop_health == 1) mlCropHealth = "WATER_STRESSED";
      else if (pred.crop_health == 2) mlCropHealth = "HEAT_STRESSED";

      // Print TinyML Model results to Wokwi Serial Monitor
      Serial.println("[TINYML INTERFACE EXECUTION]");
      Serial.printf("  - Inputs:   T:%.1f, H:%.1f, SoilMoisture:%.1f, Light:%d\n", temperature, humidity, soilMoisture, light);
      Serial.printf("  - ML Crop Stress Level: %s\n", mlCropHealth.c_str());
      Serial.printf("  - ML Water Score: %.2f%% (Irrigation Need)\n", pred.water_requirement_score);

      // --- ML-DRIVEN ACTUATOR DECISIONS ---
      
      // 1. Water control based on Crop moisture levels (independent actuator logic)
      if (soilMoisture < 15.0 && alertStr != "STORM_ALERT" && !isIrrigating) {
        Serial.println("[ML Decision] Soil is dry & no storm threat. Actuating Relay ON & Publishing.");
        isIrrigating = true;
        digitalWrite(RELAY_PIN, HIGH);
        publishEdgePrediction(isIrrigating, alertStr, mlCropHealth, pred.water_requirement_score);
      } 
      else if ((soilMoisture > 40.0 || alertStr == "STORM_ALERT") && isIrrigating) {
        Serial.println("[ML Decision] Soil moisture restored (or storm incoming)! Actuating Relay OFF & Publishing.");
        isIrrigating = false;
        digitalWrite(RELAY_PIN, LOW);
        publishEdgePrediction(isIrrigating, alertStr, mlCropHealth, pred.water_requirement_score);
      }

      // 2. Alarm control based on Digital Twin Weather Alerts
      if (alertStr == "STORM_ALERT" && !isAlertActive) {
        Serial.println("[Warning] Storm warning active! Actuating Red Alert LED to blink.");
        isAlertActive = true;
        publishEdgePrediction(isIrrigating, "STORM_ALERT", mlCropHealth, pred.water_requirement_score);
      } 
      else if (alertStr != "STORM_ALERT" && isAlertActive) {
        Serial.println("[Warning] Storm warning cleared. Clearing Red Alert LED.");
        isAlertActive = false;
        publishEdgePrediction(isIrrigating, "NONE", mlCropHealth, pred.water_requirement_score);
      }
      
      // Send periodic sync updates
      static int telemetryCount = 0;
      if (++telemetryCount % 3 == 0) {
         publishEdgePrediction(isIrrigating, alertStr, mlCropHealth, pred.water_requirement_score);
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
