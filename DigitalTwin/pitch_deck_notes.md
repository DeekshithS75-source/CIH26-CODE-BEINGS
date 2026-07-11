# Smart Agriculture Digital Twin: Pitch Deck & Explainer Notes

Use these notes to present the project architecture and the AI/ML implementation to the hackathon judges.

---

## 1. Technical Pitch Summary

### The Core Concept:
A closed-loop cyber-physical system representing a smart farm, where environmental telemetry is simulated by a digital twin, edge decisions are computed using a custom **Multi-Task Neural Network** running at the edge on a virtual ESP32, and predictions are reflected in real-time on a Next.js dashboard.

### The Problem:
Static, hardcoded sensor thresholds (e.g., `if moisture < 30%`) fail to adapt to complex weather changes, variable crop canopy absorption rates, and atmospheric humidity. 

### The Solution:
An Edge-AI microcontroller (ESP32) that runs a live neural network to predict crop health stress levels and the exact water requirement score based on 4 telemetry variables.

---

## 2. Technical Stack & Pipeline

1. **Digital Twin Biosphere (Node.js/Express)**: Simulates physical diurnal cycles of temperature, humidity, and solar light. Houses crops (Tomato, Rice, Wheat) with distinct transpiration/evaporation rates.
2. **Message Broker (HiveMQ MQTT)**: Decoupled event-driven transportation, enabling the ESP32 in Wokwi and the local Express server to sync state bidirectionally without tunneling software.
3. **TinyML Edge Inference (ESP32/Wokwi)**: Standard devkit executing a custom feedforward neural network compiled down to C++ math. It actuates a physical relay (irrigation pump) and red LED (heat alarm).
4. **Bio-Twin Dashboard (React/Next.js)**: Modern responsive glassmorphic dashboard showcasing real-time SVG farm changes (wilting plants, sprinkler sprays, weather overlays) and displaying the Edge AI predictions and meters.

---

## 3. The AI/ML implementation Details

### Model Architecture (Multi-Task Learning)
- **Inputs (4 Nodes)**: Normalized Temperature, Humidity, Soil Moisture, Light.
- **Hidden Layer (5 Neurons)**: Fully connected layer with ReLU activation.
- **Outputs (Two Task Branches)**:
  - **Classification (Softmax)**: Crop Health State (0 = HEALTHY, 1 = WATER_STRESSED, 2 = HEAT_STRESSED).
  - **Regression (Sigmoid * 100)**: Continuous Water Requirement Score (0.0 to 100.0%).

### Training & Code Generation (`train_edge_model.py`)
- **Dataset**: 5,000 synthetic records modeled on real-world agronomical soil dynamics.
- **Accuracy**: Achieved **92.94% accuracy** on crop stress classification.
- **Compilation**: Transpiled python weights and biases directly into pure C++ arrays and matrix math functions (`model_weights.h`) for zero-library overhead.

---

## 4. Live Demo Walkthrough Steps for Judges

1. Show the **Local Dashboard** ([http://localhost:3000](http://localhost:3000)) running in a healthy state (green fields).
2. Show the **Wokwi Simulator** running. Point to the Serial Monitor showing:
   ```text
   [TELEMETRY RECEIVED] Temp:24.8C, Soil:100%
   [TINYML INTERFACE EXECUTION]
     - ML Class: HEALTHY
     - ML Score: 0.0% (Predicted Water Need)
   ```
3. Trigger a **Heatwave** on the dashboard. 
4. Watch the soil moisture deplete. As it drops below 35%, watch the Wokwi Serial Monitor output shift:
   ```text
   [TINYML INTERFACE EXECUTION]
     - ML Class: WATER_STRESSED
     - ML Score: 84.5% (Predicted Water Need)
   [ML Decision] Crop is WATER STRESSED! Actuating Relay ON & Publishing.
   ```
5. Point out the Wokwi **Relay Module** turning ON, and show the dashboard immediately reacting by turning on the **Sprinklers** and displaying `Edge AI Crop Health: WATER_STRESSED` and `Edge ML Water Score: 84.5%`.
