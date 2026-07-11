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
  delay(50);
}

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

      Serial.println("-----------------------------------------");
      Serial.printf("[TELEMETRY RECEIVED] Temp:%.1fC, Soil:%.1f%%\n", temperature, soilMoisture);
      
      // ==========================================
      // 🧠 EDGE TINYML NEURAL NETWORK INFERENCE 🧠
      // ==========================================
      // Pass raw sensor values directly to the forward propagation engine
      EdgeML::Prediction pred = EdgeML::predict(temperature, humidity, soilMoisture, light);
      
      // Map class indices to readable names
      // 0 = HEALTHY, 1 = WATER_STRESSED, 2 = HEAT_STRESSED
      String mlHealthStr = "HEALTHY";
      if (pred.crop_health == 1) mlHealthStr = "WATER_STRESSED";
      else if (pred.crop_health == 2) mlHealthStr = "HEAT_STRESSED";

      // Print TinyML Model results to Wokwi Serial Monitor
      Serial.println("[TINYML INTERFACE EXECUTION]");
      Serial.printf("  - Inputs:   T:%.1f, H:%.1f, S:%.1f, L:%d\n", temperature, humidity, soilMoisture, light);
      Serial.printf("  - ML Class: %s (Probabilities computed)\n", mlHealthStr.c_str());
      Serial.printf("  - ML Score: %.2f%% (Predicted Water Need)\n", pred.water_requirement_score);

      // --- ML-DRIVEN ACTUATOR DECISIONS ---
      
      // 1. Water control based on Crop stress predictions
      if (pred.crop_health == 1 && !isIrrigating) {
        Serial.println("[ML Decision] Crop is WATER STRESSED! Actuating Relay ON & Publishing.");
        isIrrigating = true;
        digitalWrite(RELAY_PIN, HIGH);
        publishEdgePrediction(isIrrigating, isAlertActive ? "HEAT_WARNING" : "NONE", mlHealthStr, pred.water_requirement_score);
      } 
      else if (pred.crop_health == 0 && pred.water_requirement_score < 15.0 && isIrrigating) {
        Serial.println("[ML Decision] Soil moisture restored! Actuating Relay OFF & Publishing.");
        isIrrigating = false;
        digitalWrite(RELAY_PIN, LOW);
        publishEdgePrediction(isIrrigating, isAlertActive ? "HEAT_WARNING" : "NONE", mlHealthStr, pred.water_requirement_score);
      }

      // 2. Alarm control based on Heat stress predictions
      if (pred.crop_health == 2 && !isAlertActive) {
        Serial.println("[ML Decision] Crop is HEAT STRESSED! Turning on Alarm LED.");
        isAlertActive = true;
        digitalWrite(RED_LED_PIN, HIGH);
        publishEdgePrediction(isIrrigating, "HEAT_WARNING", mlHealthStr, pred.water_requirement_score);
      } 
      else if (pred.crop_health == 0 && isAlertActive) {
        Serial.println("[ML Decision] Temperature normalized. Turning off Alarm LED.");
        isAlertActive = false;
        digitalWrite(RED_LED_PIN, LOW);
        publishEdgePrediction(isIrrigating, "NONE", mlHealthStr, pred.water_requirement_score);
      }
      
      // If no state transitions occurred, still send updates periodically
      // to keep dashboard AI meters completely in sync
      static int telemetryCount = 0;
      if (++telemetryCount % 3 == 0) {
         publishEdgePrediction(isIrrigating, isAlertActive ? "HEAT_WARNING" : "NONE", mlHealthStr, pred.water_requirement_score);
      }
      
      Serial.println("-----------------------------------------");

    } else {
      Serial.print("deserializeJson() failed: ");
      Serial.println(error.f_str());
    }
  }
}

// Publish edge predictions and actuator statuses back to the Digital Twin
void publishEdgePrediction(bool irrigationState, String alertType, String mlHealth, float mlScore) {
  DynamicJsonDocument doc(512);
  doc["irrigation"] = irrigationState;
  doc["alert"] = alertType;
  doc["crop_health"] = mlHealth;
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
