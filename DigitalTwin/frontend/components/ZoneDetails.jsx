import React from 'react';
import { Droplet, Power, AlertTriangle, ShieldCheck, Cpu } from 'lucide-react';

export default function ZoneDetails({ zone, history, onToggleIrrigation, mockEspEnabled, onToggleMockEsp }) {
  if (!zone) return null;

  const { zone_id, crop, soil_moisture, temperature, irrigation, alert } = zone;
  const isIrrigating = irrigation === 'ON' || irrigation === true;

  // Generate SVG path points for the history graph
  const renderHistoryGraph = () => {
    if (!history || history.length === 0) {
      return (
        <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Collecting simulation history...
        </div>
      );
    }

    const height = 100;
    const width = 300;
    const padding = 10;
    
    // Find min/max values or use 0-100 for moisture
    const maxVal = 100;
    const minVal = 0;
    const valRange = maxVal - minVal;

    const points = history.map((val, idx) => {
      const x = padding + (idx / (history.length - 1)) * (width - 2 * padding);
      // Invert Y because SVG coordinates start from top
      const y = height - padding - ((val - minVal) / valRange) * (height - 2 * padding);
      return `${x},${y}`;
    });

    const pathData = `M ${points.join(' L ')}`;
    const areaPoints = [
      `${padding},${height - padding}`,
      ...points,
      `${width - padding},${height - padding}`
    ];
    const areaData = `M ${areaPoints.join(' L ')} Z`;

    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="120px" style={{ overflow: 'visible' }}>
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" />

          {/* Area under curve */}
          <path d={areaData} fill="url(#moistureGrad)" opacity="0.15" />
          {/* Sparkline curve */}
          <path d={pathData} fill="none" stroke="var(--water)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data point dots */}
          {points.map((pt, idx) => {
            const [x, y] = pt.split(',');
            const isLast = idx === points.length - 1;
            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r={isLast ? 4 : 2}
                fill={isLast ? 'var(--water)' : 'rgba(14, 165, 233, 0.7)'}
                stroke={isLast ? '#fff' : 'none'}
                strokeWidth={isLast ? 1.5 : 0}
              />
            );
          })}

          {/* Gradients */}
          <defs>
            <linearGradient id="moistureGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--water)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          <span>{history.length} ticks ago</span>
          <span>Current ({soil_moisture}%)</span>
        </div>
      </div>
    );
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Zone Overview Header */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Zone {zone_id} Info</h2>
          <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
            Crop: {crop}
          </span>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Physical sensor data stream.
        </p>
      </div>

      {/* Moisture Sparkline history */}
      <div>
        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '600' }}>
          Soil Moisture History (Last 15 ticks)
        </h4>
        {renderHistoryGraph()}
      </div>

      {/* Edge Decision Status & TinyML Predictions */}
      <div style={{
        background: 'rgba(16, 185, 129, 0.03)',
        border: '1.5px dashed var(--primary)',
        borderRadius: '14px',
        padding: '18px'
      }}>
        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={18} color="var(--primary)" style={{ animation: 'pulse 1.5s infinite' }} />
          <span style={{ fontWeight: '800', letterSpacing: '0.02em', color: 'var(--text-primary)' }}>Edge TinyML Predictor</span>
        </h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
          {/* Classification Output */}
          <div className="flex-between">
            <span style={{ color: 'var(--text-secondary)' }}>AI Crop Health Status:</span>
            {zone.crop_health ? (
              <span className={`badge ${
                zone.crop_health === 'HEALTHY' ? 'badge-green' : 'badge-red'
              }`} style={{ padding: '3px 10px', fontSize: '0.7rem' }}>
                {zone.crop_health}
              </span>
            ) : (
              <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Waiting for Edge...</span>
            )}
          </div>

          {/* Has water score, show progress bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(16, 185, 129, 0.1)', paddingTop: '10px' }}>
            <div className="flex-between">
              <span style={{ color: 'var(--text-secondary)' }}>Calculated Water Need:</span>
              <span style={{ fontWeight: '700', color: 'var(--water)' }}>
                {zone.water_requirement !== undefined ? `${parseFloat(zone.water_requirement).toFixed(1)}%` : 'N/A'}
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: 'rgba(0,0,0,0.5)',
              borderRadius: '4px',
              overflow: 'hidden',
              marginTop: '2px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div style={{
                width: `${zone.water_requirement !== undefined ? zone.water_requirement : 0}%`,
                height: '100%',
                backgroundColor: zone.water_requirement > 60 ? 'var(--water)' : 'var(--primary)',
                boxShadow: '0 0 8px var(--primary-glow)',
                borderRadius: '4px',
                transition: 'width 0.5s ease-in-out'
              }} />
            </div>
          </div>

          {/* Actuator States */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(16, 185, 129, 0.1)', paddingTop: '10px', fontSize: '0.8rem' }}>
            <div className="flex-between">
              <span style={{ color: 'var(--text-muted)' }}>Solenoid Valve (Pin 26):</span>
              <span style={{ fontWeight: '700', color: isIrrigating ? 'var(--water)' : 'var(--text-muted)' }}>
                {isIrrigating ? 'OPEN [ON]' : 'CLOSED [OFF]'}
              </span>
            </div>
            <div className="flex-between">
              <span style={{ color: 'var(--text-muted)' }}>Emergency Alarm (Pin 27):</span>
              <span style={{ fontWeight: '700', color: zone.alert !== 'NONE' ? 'var(--danger)' : 'var(--text-muted)' }}>
                {zone.alert !== 'NONE' ? 'ALERT ACTIVE [ON]' : 'STANDBY [OFF]'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Override controls */}
      <div>
        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: '600' }}>
          Control Operations
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Manual Irrigation Trigger */}
          <button
            onClick={() => onToggleIrrigation(zone_id, !isIrrigating)}
            className={`btn ${isIrrigating ? 'btn-active' : ''}`}
            style={{ width: '100%', justifyContent: 'center', height: '42px' }}
          >
            <Power size={16} />
            <span>{isIrrigating ? 'Turn Irrigation OFF' : 'Turn Irrigation ON'}</span>
          </button>

          {/* Web ESP32 Simulator Daemon Switch */}
          <button
            onClick={onToggleMockEsp}
            className={`btn ${mockEspEnabled ? 'btn-active' : ''}`}
            style={{ 
              width: '100%', 
              justifyContent: 'center', 
              height: '42px',
              borderStyle: 'dashed',
              backgroundColor: mockEspEnabled ? 'rgba(16, 185, 129, 0.08)' : 'transparent'
            }}
          >
            <Cpu size={16} style={{ animation: mockEspEnabled ? 'pulse 2s infinite' : 'none' }} />
            <span>{mockEspEnabled ? 'Disable Browser ESP32 Simulator' : 'Enable Browser ESP32 Simulator'}</span>
          </button>
        </div>
        {mockEspEnabled && (
          <p style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: '8px', textAlign: 'center' }}>
            * Browser is automatically applying ESP32 rules to this zone!
          </p>
        )}
      </div>
    </div>
  );
}
