const fs = require('fs');
const path = require('path');
const { calculateWeather } = require('./weatherModel');
const { calculateSoilMoisture } = require('./soilModel');

const STATE_FILE_PATH = path.join(__dirname, '../data/farmState.json');

// In-memory cache of the state
let currentState = null;

// When ESP32 pushes live sensor data, pause simulation overrides for that zone
const esp32LiveZones = {};
const ESP32_LIVE_TTL_MS = 15000;

// Read state from disk or initialize it if cache is empty
function loadState() {
  if (currentState) return currentState;

  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const fileData = fs.readFileSync(STATE_FILE_PATH, 'utf8');
      currentState = JSON.parse(fileData);
      return currentState;
    }
  } catch (error) {
    console.error('Error loading farm state file:', error);
  }

  // Fallback state if file cannot be read
  currentState = {
    farm_id: "SMART_FARM_001",
    simulation_time: { hour: 8, minute: 0, day_phase: "Morning" },
    weather: { condition: "SUNNY", ambient_temperature: 22.0, ambient_humidity: 60.0 },
    zones: [
      { zone_id: "A", crop: "Tomato", temperature: 22.5, humidity: 58.0, soil_moisture: 80.0, light: 800, irrigation: false, alert: "NONE" },
      { zone_id: "B", crop: "Rice", temperature: 21.0, humidity: 70.0, soil_moisture: 85.0, light: 750, irrigation: false, alert: "NONE" },
      { zone_id: "C", crop: "Wheat", temperature: 22.0, humidity: 55.0, soil_moisture: 75.0, light: 800, irrigation: false, alert: "NONE" }
    ],
    logs: [{ timestamp: "08:00:00", message: "Digital Twin Farm Simulation initialized." }]
  };
  saveState();
  return currentState;
}

// Save state to disk
function saveState() {
  if (!currentState) return;
  try {
    // Ensure data directory exists
    const dir = path.dirname(STATE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(currentState, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving farm state file:', error);
  }
}

// Add a log entry with local time format
function addLog(message) {
  if (!currentState) loadState();
  
  const now = new Date();
  const timestamp = now.toTimeString().split(' ')[0]; // HH:MM:SS
  
  currentState.logs.unshift({ timestamp, message });
  
  // Keep logs at a reasonable size (max 50)
  if (currentState.logs.length > 50) {
    currentState.logs.pop();
  }
}

// Update weather conditions (can be triggered from dashboard)
function setWeatherCondition(condition) {
  if (!currentState) loadState();
  
  const validConditions = ['SUNNY', 'CLOUDY', 'RAINY', 'HEATWAVE'];
  if (validConditions.includes(condition)) {
    currentState.weather.condition = condition;
    addLog(`Weather condition manually set to ${condition}`);
    saveState();
    return true;
  }
  return false;
}

// Perform a single simulation step
function tickSimulation() {
  const state = loadState();

  // 1. Advance simulation time
  // Each tick represents 15 minutes of farm time
  let { hour, minute } = state.simulation_time;
  minute += 15;
  if (minute >= 60) {
    hour += 1;
    minute = 0;
  }
  if (hour >= 24) {
    hour = 0;
  }
  state.simulation_time.hour = hour;
  state.simulation_time.minute = minute;

  // Format visual hour:minute string
  const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

  // 2. Calculate ambient weather details
  const ambientWeather = calculateWeather(hour + minute / 60, state.weather.condition);
  state.simulation_time.day_phase = ambientWeather.day_phase;
  state.weather.ambient_temperature = ambientWeather.temperature;
  state.weather.ambient_humidity = ambientWeather.humidity;

  // Log phase transitions
  if (minute === 0 && (hour === 5 || hour === 11 || hour === 17 || hour === 21)) {
    addLog(`Transitioning into ${ambientWeather.day_phase} phase. Time is ${timeStr}.`);
  }

  // 3. Update each zone (skip zones fed by live ESP32 telemetry)
  state.zones = state.zones.map(zone => {
    const liveUntil = esp32LiveZones[zone.zone_id];
    if (liveUntil && Date.now() < liveUntil) {
      return zone;
    }
    // Crop-specific microclimate offsets
    let tempOffset = 0;
    let humOffset = 0;
    let lightOffset = 0;

    if (zone.crop === 'Tomato') {
      tempOffset = 0.5;
      humOffset = -2.0;
    } else if (zone.crop === 'Rice') {
      tempOffset = -1.0;
      humOffset = 8.0; // Wetland humdity is higher
      lightOffset = -50; // Denser canopy
    } else if (zone.crop === 'Wheat') {
      tempOffset = 0.0;
      humOffset = -4.0;
    }

    // Apply microclimate offsets
    const zoneTemp = parseFloat((ambientWeather.temperature + tempOffset).toFixed(1));
    const zoneHum = parseFloat((ambientWeather.humidity + humOffset).toFixed(1));
    const zoneLight = Math.max(0, ambientWeather.light + lightOffset);

    // Run soil moisture update
    const previousMoisture = zone.soil_moisture;
    const nextMoisture = calculateSoilMoisture(
      previousMoisture,
      zone.irrigation,
      zoneTemp,
      zoneLight,
      zone.crop,
      state.weather.condition
    );

    // Log moisture levels dipping below thresholds
    if (previousMoisture >= 30 && nextMoisture < 30 && !zone.irrigation) {
      addLog(`[WARNING] Zone ${zone.zone_id} (${zone.crop}) soil moisture critically dry: ${nextMoisture}%!`);
    }

    return {
      ...zone,
      temperature: zoneTemp,
      humidity: zoneHum,
      light: zoneLight,
      soil_moisture: nextMoisture
    };
  });

  saveState();
  return state;
}

// Accept live sensor readings from Wokwi ESP32 and map them to a farm zone
function ingestEsp32Telemetry(zoneId, telemetry) {
  const state = loadState();
  const id = zoneId.toUpperCase();
  const zone = state.zones.find(z => z.zone_id === id);

  if (!zone) {
    return { ok: false, error: `Zone ${id} not found` };
  }

  if (telemetry.temperature !== undefined) zone.temperature = parseFloat(Number(telemetry.temperature).toFixed(1));
  if (telemetry.humidity !== undefined) zone.humidity = parseFloat(Number(telemetry.humidity).toFixed(1));
  if (telemetry.soil_moisture !== undefined) zone.soil_moisture = parseFloat(Number(telemetry.soil_moisture).toFixed(1));
  if (telemetry.light !== undefined) zone.light = Math.round(Number(telemetry.light));

  esp32LiveZones[id] = Date.now() + ESP32_LIVE_TTL_MS;

  if (Math.random() < 0.15) {
    addLog(`[ESP32] Live telemetry received for Zone ${id}`);
  }

  saveState();
  return { ok: true, zone };
}

module.exports = {
  loadState,
  saveState,
  addLog,
  setWeatherCondition,
  tickSimulation,
  ingestEsp32Telemetry
};
