// Auto-generated Multi-Task Neural Network Weights for ESP32
// Inputs: [Temp_norm, Hum_norm, Moisture_norm, Solar_norm]
// Hidden Layer: 5 Neurons (ReLU)
// Outputs: Classification (3 classes: HEALTHY, MODERATE_STRESS, HIGH_STRESS) 
//          & Regression (Water Requirement Score, 0-100)

namespace EdgeML {
    // Hidden Layer 1 Weights (Input to Hidden)
    const float W1[4][5] = {
        {0.184584f, 0.206265f, 0.349277f, -0.130628f, 0.176563f},
        {0.215530f, 0.213284f, 0.063085f, -0.102476f, -0.119546f},
        {1.303350f, -1.001309f, -0.722563f, 0.044680f, -0.054519f},
        {0.009230f, 0.149269f, 0.035401f, -0.063841f, -0.067604f},
    };
    
    const float b1[5] = { -0.098281f, 0.675426f, 0.457003f, -0.000942f, -0.026442f };

    // Classification Branch Weights (Hidden to Class Output)
    const float W_class[5][3] = {
        {0.003714f, 0.060451f, -0.115525f},
        {0.107086f, 0.078150f, 0.058419f},
        {-0.334745f, -0.039598f, 0.101351f},
        {-0.004609f, 0.000022f, -0.010728f},
        {0.001026f, 0.082087f, -0.156896f},
    };
    
    const float b_class[3] = { 0.070242f, -0.123582f, 0.053340f };

    // Regression Branch Weights (Hidden to Reg Output)
    const float W_reg[5][1] = {
        {-1.319420f},
        {1.281627f},
        {0.886269f},
        {-0.003433f},
        {0.076565f},
    };
    
    const float b_reg[1] = { 0.108428f };

    // Forward Propagation logic executing at the Edge
    struct Prediction {
        int crop_health; // 0 = HEALTHY, 1 = MODERATE_STRESS, 2 = HIGH_STRESS
        float water_requirement_score; // 0.0 to 100.0
    };

    Prediction predict(float temp, float hum, float soilMoisture, float solarRadiation) {
        // 1. Normalize Inputs
        float x[4];
        x[0] = (temp - 15.0f) / 25.0f;
        x[1] = (hum - 30.0f) / 65.0f;
        x[2] = (soilMoisture - 5.0f) / 40.0f;
        x[3] = (solarRadiation - 200.0f) / 800.0f;

        // 2. Feed Hidden Layer (Matrix multiply + Bias + ReLU activation)
        float h[5];
        for (int j = 0; j < 5; j++) {
            float sum = b1[j];
            for (int i = 0; i < 4; i++) {
                sum += x[i] * W1[i][j];
            }
            h[j] = (sum > 0.0f) ? sum : 0.0f; // ReLU
        }

        // 3. Classification Outputs (Logits + Softmax prediction)
        float c_logits[3];
        for (int j = 0; j < 3; j++) {
            float sum = b_class[j];
            for (int i = 0; i < 5; i++) {
                sum += h[i] * W_class[i][j];
            }
            c_logits[j] = sum;
        }
        // Find argmax for classification
        int best_class = 0;
        float max_logit = c_logits[0];
        for (int j = 1; j < 3; j++) {
            if (c_logits[j] > max_logit) {
                max_logit = c_logits[j];
                best_class = j;
            }
        }

        // 4. Regression Output (Logit + Sigmoid activation)
        float r_logit = b_reg[0];
        for (int i = 0; i < 5; i++) {
            r_logit += h[i] * W_reg[i][0];
        }
        // Sigmoid mapping: 1 / (1 + exp(-x))
        float sigmoid_val = 1.0f / (1.0f + expf(-r_logit));
        float water_score = sigmoid_val * 100.0f;

        Prediction result;
        result.crop_health = best_class;
        result.water_requirement_score = water_score;
        return result;
    }
}
