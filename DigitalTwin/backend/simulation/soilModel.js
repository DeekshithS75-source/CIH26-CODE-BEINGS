/**
 * Soil Moisture Model Simulation
 * Simulates soil moisture depletion (evaporation and crop consumption)
 * and soil moisture replenishment (active irrigation or rain).
 */

function calculateSoilMoisture(currentMoisture, irrigationActive, temperature, light, crop, weatherCondition) {
  let nextMoisture = currentMoisture;

  if (irrigationActive) {
    // Irrigation is ON: Soil moisture increases rapidly
    // Simulates an active watering system restoring moisture
    const irrigationRate = 6.0 + Math.random() * 2.0; // 6-8% increase per tick
    nextMoisture += irrigationRate;
  } else {
    // Irrigation is OFF: Moisture decreases due to transpiration and evaporation
    // Determine base consumption by crop type
    let cropConsumption = 0.4; // Default/Wheat
    if (crop === 'Tomato') {
      cropConsumption = 0.6;
    } else if (crop === 'Rice') {
      cropConsumption = 1.0; // Rice is highly water-intensive
    }

    // Environmental multipliers
    let evaporationFactor = 1.0;
    
    // Higher temperatures accelerate evaporation
    if (temperature > 35) {
      evaporationFactor = 1.8;
    } else if (temperature > 28) {
      evaporationFactor = 1.3;
    } else if (temperature < 20) {
      evaporationFactor = 0.7;
    }

    // High light (sunlight) increases transpiration/evaporation
    if (light > 3000) {
      evaporationFactor *= 1.3;
    } else if (light < 500) {
      evaporationFactor *= 0.5; // Nighttime reduces evaporation
    }

    // Rain replenishment
    if (weatherCondition === 'RAINY') {
      // Natural rain replenishes moisture by 3-5% per tick
      const rainRate = 3.0 + Math.random() * 2.0;
      nextMoisture += rainRate;
    } else {
      // Net depletion
      const totalDepletion = cropConsumption * evaporationFactor;
      nextMoisture -= totalDepletion;
    }
  }

  // Clamp moisture level between 0% and 100%
  nextMoisture = Math.max(0.0, Math.min(100.0, nextMoisture));

  // Return formatted float (1 decimal place)
  return parseFloat(nextMoisture.toFixed(1));
}

module.exports = {
  calculateSoilMoisture
};
