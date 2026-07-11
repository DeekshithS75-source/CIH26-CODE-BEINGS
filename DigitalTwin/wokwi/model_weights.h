// Auto-generated Multi-Task Neural Network Weights for ESP32
// Inputs: [Temp_norm, Hum_norm, Soil_norm, Light_norm]
// Hidden Layer: 5 Neurons (ReLU)
// Outputs: Classification (3 classes: HEALTHY, WATER_STRESSED, HEAT_STRESSED) 
//          & Regression (Water Requirement Score, 0-100)

namespace EdgeML {
    // Hidden Layer 1 Weights (Input to Hidden)
    const float W1[4][5] = {
        {0.545429f, 0.060497f, -0.693818f, 0.133097f, -0.149546f},
        {0.098413f, -0.097127f, 0.449002f, 0.252202f, 0.191426f},
        {-1.498644f, -0.081558f, 0.472548f, 2.422718f, -3.349271f},
        {0.603241f, -0.120274f, -0.728705f, 0.312055f, -0.094436f},
    };
    
    const float b1[5] = { 0.892476f, 0.002763f, 0.893252f, 0.017805f, 1.713905f };

    // Classification Branch Weights (Hidden to Class Output)
    const float W_class[5][3] = {
        {-1.277239f, 1.221163f, -0.143669f},
        {-0.022999f, -0.029790f, 0.022740f},
        {1.008515f, -0.027912f, -1.055886f},
        {0.824754f, -1.754484f, 0.962464f},
        {-1.862173f, 2.651121f, -0.888691f},
    };
    
    const float b_class[3] = { 0.994984f, 0.115429f, -1.110413f };

    // Regression Branch Weights (Hidden to Reg Output)
    const float W_reg[5][1] = {
        {0.787875f},
        {0.089513f},
        {-0.331973f},
        {-1.173171f},
        {1.712711f},
    };
    
    const float b_reg[1] = { -0.429867f };

    // Forward Propagation logic executing at the Edge
    struct Prediction {
        int crop_health; // 0 = HEALTHY, 1 = WATER_STRESSED, 2 = HEAT_STRESSED
        float water_requirement_score; // 0.0 to 100.0
    };

    Prediction predict(float temp, float hum, float soil, float light) {
        // 1. Normalize Inputs
        float x[4];
        x[0] = (temp - 15.0f) / 30.0f;
        x[1] = (hum - 20.0f) / 70.0f;
        x[2] = soil / 100.0f;
        x[3] = light / 4095.0f;

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
