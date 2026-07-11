const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');
const simulator = require('./simulation/farmSimulator');
const farmRouter = require('./routes/farmData');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve API Routes
app.use('/api', farmRouter);

// Basic health check endpoint
app.get('/', (req, res) => {
  res.send('Smart Agriculture Digital Twin Simulator Backend is online.');
});

// ==========================================
// MQTT BROKER CLIENT INTEGRATION
// ==========================================
const MQTT_BROKER = 'mqtt://broker.hivemq.com';
console.log('🔌 Connecting to MQTT Broker...');
const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on('connect', () => {
  console.log(`================================================================`);
  console.log(`🔗 MQTT Broker connected successfully at: ${MQTT_BROKER}`);
  
  // Subscribe to control topics (ESP32 acts as the decider and publishes commands)
  mqttClient.subscribe('smartfarm/zones/+/control', (err) => {
    if (!err) {
      console.log('📡 Subscribed to: smartfarm/zones/+/control');
      console.log(`================================================================`);
    } else {
      console.error('Failed to subscribe to MQTT control topic:', err);
    }
  });
});

// Listen for incoming decisions from Wokwi ESP32
mqttClient.on('message', (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    const parts = topic.split('/');
    const zoneId = parts[2].toUpperCase(); // e.g. 'A'

    console.log(`[MQTT Command Received] Topic: ${topic} ->`, payload);

    const state = simulator.loadState();
    const zone = state.zones.find(z => z.zone_id === zoneId);

    if (zone) {
      let stateChanged = false;

      // 1. Actuate Irrigation State
      if (payload.irrigation !== undefined) {
        const isChanged = zone.irrigation !== payload.irrigation;
        zone.irrigation = payload.irrigation;
        if (isChanged) {
          simulator.addLog(`[MQTT ACTION] Zone ${zoneId} irrigation turned ${payload.irrigation ? 'ON' : 'OFF'} by ESP32 Edge Device`);
          stateChanged = true;
        }
      }

      // 2. Actuate Alarm Alerts
      if (payload.alert !== undefined) {
        const isChanged = zone.alert !== payload.alert;
        zone.alert = payload.alert;
        if (isChanged) {
          if (payload.alert !== 'NONE') {
            simulator.addLog(`[MQTT ALERT] Zone ${zoneId} raised status: ${payload.alert}`);
          } else {
            simulator.addLog(`[MQTT INFO] Zone ${zoneId} alert cleared`);
          }
          stateChanged = true;
        }
      }

      // 3. Update Crop Health Prediction from Edge ML Model
      if (payload.crop_health !== undefined) {
        zone.crop_health = payload.crop_health;
        stateChanged = true;
      }

      // 4. Update Water Requirement Prediction from Edge ML Model
      if (payload.water_requirement !== undefined) {
        zone.water_requirement = payload.water_requirement;
        stateChanged = true;
      }

      if (stateChanged) {
        simulator.saveState();
      }
    }
  } catch (err) {
    console.error('Error processing MQTT message:', err);
  }
});

// Run initial tick to set things up on boot
simulator.tickSimulation();

// Start simulation ticks: runs every 3000ms (3 seconds)
const TICK_INTERVAL_MS = 3000;
setInterval(() => {
  try {
    const updatedState = simulator.tickSimulation();
    const time = updatedState.simulation_time;
    
    // Log occasionally on the server console
    if (time.minute === 0) {
      console.log(`[Sim Tick] Time ${time.hour.toString().padStart(2, '0')}:00 - Temp: ${updatedState.weather.ambient_temperature}°C - Weather: ${updatedState.weather.condition}`);
    }

    // Publish telemetry for each zone to MQTT so Wokwi ESP32 can consume it
    updatedState.zones.forEach(zone => {
      const telemetryTopic = `smartfarm/zones/${zone.zone_id}/telemetry`;
      const telemetryData = {
        timestamp: `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`,
        zone_id: zone.zone_id,
        crop: zone.crop,
        temperature: zone.temperature,
        humidity: zone.humidity,
        soil_moisture: zone.soil_moisture,
        light: zone.light,
        irrigation: zone.irrigation ? 'ON' : 'OFF',
        alert: zone.alert
      };
      
      mqttClient.publish(telemetryTopic, JSON.stringify(telemetryData));
    });

  } catch (error) {
    console.error('Error during simulation loop execution:', error);
  }
}, TICK_INTERVAL_MS);

