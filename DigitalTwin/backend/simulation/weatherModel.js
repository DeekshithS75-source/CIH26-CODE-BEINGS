/**
 * Weather Model Simulation
 * Simulates temperature, humidity, and light intensity based on the time of day and current weather conditions.
 */

// Helper to map hour to a smooth day phase name
function getDayPhase(hour) {
  if (hour >= 5 && hour < 11) return 'Morning';
  if (hour >= 11 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 21) return 'Evening';
  return 'Night';
}

function calculateWeather(hour, condition) {
  // Convert hour to radians for smooth day cycle (0 to 2*PI over 24 hours)
  // Shift peak by 12 hours so maximum is at solar noon (12:00)
  const angle = ((hour - 6) / 24) * 2 * Math.PI;
  const sinVal = Math.sin(angle); // -1 at 00:00, 0 at 06:00, 1 at 12:00, 0 at 18:00

  // 1. Light Model (Simulate day/night cycle, 0 to 4095 range)
  let baseLight = 0;
  if (hour >= 6 && hour <= 18) {
    // Daytime light curve: peaks at 12:00
    baseLight = 500 + Math.sin(((hour - 6) / 12) * Math.PI) * (4095 - 500);
  } else {
    // Nighttime: dim light (stars, moon, sensor noise)
    baseLight = 10 + Math.random() * 40;
  }

  // Adjust light for rainy/cloudy conditions
  let light = Math.round(baseLight);
  if (condition === 'RAINY') {
    light = Math.round(light * 0.3); // Heavy clouds block 70% light
  } else if (condition === 'CLOUDY') {
    light = Math.round(light * 0.6); // Clouds block 40% light
  }
  // Clamp light values
  light = Math.max(0, Math.min(4095, light));

  // 2. Temperature Model (Range: 15°C - 45°C)
  // Temperature peaks slightly after light peaks (lag effect, around 14:30)
  const tempAngle = ((hour - 8.5) / 24) * 2 * Math.PI;
  const tempSin = Math.sin(tempAngle);
  
  // Base daily cycle from 17°C to 38°C
  let baseTemp = 27.5 + tempSin * 10.5;

  // Add a small random noise (+/- 0.5°C)
  baseTemp += (Math.random() - 0.5) * 1.0;

  // Weather condition adjustments
  if (condition === 'RAINY') {
    baseTemp -= 6.0; // Rain cools the environment
  } else if (condition === 'CLOUDY') {
    baseTemp -= 2.0;
  } else if (condition === 'HEATWAVE') {
    baseTemp += 6.0; // Heatwave pushes peak temps past 40°C
  }

  const temperature = parseFloat(Math.max(15.0, Math.min(45.0, baseTemp)).toFixed(1));

  // 3. Humidity Model (Range: 20% - 90%)
  // Humidity is inversely proportional to temperature
  // High temp -> lower humidity; Low temp -> higher humidity
  let baseHumidity = 55.0 - tempSin * 25.0; // Inverted temp curve

  // Add random noise (+/- 2%)
  baseHumidity += (Math.random() - 0.5) * 4.0;

  // Weather adjustments
  if (condition === 'RAINY') {
    baseHumidity = 85.0 + Math.random() * 5.0; // Rainy is humid (85-90%)
  } else if (condition === 'CLOUDY') {
    baseHumidity += 15.0;
  }

  const humidity = parseFloat(Math.max(20.0, Math.min(90.0, baseHumidity)).toFixed(1));

  return {
    hour,
    day_phase: getDayPhase(hour),
    temperature,
    humidity,
    light
  };
}

module.exports = {
  calculateWeather,
  getDayPhase
};
