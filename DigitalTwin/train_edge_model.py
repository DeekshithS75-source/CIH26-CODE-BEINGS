# pyrefly: ignore [missing-import]
import numpy as np
import os
import pandas as pd

# ==========================================
# 1. LOAD AND PRE-PROCESS REAL TRAINING DATA
# ==========================================
print("[DATA] Loading agricultural weather dataset...")
csv_path = os.path.join(os.path.dirname(__file__), "backend/agriculture_dataset_with_target.csv")
df = pd.read_csv(csv_path)

num_samples = len(df)
print(f"[DATA] Loaded {num_samples} records successfully.")

# Features: [Air_Temperature, Humidity, Soil_Moisture, Solar_Radiation]
raw_temp = df['Air_Temperature'].values
raw_hum = df['Humidity'].values
raw_moist = df['Soil_Moisture'].values
raw_rad = df['Solar_Radiation'].values

# Normalize inputs to [0, 1] range for Neural Network stability
# Air_Temperature: 15 to 40
# Humidity: 30 to 95
# Soil_Moisture: 5 to 45
# Solar_Radiation: 200 to 1000
X = np.stack([
    (raw_temp - 15.0) / 25.0,
    (raw_hum - 30.0) / 65.0,
    (raw_moist - 5.0) / 40.0,
    (raw_rad - 200.0) / 800.0
], axis=1)

# Labels:
# Class: Crop_Health (Healthy -> 0, Moderate_Stress -> 1, High_Stress -> 2)
class_mapping = {'Healthy': 0, 'Moderate_Stress': 1, 'High_Stress': 2}
Y_class = df['Crop_Health'].map(class_mapping).values

# RegTarget: Water requirement score (0 to 100)
# Calculated physically from soil moisture (drier soil = more water required)
# 45% moisture -> 0% water required. 5% moisture -> 100% water required.
Y_reg = (45.0 - raw_moist) / 40.0 * 100.0
Y_reg = np.clip(Y_reg, 0.0, 100.0)

# Convert classes to one-hot encoding
one_hot_classes = np.zeros((num_samples, 3))
one_hot_classes[np.arange(num_samples), Y_class] = 1.0

# ==========================================
# 2. DEFINE A MULTI-TASK NEURAL NETWORK (MTL)
# ==========================================
# 4 Inputs -> 5 Hidden Neurons (ReLU) -> 3 Class Outputs (Softmax) & 1 Reg Output (Sigmoid)
input_dim = 4
hidden_dim = 5
class_dim = 3
reg_dim = 1

# Initialize weights and biases
W1 = np.random.randn(input_dim, hidden_dim) * 0.1
b1 = np.zeros((1, hidden_dim))

W_class = np.random.randn(hidden_dim, class_dim) * 0.1
b_class = np.zeros((1, class_dim))

W_reg = np.random.randn(hidden_dim, reg_dim) * 0.1
b_reg = np.zeros((1, reg_dim))

# Activation functions
def relu(x):
    return np.maximum(0, x)

def softmax(x):
    exp_x = np.exp(x - np.max(x, axis=1, keepdims=True))
    return exp_x / np.sum(exp_x, axis=1, keepdims=True)

def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-np.clip(x, -500, 500)))

# ==========================================
# 3. TRAINING LOOP (Backpropagation)
# ==========================================
print("[TRAIN] Training Multi-Task Crop Intelligence Neural Network...")
lr = 0.05
epochs = 2000

for epoch in range(epochs):
    # Forward Pass
    h = relu(np.dot(X, W1) + b1)
    
    # Classification Branch (Crop Stress Level)
    logits_class = np.dot(h, W_class) + b_class
    pred_class = softmax(logits_class)
    
    # Regression Branch (Water requirement score)
    logits_reg = np.dot(h, W_reg) + b_reg
    pred_reg = sigmoid(logits_reg)
    target_reg = (Y_reg / 100.0).reshape(-1, 1)
    
    # Loss: Cross-Entropy + Mean Squared Error
    class_loss = -np.mean(np.sum(one_hot_classes * np.log(pred_class + 1e-15), axis=1))
    reg_loss = np.mean((pred_reg - target_reg) ** 2)
    total_loss = class_loss + reg_loss
    
    # Backpropagation gradients
    d_logits_class = (pred_class - one_hot_classes) / num_samples
    d_W_class = np.dot(h.T, d_logits_class)
    d_b_class = np.sum(d_logits_class, axis=0, keepdims=True)
    
    d_logits_reg = 2.0 * (pred_reg - target_reg) * pred_reg * (1.0 - pred_reg) / num_samples
    d_W_reg = np.dot(h.T, d_logits_reg)
    d_b_reg = np.sum(d_logits_reg, axis=0, keepdims=True)
    
    d_h = np.dot(d_logits_class, W_class.T) + np.dot(d_logits_reg, W_reg.T)
    d_logits1 = d_h * (h > 0)
    
    d_W1 = np.dot(X.T, d_logits1)
    d_b1 = np.sum(d_logits1, axis=0, keepdims=True)
    
    # Update weights
    W1 -= lr * d_W1
    b1 -= lr * d_b1
    W_class -= lr * d_W_class
    b_class -= lr * d_b_class
    W_reg -= lr * d_W_reg
    b_reg -= lr * d_b_reg
    
    if epoch % 400 == 0:
        class_preds = np.argmax(pred_class, axis=1)
        accuracy = np.mean(class_preds == Y_class) * 100
        print(f"  Epoch {epoch:4d} | Total Loss: {total_loss:.4f} | Crop Stress Acc: {accuracy:.2f}% | Water MSE: {reg_loss:.4f}")

