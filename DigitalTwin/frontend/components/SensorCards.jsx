import React from 'react';
import { Thermometer, Droplets, Sprout, Sun, AlertTriangle, RefreshCw } from 'lucide-react';

export default function SensorCards({ zone }) {
  if (!zone) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
        Select a zone to view sensor data
      </div>
    );
  }

  const { temperature, humidity, soil_moisture, light, irrigation, alert, crop } = zone;

  const isIrrigationOn = irrigation === 'ON' || irrigation === true;
  const isHeatAlert = alert === 'HEAT_WARNING' || temperature > 38;
  const isDry = soil_moisture < 30;

  // Compute status messages and colors
  const moistureStatus = isIrrigationOn 
    ? { text: 'Watering Active', class: 'badge-blue', glow: 'var(--water-glow)' }
    : isDry 
      ? { text: 'Critically Dry', class: 'badge-red', glow: 'var(--danger-glow)' }
      : { text: 'Optimal Moisture', class: 'badge-green', glow: 'var(--primary-glow)' };

  const tempStatus = isHeatAlert
    ? { text: 'Heat Warning', class: 'badge-red', glow: 'var(--danger-glow)' }
    : temperature > 30
      ? { text: 'Warm', class: 'badge-yellow', glow: 'var(--sun-glow)' }
      : { text: 'Normal', class: 'badge-green', glow: 'var(--primary-glow)' };

  const lightStatus = light > 3000
    ? { text: 'Full Sun', class: 'badge-yellow' }
    : light > 1000
      ? { text: 'Partial Sun', class: 'badge-green' }
      : light > 100
        ? { text: 'Overcast / Low Light', class: 'badge-blue' }
        : { text: 'Dark / Night', class: 'badge-blue' };

  return (
    <div className="sensor-cards-grid" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '20px',
      marginBottom: '24px'
    }}>
      {/* Temperature Card */}
      <div className="glass-card sensor-card" style={{
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isHeatAlert ? '0 0 20px rgba(239, 68, 68, 0.15)' : 'none',
        borderColor: isHeatAlert ? 'var(--danger)' : 'var(--border-color)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>Temperature</span>
          <div style={{
            background: isHeatAlert ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            padding: '8px',
            borderRadius: '10px',
            color: isHeatAlert ? 'var(--danger)' : 'var(--text-secondary)'
          }}>
            <Thermometer size={20} className={isHeatAlert ? 'animate-pulse' : ''} />
          </div>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <span style={{ fontSize: '2.25rem', fontWeight: '700', color: isHeatAlert ? 'var(--danger)' : 'var(--text-primary)' }}>
            {temperature}°C
          </span>
        </div>
        <div className={`badge ${tempStatus.class}`}>
          {tempStatus.text}
        </div>
      </div>

      {/* Humidity Card */}
      <div className="glass-card sensor-card" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>Humidity</span>
          <div style={{
            background: 'rgba(14, 165, 233, 0.12)',
            padding: '8px',
            borderRadius: '10px',
            color: 'var(--water)'
          }}>
            <Droplets size={20} />
          </div>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <span style={{ fontSize: '2.25rem', fontWeight: '700' }}>
            {humidity}%
          </span>
        </div>
        <div className="badge badge-blue">
          Ambient Air
        </div>
      </div>

      {/* Soil Moisture Card */}
      <div className="glass-card sensor-card" style={{
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isIrrigationOn 
          ? '0 0 20px rgba(14, 165, 233, 0.15)' 
          : isDry 
            ? '0 0 20px rgba(239, 68, 68, 0.15)' 
            : 'none',
        borderColor: isIrrigationOn 
          ? 'var(--water)' 
          : isDry 
            ? 'var(--danger)' 
            : 'var(--border-color)',
        animation: isIrrigationOn ? 'pulse-water-card 2s infinite' : 'none'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>Soil Moisture</span>
          <div style={{
            background: isIrrigationOn ? 'rgba(14, 165, 233, 0.15)' : 'rgba(16, 185, 129, 0.12)',
            padding: '8px',
            borderRadius: '10px',
            color: isIrrigationOn ? 'var(--water)' : 'var(--primary)'
          }}>
            {isIrrigationOn ? (
              <RefreshCw size={20} style={{ animation: 'spin 2s linear infinite' }} />
            ) : (
              <Sprout size={20} />
            )}
          </div>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <span style={{ fontSize: '2.25rem', fontWeight: '700', color: isDry && !isIrrigationOn ? 'var(--danger)' : 'var(--text-primary)' }}>
            {soil_moisture}%
          </span>
        </div>
        <div className={`badge ${moistureStatus.class}`}>
          {moistureStatus.text}
        </div>
      </div>

      {/* Light Intensity Card */}
      <div className="glass-card sensor-card" style={{ position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '500' }}>Solar Intensity</span>
          <div style={{
            background: 'rgba(234, 179, 8, 0.12)',
            padding: '8px',
            borderRadius: '10px',
            color: 'var(--sun)'
          }}>
            <Sun size={20} />
          </div>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <span style={{ fontSize: '2.25rem', fontWeight: '700' }}>
            {light}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginLeft: '4px' }}>/ 4095</span>
        </div>
        <div className={`badge ${lightStatus.class}`}>
          {lightStatus.text}
        </div>
      </div>
    </div>
  );
}
