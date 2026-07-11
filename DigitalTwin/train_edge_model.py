
# pyrefly: ignore [missing-import]
import numpy as np
import os

# ==========================================
# 1. GENERATE SYNTHETIC TRAINING DATA
# ==========================================
print("[DATA] Generating 5,000 agricultural sensor records...")
np.random.seed(42)
num_samples = 5000

# Features: [Temperature, Humidity, Soil Moisture, Light]
raw_temp = np.random.uniform(15, 45, num_samples)
raw_hum = np.random.uniform(20, 90, num_samples)
raw_soil = np.random.uniform(0, 100, num_samples)
raw_light = np.random.uniform(0, 4095, num_samples)

# Normalize inputs to [0, 1] range for Neural Network stability
X = np.stack([
    (raw_temp - 15.0) / 30.0,
    (raw_hum - 20.0) / 70.0,
    raw_soil / 100.0,
    raw_light / 4095.0
], axis=1)

# Labels:
# Class: 0 = HEALTHY, 1 = WATER_STRESSED, 2 = HEAT_STRESSED
# RegTarget: Water requirement score (0 to 100)
Y_class = np.zeros(num_samples, dtype=int)
Y_reg = np.zeros(num_samples)

for i in range(num_samples):
    t, h, s, l = raw_temp[i], raw_hum[i], raw_soil[i], raw_light[i]
    
    # Logic matching realistic crop behaviors
    if s < 35.0:
        Y_class[i] = 1 # WATER_STRESSED
        Y_reg[i] = (100.0 - s) * 0.9 + (t * 0.2) 
    elif t > 37.0 and l > 2800:
        Y_class[i] = 2 # HEAT_STRESSED
        Y_reg[i] = (100.0 - s) * 0.4 + 30.0
    else:
        Y_class[i] = 0 # HEALTHY
        Y_reg[i] = max(0, (60.0 - s) * 0.5)
        
    Y_reg[i] = np.clip(Y_reg[i], 0.0, 100.0)

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
print("[TRAIN] Training Multi-Task Neural Network...")
lr = 0.05
epochs = 2000

for epoch in range(epochs):
    # Forward Pass
    h = relu(np.dot(X, W1) + b1)
    
    # Classification Branch
    logits_class = np.dot(h, W_class) + b_class
    pred_class = softmax(logits_class)
    
    # Regression Branch
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
        print(f"  Epoch {epoch:4d} | Total Loss: {total_loss:.4f} | Class Acc: {accuracy:.2f}% | Reg Loss (MSE): {reg_loss:.4f}")

# Final validation
h = relu(np.dot(X, W1) + b1)
pred_class = softmax(np.dot(h, W_class) + b_class)
class_preds = np.argmax(pred_class, axis=1)
final_accuracy = np.mean(class_preds == Y_class) * 100
print(f"[RESULT] Training Complete! Final Classification Accuracy: {final_accuracy:.2f}%")

# ==========================================
# 4. AUTO-GENERATE C++ WEIGHTS HEADER CODE
# ==========================================
print("[EXPORT] Generating C++ Neural Network weights code...")

cpp_code = f"""// Auto-generated Multi-Task Neural Network Weights for ESP32
// Inputs: [Temp_norm, Hum_norm, Soil_norm, Light_norm]
// Hidden Layer: {hidden_dim} Neurons (ReLU)
// Outputs: Classification (3 classes: HEALTHY, WATER_STRESSED, HEAT_STRESSED) 
//          & Regression (Water Requirement Score, 0-100)

namespace EdgeML {{
    // Hidden Layer 1 Weights (Input to Hidden)
    const float W1[{input_dim}][{hidden_dim}] = {{
"""

for row in W1:
    cpp_code += "        {" + ", ".join([f"{val:.6f}f" for val in row]) + "},\n"
cpp_code += f"""    }};
    
    const float b1[{hidden_dim}] = {{ {", ".join([f"{val:.6f}f" for val in b1[0]])} }};

    // Classification Branch Weights (Hidden to Class Output)
    const float W_class[{hidden_dim}][{class_dim}] = {{
"""
for row in W_class:
    cpp_code += "        {" + ", ".join([f"{val:.6f}f" for val in row]) + "},\n"
cpp_code += f"""    }};
    
    const float b_class[{class_dim}] = {{ {", ".join([f"{val:.6f}f" for val in b_class[0]])} }};

    // Regression Branch Weights (Hidden to Reg Output)
    const float W_reg[{hidden_dim}][{reg_dim}] = {{
"""
for row in W_reg:
    cpp_code += "        {" + ", ".join([f"{val:.6f}f" for val in row]) + "},\n"
cpp_code += f"""    }};
    
    const float b_reg[{reg_dim}] = {{ {", ".join([f"{val:.6f}f" for val in b_reg[0]])} }};

    // Forward Propagation logic executing at the Edge
    struct Prediction {{
        int crop_health; // 0 = HEALTHY, 1 = WATER_STRESSED, 2 = HEAT_STRESSED
        float water_requirement_score; // 0.0 to 100.0
    }};

    Prediction predict(float temp, float hum, float soil, float light) {{
        // 1. Normalize Inputs
        float x[4];
        x[0] = (temp - 15.0f) / 30.0f;
        x[1] = (hum - 20.0f) / 70.0f;
        x[2] = soil / 100.0f;
        x[3] = light / 4095.0f;

        // 2. Feed Hidden Layer (Matrix multiply + Bias + ReLU activation)
        float h[{hidden_dim}];
        for (int j = 0; j < {hidden_dim}; j++) {{
            float sum = b1[j];
            for (int i = 0; i < {input_dim}; i++) {{
                sum += x[i] * W1[i][j];
            }}
            h[j] = (sum > 0.0f) ? sum : 0.0f; // ReLU
        }}

        // 3. Classification Outputs (Logits + Softmax prediction)
        float c_logits[{class_dim}];
        for (int j = 0; j < {class_dim}; j++) {{
            float sum = b_class[j];
            for (int i = 0; i < {hidden_dim}; i++) {{
                sum += h[i] * W_class[i][j];
            }}
            c_logits[j] = sum;
        }}
        // Find argmax for classification
        int best_class = 0;
        float max_logit = c_logits[0];
        for (int j = 1; j < {class_dim}; j++) {{
            if (c_logits[j] > max_logit) {{
                max_logit = c_logits[j];
                best_class = j;
            }}
        }}

        // 4. Regression Output (Logit + Sigmoid activation)
        float r_logit = b_reg[0];
        for (int i = 0; i < {hidden_dim}; i++) {{
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