# Final validation
h = relu(np.dot(X, W1) + b1)
pred_class = softmax(np.dot(h, W_class) + b_class)
class_preds = np.argmax(pred_class, axis=1)
final_accuracy = np.mean(class_preds == Y_class) * 100
print(f"[RESULT] Training Complete! Final Crop Health Classification Accuracy: {final_accuracy:.2f}%")

# ==========================================
# 4. AUTO-GENERATE C++ WEIGHTS HEADER CODE
# ==========================================
print("[EXPORT] Generating C++ Neural Network weights code...")

cpp_code = f"""// Auto-generated Multi-Task Neural Network Weights for ESP32
// Inputs: [Temp_norm, Hum_norm, Moisture_norm, Solar_norm]
// Hidden Layer: 5 Neurons (ReLU)
// Outputs: Classification (3 classes: HEALTHY, MODERATE_STRESS, HIGH_STRESS) 
//          & Regression (Water Requirement Score, 0-100)

namespace EdgeML {{
    // Hidden Layer 1 Weights (Input to Hidden)
    const float W1[4][5] = {{
"""

for row in W1:
    cpp_code += "        {" + ", ".join([f"{val:.6f}f" for val in row]) + "},\n"
cpp_code += f"""    }};
    
    const float b1[5] = {{ {", ".join([f"{val:.6f}f" for val in b1[0]])} }};

    // Classification Branch Weights (Hidden to Class Output)
    const float W_class[5][3] = {{
"""
for row in W_class:
    cpp_code += "        {" + ", ".join([f"{val:.6f}f" for val in row]) + "},\n"
cpp_code += f"""    }};
    
    const float b_class[3] = {{ {", ".join([f"{val:.6f}f" for val in b_class[0]])} }};

    // Regression Branch Weights (Hidden to Reg Output)
    const float W_reg[5][1] = {{
"""
for row in W_reg:
    cpp_code += "        {" + ", ".join([f"{val:.6f}f" for val in row]) + "},\n"
cpp_code += f"""    }};
    
    const float b_reg[1] = {{ {", ".join([f"{val:.6f}f" for val in b_reg[0]])} }};

    // Forward Propagation logic executing at the Edge
    struct Prediction {{
        int crop_health; // 0 = HEALTHY, 1 = MODERATE_STRESS, 2 = HIGH_STRESS
        float water_requirement_score; // 0.0 to 100.0
    }};

    Prediction predict(float temp, float hum, float soilMoisture, float solarRadiation) {{
        // 1. Normalize Inputs
        float x[4];
        x[0] = (temp - 15.0f) / 25.0f;
        x[1] = (hum - 30.0f) / 65.0f;
        x[2] = (soilMoisture - 5.0f) / 40.0f;
        x[3] = (solarRadiation - 200.0f) / 800.0f;

        // 2. Feed Hidden Layer (Matrix multiply + Bias + ReLU activation)
        float h[5];
        for (int j = 0; j < 5; j++) {{
            float sum = b1[j];
            for (int i = 0; i < 4; i++) {{
                sum += x[i] * W1[i][j];
            }}
            h[j] = (sum > 0.0f) ? sum : 0.0f; // ReLU
        }}

        // 3. Classification Outputs (Logits + Softmax prediction)
        float c_logits[3];
        for (int j = 0; j < 3; j++) {{
            float sum = b_class[j];
            for (int i = 0; i < 5; i++) {{
                sum += h[i] * W_class[i][j];
            }}
            c_logits[j] = sum;
        }}
        // Find argmax for classification
        int best_class = 0;
        float max_logit = c_logits[0];
        for (int j = 1; j < 3; j++) {{
            if (c_logits[j] > max_logit) {{
                max_logit = c_logits[j];
                best_class = j;
            }}
        }}

        // 4. Regression Output (Logit + Sigmoid activation)
        float r_logit = b_reg[0];
        for (int i = 0; i < 5; i++) {{
            r_logit += h[i] * W_reg[i][0];
        }}
        // Sigmoid mapping: 1 / (1 + exp(-x))
        float sigmoid_val = 1.0f / (1.0f + expf(-r_logit));
        float water_score = sigmoid_val * 100.0f;

        Prediction result;
        result.crop_health = best_class;
        result.water_requirement_score = water_score;
        return result;
    }}
}}
"""

# Save headers code to model_weights.h
header_path = os.path.join(os.path.dirname(__file__), "wokwi/model_weights.h")
with open(header_path, "w") as f:
    f.write(cpp_code)

print(f"[EXPORT] C++ Model successfully exported to: {header_path}")

# Export weights to JSON for backend simulator forward pass sync
import json
weights_dict = {
    "W1": W1.tolist(),
    "b1": b1.tolist(),
    "W_class": W_class.tolist(),
    "b_class": b_class.tolist(),
    "W_reg": W_reg.tolist(),
    "b_reg": b_reg.tolist()
}
json_path = os.path.join(os.path.dirname(__file__), "backend/simulation/model_weights.json")
with open(json_path, "w") as f:
    json.dump(weights_dict, f, indent=2)
print(f"[EXPORT] JSON model weights exported to: {json_path}")