// Helper to detect language
function detectLanguage(text) {
  const hasMalayalam = /[\u0D00-\u0D7F]/.test(text);
  const hasKannada = /[\u0C80-\u0CFF]/.test(text);
  
  const mlKeywords = ["തക്കാളി", "വെള്ളം", "രോഗം", "കാലാവസ്ഥ", "മേഖല", "ചെടി", "എങ്ങനെ"];
  const knKeywords = ["ಬೆಳೆ", "ನೀರು", "ರೋಗ", "ಹೇಗಿದೆ", "ವಲಯ", "ಕೃಷಿ", "ತಾಪಮಾನ"];
  
  const textLower = text.toLowerCase();
  if (hasMalayalam || mlKeywords.some(k => textLower.includes(k))) return 'ml';
  if (hasKannada || knKeywords.some(k => textLower.includes(k))) return 'kn';
  return 'en';
}
function generateNlgResponse(zone, weather, lang, question) {
  const crop = zone.crop;
  const soil = zone.soil_moisture;
  const temp = zone.temperature;
  const hum = zone.humidity;
  const sprinkler = zone.irrigation;
  
  const questionLower = question.toLowerCase();
  const weatherKeys = ["weather", "climate", "temp", "temperature", "rain", "hot", "cold", "കാലാവസ്ഥ", "ചൂട്", "തണുപ്പ്", "മഴ", "ಹವಾಮಾನ", "ತಾಪಮಾನ", "ಮಳೆ"];
  const waterKeys = ["water", "irrigate", "sprinkler", "wet", "dry", "moisture", "വെള്ളം", "നനയ്ക്കുക", "ഈർപ്പം", "നീരു", "ತೇವಾಂಶ"];
  const diseaseKeys = ["disease", "health", "sick", "fungus", "pest", "safe", "രോഗം", "ചെടി", "കേട്", "സുരക്ഷിതം", "ಬೆಳೆ", "ರೋಗ", "ಉಪದ್ರವ", "ಸುರಕ್ಷಿತ"];
  
  let intent = "SUMMARY";
  if (weatherKeys.some(k => questionLower.includes(k))) intent = "WEATHER";
  else if (waterKeys.some(k => questionLower.includes(k))) intent = "WATER";
  else if (diseaseKeys.some(k => questionLower.includes(k))) intent = "DISEASE";
  
  const isDry = soil < 35;
  const isSaturated = soil > 70;
  const isHighRisk = (temp > 35 || hum > 80);
  
  // Translate Zone ID for Malayalam and Kannada speech
  const mlZoneId = zone.zone_id === 'A' ? 'എ' : (zone.zone_id === 'B' ? 'ബി' : 'സി');
  const knZoneId = zone.zone_id === 'A' ? 'ಎ' : (zone.zone_id === 'B' ? 'ಬಿ' : 'ಸಿ');
  
  if (lang === 'ml') {
    if (intent === 'WEATHER') {
      return `ഇപ്പോഴത്തെ കാലാവസ്ഥ ${weather.condition} ആണ്. അന്തരീക്ഷ ഊഷ്മാവ് ${temp} ഡിഗ്രി രേഖപ്പെടുത്തിയിട്ടുണ്ട്.`;
    } else if (intent === 'WATER') {
      const statusText = isDry ? "വളരെ കുറവാണ്" : (isSaturated ? "വളരെ കൂടുതലാണ്" : "ആവശ്യത്തിനുണ്ട്");
      const sprinklerText = sprinkler ? "ഓട്ടോമാറ്റിക് സ്പ്രിംഗ്ലർ ഇപ്പോൾ ഓൺ ആണ്." : "സ്പ്രിംഗ്ലർ പമ്പുകൾ ഇപ്പോൾ ഓഫ് ആണ്.";
      return `മേഖല ${mlZoneId} ലെ മണ്ണിലെ ഈർപ്പം ${soil} ശതമാനം ആണ്. ഇത് വിളകൾക്ക് ${statusText}. ${sprinklerText}`;
    } else if (intent === 'DISEASE') {
      const riskText = isHighRisk ? "വളരെ കൂടുതലാണ്. ഇലകൾ ചീയുന്നതിനെതിരെ പ്രതിരോധ നടപടികൾ എടുക്കുക." : "വളരെ കുറവാണ്. വിളകൾ സുരക്ഷിതമാണ്.";
      return `മേഖല ${mlZoneId} ലെ ചൂടും ഈർപ്പവും വിലയിരുത്തുമ്പോൾ വിളകൾക്ക് രോഗബാധ ഉണ്ടാകാനുള്ള സാധ്യത ${riskText}`;
    } else {
      const cropAdvice = isDry ? `മേഖല ${mlZoneId} ലെ ${crop} വിളകൾ വരണ്ട അവസ്ഥയിലാണ്. മണ്ണിലെ ഈർപ്പം ${soil} ശതമാനം ആണ്.` : `മേഖല ${mlZoneId} ലെ വിളകൾ ആരോഗ്യത്തോടെയിരിക്കുന്നു. ഈർപ്പം ${soil} ശതമാനം ആണ്.`;
      const actionAdvice = sprinkler ? "ഓട്ടോമാറ്റിക് സ്പ്രിംഗ്ലർ ഇപ്പോൾ പ്രവർത്തിക്കുന്നുണ്ട്." : "വാൽവ് ഇപ്പോൾ ഓഫ് ആണ്.";
      return `${cropAdvice} ${actionAdvice}`;
    }
  } else if (lang === 'kn') {
    if (intent === 'WEATHER') {
      return `ಸದ್ಯದ ಹವಾಮಾನವು ${weather.condition} ಆಗಿದೆ. ತಾಪಮಾನವು ${temp} ಡಿಗ್ರಿ ಸೆಲ್ಸಿಯಸ್ ದಾಖಲಾಗಿದೆ.`;
    } else if (intent === 'WATER') {
      const statusText = isDry ? "ಅತ್ಯಂತ ಕಡಿಮೆಯಿದೆ" : (isSaturated ? "ಅತಿಯಾಗಿದೆ" : "ಸೂಕ್ತವಾಗಿದೆ");
      const sprinklerText = sprinkler ? "ಸ್ಪ್ರಿಂಕ್ಲರ್ ಪಂಪ್ ಈಗ ಚಾಲನೆಯಲ್ಲಿದೆ." : "ಸ್ಪ್ರಿಂಕ್ಲರ್ ವಾಲ್ವ್ ಈಗ ಬಂದ್ ಆಗಿದೆ.";
      return `ವಲಯ ${knZoneId} ರ ಮಣ್ಣಿನ ತೇವಾಂಶವು ${soil} ಶೇಕಡಾ ಆಗಿದೆ. ಇದು ಬೆಳೆಗಳಿಗೆ ${statusText}. ${sprinklerText}`;
    } else if (intent === 'DISEASE') {
      const riskText = isHighRisk ? "ಹೆಚ್ಚಾಗಿದೆ. ಶಿಲೀಂಧ್ರ ಹರಡದಂತೆ ಮುನ್ನೆಚ್ಚರಿಕೆ ವಹಿಸಿ." : "ಅತ್ಯಂತ ಕಡಿಮೆಯಿದೆ. ಬೆಳೆಗಳು ಸುರಕ್ಷಿತವಾಗಿವೆ.";
      return `ವಲಯ ${knZoneId} ರ ತಾಪಮಾನ ಮತ್ತು ಆರ್ದ್ರತೆಯ ಆಧಾರದ ಮೇಲೆ ಬೆಳೆಗಳಿಗೆ ರೋಗ ತಗಲುವ ಅಪಾಯ ${riskText}`;
    } else {
      const cropAdvice = isDry ? `ವಲಯ ${knZoneId} ನಲ್ಲಿರುವ ${crop} ಬೆಳೆ ಒಣಗುತ್ತಿದೆ. ಮಣ್ಣಿನ ತೇವಾಂಶ ${soil} ಶೇಕಡಾ ಆಗಿದೆ.` : `ವಲಯ ${knZoneId} ರ ಬೆಳೆಗಳು ಆರೋಗ್ಯಕರವಾಗಿದ್ದು, ಮಣ್ಣಿನ ತೇವಾಂಶ ಸೂಕ್ತವಾಗಿದೆ.`;
      const actionAdvice = sprinkler ? "ಸ್ಪ್ರಿಂಕ್ಲರ್ ಪಂಪ್ ಈಗ ಚಾಲನೆಯಲ್ಲಿದೆ." : "ಸ್ಪ್ರಿಂಕ್ಲರ್ ವಾಲ್ವ್ ಈಗ ಬಂದ್ ಆಗಿದೆ.";
      return `${cropAdvice} ${actionAdvice}`;
    }
  } else {
    if (intent === 'WEATHER') {
      return `The current weather conditions are {weather.condition}. The local temperature is ${temp} degrees.`;
    } else if (intent === 'WATER') {
      const statusText = isDry ? "critically dry" : (isSaturated ? "waterlogged" : "optimal");
      const sprinklerText = sprinkler ? "The automated sprinkler pump is active." : "The irrigation system is standby.";
      return `Soil moisture in Zone ${zone.zone_id} is ${soil} percent, which is ${statusText} for your ${crop}. ${sprinklerText}`;
    } else if (intent === 'DISEASE') {
      const riskText = isHighRisk ? "high risk of fungal pathogens. Check crop leaves for spots." : "low risk. Crop leaves show normal chlorophyll health.";
      return `Based on temperature (${temp}C) and humidity (${hum}%) in Zone ${zone.zone_id}, there is a ${riskText}`;
    } else {
      const cropAdvice = isDry ? `Your ${crop} crop in Zone ${zone.zone_id} is water-stressed with critical {soil} percent moisture.` : `Your ${crop} crop in Zone ${zone.zone_id} is healthy, and the soil moisture is stable at ${soil} percent.`;
      const actionAdvice = sprinkler ? "The automated sprinkler pump is active." : "The irrigation system is standby.";
      return `${cropAdvice} ${actionAdvice}`;
    }
  }
}

