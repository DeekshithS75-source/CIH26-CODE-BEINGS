require('dotenv').config();
const express = require('express');
const router = express.Router();
const simulator = require('../simulation/farmSimulator');

// Helper to format simulated time
function getSimulatedTimeStr(timeObj) {
  return `${timeObj.hour.toString().padStart(2, '0')}:${timeObj.minute.toString().padStart(2, '0')}`;
}

/**
 * GET /api/farm-data
 * Returns the FLAT JSON for the primary zone (Zone A - Tomato) by default.
 * Directly compatible with ESP32 HTTPClient.
 * Supports query param `?zone=B` or `?zone=C` to get other zones in flat format.
 */
router.get('/farm-data', (req, res) => {
  const state = simulator.loadState();
  const zoneId = (req.query.zone || 'A').toUpperCase();
  
  const zone = state.zones.find(z => z.zone_id === zoneId);
  if (!zone) {
    return res.status(404).json({ error: `Zone ${zoneId} not found` });
  }

  // Record that ESP32/client requested data
  // Only log occasionally to avoid flooding the log drawer
  if (Math.random() < 0.2) {
    simulator.addLog(`Data read request received for Zone ${zoneId}`);
    simulator.saveState();
  }

  // Return the exact flat JSON structure requested
  res.json({
    timestamp: getSimulatedTimeStr(state.simulation_time),
    zone_id: zone.zone_id,
    crop: zone.crop,
    temperature: zone.temperature,
    humidity: zone.humidity,
    soil_moisture: zone.soil_moisture,
    light: zone.light,
    irrigation: zone.irrigation ? "ON" : "OFF",
    alert: zone.alert,
    barometric_pressure: state.weather.barometric_pressure,
    battery: zone.battery,
    battery_capacity_mah: zone.battery_capacity_mah,
    current_draw_ma: zone.current_draw_ma,
    battery_time_remaining_hours: zone.battery_time_remaining_hours,
    crop_health: zone.crop_health || "HEALTHY",
    water_requirement: zone.water_requirement || 0.0,
    weather_forecast: zone.weather_forecast || "STABLE"
  });
});

/**
 * GET /api/farm-data/all
 * Returns the FULL digital twin state (all zones, simulation time, weather, and activity logs).
 * Used by the frontend dashboard.
 */
router.get('/farm-data/all', (req, res) => {
  const state = simulator.loadState();
  res.json(state);
});

/**
 * GET /api/farm-data/zone/:zoneId
 * Returns flat JSON for a specific zone.
 */
router.get('/farm-data/zone/:zoneId', (req, res) => {
  const state = simulator.loadState();
  const zoneId = req.params.zoneId.toUpperCase();
  
  const zone = state.zones.find(z => z.zone_id === zoneId);
  if (!zone) {
    return res.status(404).json({ error: `Zone ${zoneId} not found` });
  }

  res.json({
    timestamp: getSimulatedTimeStr(state.simulation_time),
    zone_id: zone.zone_id,
    crop: zone.crop,
    temperature: zone.temperature,
    humidity: zone.humidity,
    soil_moisture: zone.soil_moisture,
    light: zone.light,
    irrigation: zone.irrigation ? "ON" : "OFF",
    alert: zone.alert,
    barometric_pressure: state.weather.barometric_pressure,
    battery: zone.battery,
    battery_capacity_mah: zone.battery_capacity_mah,
    current_draw_ma: zone.current_draw_ma,
    battery_time_remaining_hours: zone.battery_time_remaining_hours,
    crop_health: zone.crop_health || "HEALTHY",
    water_requirement: zone.water_requirement || 0.0,
    weather_forecast: zone.weather_forecast || "STABLE"
  });
});

/**
 * POST /api/zone/:zoneId/irrigation
 * ESP32 or Dashboard command to turn irrigation ON/OFF for a specific zone.
 * Body payload: { "irrigation": true/false }
 */
