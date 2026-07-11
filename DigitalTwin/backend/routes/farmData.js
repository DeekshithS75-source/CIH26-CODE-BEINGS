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
    alert: zone.alert
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
    alert: zone.alert
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

module.exports = router;