// API endpoint for voice-recognition chat integration
app.get('/api/voice-chat', async (req, res) => {
  const query = req.query.query || "";
  if (!query) {
    return res.json({ response: "No query text provided." });
  }

  const state = simulator.loadState();
  const queryLower = query.toLowerCase();

  // Dynamically detect which zone the user is asking about
  let selectedZoneId = 'A'; // Default
  
  if (queryLower.includes('zone b') || queryLower.includes('field b') || queryLower.includes('crop b') || queryLower.includes('ബി') || queryLower.includes('വಲಯ ബി')) {
    selectedZoneId = 'B';
  } else if (queryLower.includes('zone c') || queryLower.includes('field c') || queryLower.includes('crop c') || queryLower.includes('സി') || queryLower.includes('വಲಯ സി')) {
    selectedZoneId = 'C';
  }

  const zone = state.zones.find(z => z.zone_id === selectedZoneId) || state.zones[0];
  const weather = state.weather;
  const lang = detectLanguage(query);

  const contextStr = `
Current Farm State:
- Crop Type: ${zone.crop} (Zone ${zone.zone_id})
- Soil Moisture: ${zone.soil_moisture}%
- Local Temperature: ${zone.temperature} C
- Relative Humidity: ${zone.humidity}%
- Irrigation State: ${zone.irrigation ? 'ON' : 'OFF'}
- Active Warning: ${zone.alert}
- General Climate: ${weather.condition}
`;

  let aiResponse = null;

  // Try Local Ollama model first
  try {
    const prompt = `
You are a helpful, professional AI Agronomist chatbot. 
Analyze the live sensor data of the farm and answer the farmer's question.
If the farmer asks in Malayalam, reply in Malayalam.
If the farmer asks in Kannada, reply in Kannada.
Otherwise, reply in English.
IMPORTANT: Respond immediately and directly with the final answer. Do NOT output any thinking, reasoning, or <think> tags.
Keep your response concise (maximum 3 sentences) and highly practical.

${contextStr}

Farmer Question: "${query}"
AI Agronomist Answer:`;

    const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen3:4b',
        prompt: prompt,
        stream: false
      }),
      signal: AbortSignal.timeout(3000)
    });

    if (ollamaResponse.status === 200) {
      const data = await ollamaResponse.json();
      aiResponse = data.response.trim();
    }
  } catch (err) {
    console.log('[API Voice Chat] Local Ollama not available. Using local NLG...');
  }

  // Fallback to NLG
  if (!aiResponse) {
    aiResponse = generateNlgResponse(zone, weather, lang, query);
  }

  console.log(`[Voice Chat API] Q: "${query}" (${lang.toUpperCase()}) -> A: "${aiResponse}"`);
  res.json({
    success: true,
    transcription: query,
    language: lang,
    response: aiResponse
  });
});

// Start Listening HTTP Server for Dashboard Polling
app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`🌱 SMART AGRICULTURE DIGITAL TWIN SIMULATOR BACKEND RUNNING`);
  console.log(`================================================================`);
  console.log(`Express HTTP Port: ${PORT}`);
  console.log(`MQTT Server:       ${MQTT_BROKER}`);
  console.log(`MQTT Telemetry:    smartfarm/zones/:zoneId/telemetry`);
  console.log(`MQTT Controls:     smartfarm/zones/:zoneId/control`);
  console.log(`Simulation Loop:   Running every ${TICK_INTERVAL_MS / 1000} seconds`);
  console.log(`================================================================`);
});