router.post('/zone/:zoneId/irrigation', (req, res) => {
  const { zoneId } = req.params;
  const { irrigation } = req.body;

  if (irrigation === undefined) {
    return res.status(400).json({ error: "Missing 'irrigation' boolean in request body." });
  }

  const state = simulator.loadState();
  const zone = state.zones.find(z => z.zone_id === zoneId.toUpperCase());

  if (!zone) {
    return res.status(404).json({ error: `Zone ${zoneId} not found` });
  }

  const isChanged = zone.irrigation !== irrigation;
  zone.irrigation = irrigation;

  if (isChanged) {
    const origin = req.headers['user-agent']?.includes('ESP32') ? 'ESP32 Edge Device' : 'Dashboard Controller';
    simulator.addLog(`[ACTION] Irrigation for Zone ${zone.zone_id} (${zone.crop}) turned ${irrigation ? 'ON' : 'OFF'} by ${origin}`);
  }

  simulator.saveState();
  res.json({ success: true, zone_id: zone.zone_id, irrigation: zone.irrigation });
});

/**
 * POST /api/zone/:zoneId/alert
 * ESP32 command to trigger/clear warning alerts.
 * Body payload: { "alert": "HEAT_WARNING" | "NONE" }
 */
router.post('/zone/:zoneId/alert', (req, res) => {
  const { zoneId } = req.params;
  const { alert } = req.body;

  if (!alert) {
    return res.status(400).json({ error: "Missing 'alert' string in request body." });
  }

  const state = simulator.loadState();
  const zone = state.zones.find(z => z.zone_id === zoneId.toUpperCase());

  if (!zone) {
    return res.status(404).json({ error: `Zone ${zoneId} not found` });
  }

  const isChanged = zone.alert !== alert;
  zone.alert = alert;

  if (isChanged) {
    if (alert !== 'NONE') {
      simulator.addLog(`[ALERT] Zone ${zone.zone_id} raised status: ${alert}`);
    } else {
      simulator.addLog(`[INFO] Zone ${zone.zone_id} alert cleared`);
    }
  }

  simulator.saveState();
  res.json({ success: true, zone_id: zone.zone_id, alert: zone.alert });
});

/**
 * POST /api/trigger-mode
 * Toggle between AUTOMATED and CONFIRMATION mode.
 * Body payload: { "mode": "AUTOMATED" | "CONFIRMATION" }
 */
router.post('/trigger-mode', (req, res) => {
  const { mode } = req.body;
  if (mode !== 'AUTOMATED' && mode !== 'CONFIRMATION') {
    return res.status(400).json({ error: "Invalid mode. Must be 'AUTOMATED' or 'CONFIRMATION'." });
  }

  const state = simulator.loadState();
  state.smart_trigger_mode = mode;
  simulator.addLog(`[CONFIG] Smart Trigger Mode updated to ${mode}`);
  simulator.saveState();

  // If we change back to automated, clear any pending water alert
  if (mode === 'AUTOMATED') {
    state.zones.forEach(z => {
      if (z.alert === 'NEEDS_WATER') z.alert = 'NONE';
    });
    simulator.saveState();
  }

  res.json({ success: true, smart_trigger_mode: state.smart_trigger_mode });
});

