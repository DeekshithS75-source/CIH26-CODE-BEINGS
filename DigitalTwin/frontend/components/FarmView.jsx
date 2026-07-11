import React from 'react';
import { AlertTriangle, Droplets, Flame } from 'lucide-react';

export default function FarmView({ zones, selectedZoneId, onSelectZone }) {
  // Generates 12 plants (3 rows x 4 columns) for each field
  const plantIndices = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🌱</span>
            <span>Digital Twin Farm Fields</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Real-time interactive matrix showing crop stress levels and physical actuators.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#10b981' }}></span>
            <span>Vibrant / Moist</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#fbbf24' }}></span>
            <span>Dry / Stressed</span>
          </div>
        </div>
      </div>

      {/* Main Farm Layout Grid */}
      <div className="farm-fields-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
        gap: '24px',
        flexGrow: 1
      }}>
        {zones.map((zone) => {
          const isSelected = selectedZoneId === zone.zone_id;
          const isIrrigating = zone.irrigation === 'ON' || zone.irrigation === true;
          const isDry = zone.soil_moisture < 30;
          const isHeatAlert = zone.alert === 'HEAT_WARNING' || zone.temperature > 38;

          // Soil color mapping based on moisture
          let soilBg = 'var(--soil-wet)'; // Rich wet loam
          let gridLinesColor = 'rgba(255, 255, 255, 0.05)';
          
          if (isDry) {
            soilBg = 'var(--soil-dry)'; // Clay/sandy parched
            gridLinesColor = 'rgba(0, 0, 0, 0.15)';
          } else if (zone.soil_moisture >= 30 && zone.soil_moisture <= 60) {
            soilBg = '#4a3728'; // Moderate damp
            gridLinesColor = 'rgba(255, 255, 255, 0.06)';
          }

          // Crop leaf colors
          let leafColor = '#10b981'; // Fresh healthy green
          if (isDry) {
            leafColor = '#d97706'; // Wilted yellow/brown
          } else if (zone.soil_moisture > 80) {
            leafColor = '#059669'; // Dark lush green
          }

          return (
            <div
              key={zone.zone_id}
              onClick={() => onSelectZone(zone.zone_id)}
              className={`farm-soil-surface ${isHeatAlert ? 'heat-ripples' : ''}`}
              style={{
                cursor: 'pointer',
                borderRadius: '16px',
                backgroundColor: soilBg,
                border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                position: 'relative',
                overflow: 'hidden',
                minHeight: '260px',
                padding: '16px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: isSelected ? '0 0 25px rgba(16, 185, 129, 0.25)' : '0 6px 16px rgba(0,0,0,0.5)'
              }}
            >
              {/* Parched Cracked Pattern Overlay for dry fields */}
              {isDry && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0.18,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cpath d='M0 0 L30 10 L40 40 L10 50 Z M30 10 L60 0 L50 30 L40 40 Z M50 30 L60 60 L20 60 L40 40 Z M10 50 L40 40 L20 60 L0 60 Z' fill='none' stroke='%23000' stroke-width='1.5'/%3E%3C/svg%3E")`,
                  pointerEvents: 'none',
                  zIndex: 1
                }} />
              )}

              {/* Heatwave Shimmer Layer */}
              {isHeatAlert && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(244,63,94,0.06), rgba(244,63,94,0.12))',
                  pointerEvents: 'none',
                  zIndex: 2
                }} />
              )}

              {/* Active Sprinkler Rain mist */}
              {isIrrigating && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  zIndex: 3
                }}>
                  {/* Spray Overlay Graphic */}
                  <svg width="100%" height="100%">
                    <defs>
                      <linearGradient id="mist-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(56, 189, 248, 0.4)" />
                        <stop offset="100%" stopColor="rgba(56, 189, 248, 0.0)" />
                      </linearGradient>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#mist-grad)" />
                    
                    {/* Animated water droplet streams */}
                    <line x1="20%" y1="15" x2="15%" y2="240" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="1" strokeDasharray="4,8" className="irrigation-water-active" />
                    <line x1="50%" y1="15" x2="48%" y2="240" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="1" strokeDasharray="4,8" className="irrigation-water-active" />
                    <line x1="80%" y1="15" x2="82%" y2="240" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="1" strokeDasharray="4,8" className="irrigation-water-active" />
                    <line x1="35%" y1="15" x2="33%" y2="240" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="1" strokeDasharray="4,8" className="irrigation-water-active" />
                    <line x1="65%" y1="15" x2="63%" y2="240" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="1" strokeDasharray="4,8" className="irrigation-water-active" />
                  </svg>
                </div>
              )}

              {/* Card Header Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 4 }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                    Field {zone.zone_id}
                  </h3>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: '600', 
                    color: '#ffffff', 
                    background: 'rgba(0,0,0,0.5)', 
                    padding: '2px 8px', 
                    borderRadius: '4px',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    Crop: {zone.crop}
                  </span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  {isHeatAlert && (
                    <div className="badge badge-red" style={{ gap: '4px' }}>
                      <Flame size={12} />
                      <span>Heatwave</span>
                    </div>
                  )}
                  {isIrrigating && (
                    <div className="badge badge-blue" style={{ gap: '4px' }}>
                      <Droplets size={12} style={{ animation: 'bounce 1s infinite' }} />
                      <span>Sprinklers On</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Water Pipeline & Sprinkler Nozzles at the top */}
              <div style={{ position: 'relative', width: '100%', height: '14px', zIndex: 4, marginTop: '8px' }}>
                {/* Horizontal irrigation tube */}
                <div style={{
                  position: 'absolute',
                  top: '5px',
                  left: 0,
                  width: '100%',
                  height: '4px',
                  backgroundColor: '#708090',
                  borderRadius: '2px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.6)'
                }} />
                
                {/* Sprinkler heads */}
                <div style={{ display: 'flex', justifyContent: 'space-around', position: 'relative' }}>
                  {[1, 2, 3].map((n) => (
                    <div key={n} style={{
                      width: '6px',
                      height: '8px',
                      backgroundColor: '#334155',
                      borderRadius: '1px',
                      position: 'relative'
                    }}>
                      {/* Sprinkler water nozzle tips */}
                      <div style={{
                        width: '2px',
                        height: '3px',
                        backgroundColor: '#94a3b8',
                        margin: '5px auto 0 auto'
                      }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Dense Rows of Crops (3 rows of 4 plants) */}
              <div className="farm-crop-field" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gridTemplateRows: 'repeat(3, 1fr)',
                gap: '12px 8px',
                margin: '16px 0',
                zIndex: 4,
                flexGrow: 1,
                alignContent: 'center'
              }}>
                {plantIndices.map((i) => {
                  // Determine slightly random rotation offsets for a natural look
                  const rotDeg = isDry ? (15 + (i % 3) * 5) : ((i % 4) - 2) * 2;
                  
                  return (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      transform: `rotate(${rotDeg}deg) translateY(${isDry ? '4px' : '0px'})`,
                      transition: 'all 0.5s ease-in-out'
                    }}>
                      <svg viewBox="0 0 100 100" width="36" height="36" style={{ overflow: 'visible' }}>
                        {/* Stalk */}
                        <path d="M 50,95 Q 48,50 50,20" stroke="#5c4033" strokeWidth="4" fill="none" />
                        
                        {zone.crop === 'Tomato' ? (
                          <>
                            {/* Tomato Plant Leaves */}
                            <path d="M 50,60 C 25,55 30,45 50,50" fill={leafColor} />
                            <path d="M 50,40 C 75,35 70,25 50,30" fill={leafColor} />
                            <path d="M 50,75 C 20,70 25,80 50,75" fill={leafColor} />
                            {/* Tomatoes */}
                            {i % 2 === 0 && <circle cx="33" cy="53" r="8" fill={isDry ? '#b45309' : '#f43f5e'} />}
                            {i % 3 === 0 && <circle cx="67" cy="35" r="9" fill={isDry ? '#d97706' : '#e11d48'} />}
                          </>
                        ) : zone.crop === 'Rice' ? (
                          <>
                            {/* Rice Paddy Stalks */}
                            <path d="M 50,95 Q 30,50 18,22" stroke={leafColor} strokeWidth="3" fill="none" />
                            <path d="M 50,95 Q 50,40 50,12" stroke={leafColor} strokeWidth="3.5" fill="none" />
                            <path d="M 50,95 Q 70,50 82,22" stroke={leafColor} strokeWidth="3" fill="none" />
                            {/* Rice grains */}
                            <circle cx="18" cy="22" r="3.5" fill="#fef08a" />
                            <circle cx="50" cy="12" r="3.5" fill="#fef08a" />
                            <circle cx="82" cy="22" r="3.5" fill="#fef08a" />
                          </>
                        ) : (
                          <>
                            {/* Wheat Spikes */}
                            <path d="M 50,95 Q 42,45 46,18" stroke={leafColor} strokeWidth="4" fill="none" />
                            {/* Wheat ears (Golden yellow kernels) */}
                            <circle cx="43" cy="22" r="5" fill="#eab308" />
                            <circle cx="48" cy="32" r="4.5" fill="#eab308" />
                            <circle cx="53" cy="27" r="5" fill="#eab308" />
                            <circle cx="55" cy="37" r="4.5" fill="#eab308" />
                            {/* Extra leaves */}
                            <path d="M 50,70 Q 25,65 30,60" stroke={leafColor} strokeWidth="2.5" fill="none" />
                          </>
                        )}
                      </svg>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Info Strip */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: '#f0fdf4',
                background: 'rgba(4, 15, 10, 0.75)',
                padding: '6px 12px',
                borderRadius: '8px',
                zIndex: 4,
                backdropFilter: 'blur(6px)',
                border: '1px solid rgba(16, 185, 129, 0.1)'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  🌡️ <strong>{zone.temperature}°C</strong>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  💧 <strong>{zone.soil_moisture}% Moisture</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Local Sprinkler styles override */}
      <style jsx global>{`
        @keyframes water-drip {
          0% { stroke-dashoffset: 24; }
          100% { stroke-dashoffset: 0; }
        }
        .irrigation-water-active {
          animation: water-drip 0.8s linear infinite;
        }
      `}</style>
    </div>
  );
}