// Function to fetch weather forecast from OpenWeatherMap API
async function getRealTimeWeather() {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey || apiKey === 'your_api_key_here') {
      return { online: false }; // Fallback to local Edge ML forecast if key is not configured yet
    }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 1500); // 1.5s timeout for fast response

    const lat = process.env.FARM_LATITUDE || '12.9716';
    const lon = process.env.FARM_LONGITUDE || '77.5946';
    const baseUrl = process.env.WEATHER_API_URL || 'https://api.openweathermap.org/data/2.5/weather';
    const url = `${baseUrl}?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);

    if (!response.ok) throw new Error('OpenWeather API returned error status');
    const data = await response.json();
    
    const weatherId = data.weather?.[0]?.id;
    if (weatherId === undefined) return { online: false };

    let forecast = 'STABLE';
    // OpenWeather weather codes: 2xx = Thunderstorm, 3xx = Drizzle, 5xx = Rain
    if (weatherId >= 200 && weatherId < 300) {
      forecast = 'STORM_ALERT';
    } else if ((weatherId >= 300 && weatherId < 400) || (weatherId >= 500 && weatherId < 600)) {
      forecast = 'RAIN_COMING';
    }

    return {
      online: true,
      forecast,
      temp: data.main?.temp,
      humidity: data.main?.humidity,
      rain: weatherId >= 200 && weatherId < 600
    };
  } catch (err) {
    return { online: false };
  }
}

/**
 * GET /api/weather
 * Returns the current weather and forecast.
 * Falls back to local simulated Edge ML prediction if the external API is offline.
 */
router.get('/weather', async (req, res) => {
  const state = simulator.loadState();
  const apiWeather = await getRealTimeWeather();
  
  const weatherSource = apiWeather.online ? 'REAL_TIME_API' : 'EDGE_ML_FALLBACK';
  
  // Use first zone (Zone A) as the reference for simulated Edge ML forecast fallback
  const fallbackForecast = state.zones[0]?.weather_forecast || 'STABLE';
  const finalForecast = apiWeather.online ? apiWeather.forecast : fallbackForecast;

  res.json({
    condition: state.weather.condition,
    ambient_temperature: state.weather.ambient_temperature,
    ambient_humidity: state.weather.ambient_humidity,
    barometric_pressure: state.weather.barometric_pressure,
    api_temperature: apiWeather.online ? apiWeather.temp : state.weather.ambient_temperature,
    api_humidity: apiWeather.online ? apiWeather.humidity : state.weather.ambient_humidity,
    api_rain: apiWeather.online ? apiWeather.rain : (state.weather.condition === 'RAINY' || state.weather.condition === 'STORM'),
    forecast: finalForecast,
    source: weatherSource,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/weather
 * Dashboard command to change the simulated weather condition.
 * Body payload: { "condition": "SUNNY" | "CLOUDY" | "RAINY" | "HEATWAVE" }
 */
router.post('/weather', (req, res) => {
  const { condition } = req.body;
  if (!condition) {
    return res.status(400).json({ error: "Missing 'condition' in request body." });
  }

  const success = simulator.setWeatherCondition(condition);
  if (success) {
    res.json({ success: true, condition });
  } else {
    res.status(400).json({ error: "Invalid weather condition. Must be SUNNY, CLOUDY, RAINY, or HEATWAVE." });
  }
});

/**
 * POST /api/esp32/telemetry
 * Wokwi ESP32 pushes live sensor readings here.
 * Body: { "zone_id": "A", "temperature": 25.1, "humidity": 60, "soil_moisture": 45, "light": 512 }
 */
router.post('/esp32/telemetry', (req, res) => {
  const zoneId = (req.body.zone_id || 'A').toUpperCase();
  const result = simulator.ingestEsp32Telemetry(zoneId, req.body);

  if (!result.ok) {
    return res.status(404).json({ error: result.error });
  }

  res.json({
    success: true,
    message: 'Telemetry ingested',
    zone: {
      zone_id: result.zone.zone_id,
      temperature: result.zone.temperature,
      humidity: result.zone.humidity,
      soil_moisture: result.zone.soil_moisture,
      light: result.zone.light
    }
  });
});

/**
 * GET /api/weather/predict-tomorrow
 * Predicts tomorrow's weather conditions and crop outcomes (crop health, irrigation) for a zone.
 * Query param: `?zone=A` (defaults to A).
 */
router.get('/weather/predict-tomorrow', (req, res) => {
  const zoneId = (req.query.zone || 'A').toUpperCase();
  const prediction = simulator.predictTomorrowOutcome(zoneId);
  if (!prediction) {
    return res.status(404).json({ error: `Could not calculate prediction for Zone ${zoneId}` });
  }
  res.json(prediction);
});

module.exports = router;
