import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { Cloud, CloudRain, Sun, Flame, Clock, Radio, Activity, Cpu, Sparkles } from 'lucide-react';
import SensorCards from '../components/SensorCards';
import FarmView from '../components/FarmView';
import ZoneDetails from '../components/ZoneDetails';

const BACKEND_URL = 'http://localhost:3001';

export default function Home() {
  const [farmState, setFarmState] = useState(null);
  const [selectedZoneId, setSelectedZoneId] = useState('A');
  const [zoneHistory, setZoneHistory] = useState({ A: [], B: [], C: [] });
  const [mockEspEnabled, setMockEspEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const logContainerRef = useRef(null);

  // Fetch full state from backend
  const fetchFarmState = async (triggerEspLogic = false) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/farm-data/all`);
      if (!res.ok) throw new Error('Failed to fetch from Digital Twin backend');
      
      const data = await res.json();
      setFarmState(data);
      setLoading(false);
      setError(null);

      // Record history values
      setZoneHistory(prev => {
        const nextHist = { ...prev };
        data.zones.forEach(zone => {
          const arr = [...(nextHist[zone.zone_id] || [])];
          arr.push(zone.soil_moisture);
          if (arr.length > 15) arr.shift(); // Keep last 15 ticks
          nextHist[zone.zone_id] = arr;
        });
        return nextHist;
      });

      // Run browser ESP32 simulator if enabled
      if (triggerEspLogic) {
        runBrowserEspSimulation(data.zones);
      }
    } catch (err) {
      console.error(err);
      setError('Could not connect to digital twin backend. Make sure the backend server is running on http://localhost:3001.');
    }
  };

  // Poll backend every 2000ms
  useEffect(() => {
    fetchFarmState(false);
    const interval = setInterval(() => {
      fetchFarmState(true);
    }, 2000);

    return () => clearInterval(interval);
  }, [mockEspEnabled]);

  // Scroll to top of activity log when new log appears
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [farmState?.logs]);

  // Simulate ESP32 edge rules on the client
  const runBrowserEspSimulation = async (zones) => {
    if (!mockEspEnabled) return;

    for (const zone of zones) {
      const isIrrigating = zone.irrigation === 'ON' || zone.irrigation === true;
      const isHeatAlert = zone.alert === 'HEAT_WARNING';

      if (zone.soil_moisture < 30 && !isIrrigating) {
        await toggleIrrigation(zone.zone_id, true);
      }
      
      if (zone.soil_moisture > 70 && isIrrigating) {
        await toggleIrrigation(zone.zone_id, false);
      }

      if (zone.temperature > 38 && !isHeatAlert) {
        await toggleAlert(zone.zone_id, 'HEAT_WARNING');
      }

      if (zone.temperature <= 38 && isHeatAlert) {
        await toggleAlert(zone.zone_id, 'NONE');
      }
    }
  };

  const toggleIrrigation = async (zoneId, targetState) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/zone/${zoneId}/irrigation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ irrigation: targetState })
      });
      if (res.ok) {
        await fetchFarmState(false);
      }
    } catch (err) {
      console.error('Error triggering irrigation:', err);
    }
  };

  const toggleAlert = async (zoneId, alertType) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/zone/${zoneId}/alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert: alertType })
      });
      if (res.ok) {
        await fetchFarmState(false);
      }
    } catch (err) {
      console.error('Error triggering alert:', err);
    }
  };

  const handleSetWeather = async (condition) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/weather`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ condition })
      });
      if (res.ok) {
        await fetchFarmState(false);
      }
    } catch (err) {
      console.error('Error setting weather:', err);
    }
  };

  if (loading && !error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#040d0a' }}>
        <Activity size={48} style={{ color: '#10b981', animation: 'spin 2s linear infinite', marginBottom: '16px' }} />
        <h2 style={{ color: '#f0fdf4', fontWeight: '600' }}>Loading Organic Farm Twin Environment...</h2>
      </div>
    );
  }

  const selectedZone = farmState?.zones.find(z => z.zone_id === selectedZoneId);
  const time = farmState?.simulation_time || { hour: 8, minute: 0, day_phase: 'Morning' };
  const weather = farmState?.weather || { condition: 'SUNNY', ambient_temperature: 25.0, ambient_humidity: 60.0 };

  const decimalHour = time.hour + time.minute / 60;
  const isDay = time.hour >= 5 && time.hour < 20;

  // Determine ambient background gradient depending on hour
  let dynamicBackground = 'var(--bg-farm-morning)';
  let skyDomeClass = 'skydome-morning';
  let skyDomeBg = 'linear-gradient(to right, #0f172a, #582f0e)';

  if (time.hour >= 5 && time.hour < 11) {
    dynamicBackground = 'var(--bg-farm-morning)';
    skyDomeClass = 'skydome-morning';
    skyDomeBg = 'linear-gradient(to right, #1e1b4b, #b45309, #064e3b)';
  } else if (time.hour >= 11 && time.hour < 17) {
    dynamicBackground = 'var(--bg-farm-afternoon)';
    skyDomeClass = 'skydome-afternoon';
    // Deep sunny farm sky dome
    skyDomeBg = 'linear-gradient(to right, #0369a1, #0d9488, #0f766e)';
  } else if (time.hour >= 17 && time.hour < 20) {
    dynamicBackground = 'var(--bg-farm-evening)';
    skyDomeClass = 'skydome-evening';
    skyDomeBg = 'linear-gradient(to right, #042f2c, #701a75, #78350f)';
  } else {
    dynamicBackground = 'var(--bg-farm-night)';
    skyDomeClass = 'skydome-night';
    skyDomeBg = 'linear-gradient(to right, #020617, #022c22)';
  }

  // Calculate Sun/Moon position (x coordinate) across the skydome:
  // Starts on the left at sunrise (5:00) and sinks on the right at sunset (20:00).
  // Moon shifts at night.
  let celestialX = 50;
  let celestialY = 30; // peak height
  let scale = 1;
  let glowSize = '12px';

  if (isDay) {
    // Standardize 5:00 - 20:00 range to 5% - 95%
    const progress = (decimalHour - 5) / 15; // 0 at 5:00, 1 at 20:00
    celestialX = 5 + progress * 90;
    
    // Parabolic arc for height: peak Y (value 15, closer to top) at noon (12.5), lower Y at edges
    const arcHeight = Math.sin(progress * Math.PI); // 0 at dawn, 1 at noon, 0 at dusk
    celestialY = 55 - arcHeight * 38; // range from 55px down to 17px
    
    // Sun brightness (scale & glow size) peaks in afternoon (12:00 to 15:00)
    if (time.hour >= 12 && time.hour <= 15) {
      scale = 1.35;
      glowSize = '24px';
    }
    
    // Boost sun size and glow during heatwaves
    if (weather.condition === 'HEATWAVE') {
      scale *= 1.45;
      glowSize = '35px';
    }
  } else {
    // Night path: 20:00 to 5:00 (9 hours total)
    let nightProgress = 0;
    if (decimalHour >= 20) {
      nightProgress = (decimalHour - 20) / 9;
    } else {
      nightProgress = (decimalHour + 4) / 9;
    }
    celestialX = 5 + nightProgress * 90;
    const arcHeight = Math.sin(nightProgress * Math.PI);
    celestialY = 55 - arcHeight * 38;
  }

  return (
    <>
      <Head>
        <title>Organic Farm Digital Twin</title>
        <meta name="description" content="Eco-realistic Smart Agriculture Twin" />
      </Head>

      <div style={{
        background: dynamicBackground,
        minHeight: '100vh',
        transition: 'background 2s ease-in-out',
        paddingBottom: '80px'
      }}>
        <div className="dashboard-container">
          {error && (
            <div style={{
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1.5px solid var(--danger)',
              color: '#fda4af',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Flame size={24} style={{ flexShrink: 0 }} />
              <div>
                <h4 style={{ fontWeight: '800' }}>Environmental Disruption</h4>
                <p style={{ fontSize: '0.85rem' }}>{error}</p>
              </div>
              <button className="btn" style={{ marginLeft: 'auto', fontSize: '0.8rem' }} onClick={() => fetchFarmState(false)}>
                Re-sync Gateway
              </button>
            </div>
          )}

          {/* Interactive Sky Dome Visualizer */}
          <section className={`skydome-panel ${skyDomeClass}`} style={{ background: skyDomeBg }}>
            {/* Stars rendering at night */}
            <div className="stars"></div>

            {/* Glowing Celestial Object (Sun / Moon) */}
            <div style={{
              position: 'absolute',
              left: `${celestialX}%`,
              top: `${celestialY}px`,
              transform: `translate(-50%, -50%) scale(${scale})`,
              transition: 'left 2s linear, top 2s linear, transform 2s ease',
              zIndex: 10,
              filter: `drop-shadow(0 0 ${glowSize} ${isDay ? 'rgba(251, 191, 36, 0.8)' : 'rgba(226, 232, 240, 0.6)'})`
            }}>
              {isDay ? (
                // SUN
                <svg viewBox="0 0 100 100" width="38" height="38" style={{
                  animation: weather.condition === 'HEATWAVE' ? 'pulse-sun 1.5s infinite ease-in-out' : 'pulse-sun 4s infinite ease-in-out'
                }}>
                  {/* Outer Corona Rings for high light */}
                  {(scale > 1 || weather.condition === 'HEATWAVE') && (
                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(251, 191, 36, 0.15)" strokeWidth="2" strokeDasharray="5,3" />
                  )}
                  <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(251, 191, 36, 0.3)" strokeWidth="4" />
                  <circle cx="50" cy="50" r="24" fill="#fbbf24" />
                </svg>
              ) : (
                // MOON
                <svg viewBox="0 0 100 100" width="30" height="30">
                  <path d="M 30,20 A 30,30 0 1,0 80,70 A 24,24 0 1,1 30,20 Z" fill="#e2e8f0" />
                </svg>
              )}
            </div>

            {/* Atmospheric Overlays (Rain or Clouds) */}
            {weather.condition === 'RAINY' && (
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(56, 189, 248, 0.15) 40px, rgba(56, 189, 248, 0.15) 80px)',
                backgroundSize: '100% 200px',
                animation: 'water-drip 1.5s infinite linear',
                pointerEvents: 'none',
                zIndex: 12
              }} />
            )}

            {/* Clouds Overlay */}
            {(weather.condition === 'CLOUDY' || weather.condition === 'RAINY') && (
              <>
                <div style={{
                  position: 'absolute',
                  top: '15px',
                  opacity: 0.8,
                  animation: 'float-clouds 45s infinite linear',
                  zIndex: 11,
                  color: '#64748b'
                }}>
                  <svg width="60" height="40" viewBox="0 0 100 60" fill="currentColor">
                    <path d="M 20,40 A 20,20 0 0,1 50,20 A 25,25 0 0,1 85,30 A 15,15 0 0,1 80,60 L 20,60 Z" />
                  </svg>
                </div>
                <div style={{
                  position: 'absolute',
                  top: '25px',
                  opacity: 0.65,
                  animation: 'float-clouds 30s infinite linear',
                  animationDelay: '10s',
                  zIndex: 11,
                  color: '#475569'
                }}>
                  <svg width="80" height="50" viewBox="0 0 100 60" fill="currentColor">
                    <path d="M 20,40 A 20,20 0 0,1 50,20 A 25,25 0 0,1 85,30 A 15,15 0 0,1 80,60 L 20,60 Z" />
                  </svg>
                </div>
              </>
            )}

            {/* Live Environment Stats Overlay inside Sky */}
            <div style={{
              position: 'absolute',
              bottom: '10px',
              left: '16px',
              zIndex: 15,
              display: 'flex',
              gap: '16px',
              fontSize: '0.8rem',
              color: '#f0fdf4',
              background: 'rgba(2, 40, 24, 0.6)',
              padding: '4px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(16, 185, 129, 0.15)',
              backdropFilter: 'blur(4px)'
            }}>
              <span>Atmosphere: <strong>{weather.condition}</strong></span>
              <span>Temp: <strong>{weather.ambient_temperature}°C</strong></span>
              <span>Humid: <strong>{weather.ambient_humidity}%</strong></span>
            </div>
            
            <div style={{
              position: 'absolute',
              bottom: '10px',
              right: '16px',
              zIndex: 15,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              color: '#f0fdf4',
              background: 'rgba(2, 40, 24, 0.6)',
              padding: '4px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(16, 185, 129, 0.15)',
              backdropFilter: 'blur(4px)'
            }}>
              <Clock size={14} color="var(--primary)" />
              <span style={{ fontWeight: '800' }}>{time.hour.toString().padStart(2, '0')}:{time.minute.toString().padStart(2, '0')}</span>
              <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>({time.day_phase})</span>
            </div>
          </section>

          {/* Main Dashboard Header */}
          <header className="header" style={{ borderBottomColor: 'rgba(16,185,129,0.1)' }}>
            <div className="title-section">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-green" style={{ display: 'flex', gap: '4px' }}>
                  <Sparkles size={10} />
                  <span>Physical Layer Simulator</span>
                </span>
                {mockEspEnabled && (
                  <span className="badge badge-blue" style={{ gap: '4px' }}>
                    <Cpu size={10} />
                    <span>Edge Rules Controller Active</span>
                  </span>
                )}
              </div>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>🌾</span>
                <span>KrishiSetu: Live Farm Simulator</span>
              </h1>
              <p>Visual sandbox representing the physical farm environment, crop states, and microclimate telemetry.</p>
            </div>
          </header>

          {/* Weather Controller Panel */}
          <section className="glass-card" style={{ marginBottom: '24px', padding: '16px 24px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '800' }}>Atmospheric Controls</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Force simulation weather cycles to evaluate ESP32 sensor responses.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => handleSetWeather('SUNNY')} 
                  className={`btn ${weather.condition === 'SUNNY' ? 'btn-active' : ''}`}
                >
                  <Sun size={16} color="#fbbf24" />
                  <span>Sunny Skies</span>
                </button>
                <button 
                  onClick={() => handleSetWeather('CLOUDY')} 
                  className={`btn ${weather.condition === 'CLOUDY' ? 'btn-active' : ''}`}
                >
                  <Cloud size={16} color="#94a3b8" />
                  <span>Overcast</span>
                </button>
                <button 
                  onClick={() => handleSetWeather('RAINY')} 
                  className={`btn ${weather.condition === 'RAINY' ? 'btn-active' : ''}`}
                >
                  <CloudRain size={16} color="#38bdf8" />
                  <span>Heavy Rain</span>
                </button>
                <button 
                  onClick={() => handleSetWeather('HEATWAVE')} 
                  className={`btn ${weather.condition === 'HEATWAVE' ? 'btn-active' : ''}`}
                >
                  <Flame size={16} color="#f43f5e" />
                  <span>Heatwave Solar</span>
                </button>
              </div>
            </div>
          </section>

          {/* Main Grid */}
          <div className="dashboard-grid">
            {/* Visual Fields and Telemetry Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <SensorCards zone={selectedZone} />
              
              <div style={{ flexGrow: 1 }}>
                <FarmView
                  zones={farmState?.zones || []}
                  selectedZoneId={selectedZoneId}
                  onSelectZone={setSelectedZoneId}
                />
              </div>
            </div>

            {/* Sidebar Details and IoT Logs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <ZoneDetails
                zone={selectedZone}
                history={zoneHistory[selectedZoneId] || []}
                onToggleIrrigation={toggleIrrigation}
                mockEspEnabled={mockEspEnabled}
                onToggleMockEsp={() => setMockEspEnabled(prev => !prev)}
              />

              {/* Logs Drawer */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '240px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Radio size={16} style={{ color: 'var(--primary)', animation: 'pulse 1s infinite' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>IoT Gateway Logs</h3>
                </div>
                <div 
                  ref={logContainerRef}
                  style={{
                    flexGrow: 1,
                    overflowY: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    paddingRight: '4px',
                    scrollBehavior: 'smooth'
                  }}
                >
                  {farmState?.logs.map((log, idx) => {
                    let logColor = '#cbd5e1';
                    if (log.message.includes('[ALERT]')) logColor = '#f87171';
                    if (log.message.includes('[WARNING]')) logColor = '#fbbf24';
                    if (log.message.includes('[ACTION]')) logColor = '#38bdf8';

                    return (
                      <div key={idx} style={{ color: logColor, display: 'flex', gap: '8px', borderBottom: '1px solid rgba(16,185,129,0.05)', paddingBottom: '4px' }}>
                        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>[{log.timestamp}]</span>
                        <span>{log.message}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes float-clouds {
          0% { transform: translateX(-80px); }
          100% { transform: translateX(650px); }
        }
        @keyframes water-drip {
          0% { background-position: 0 0; }
          100% { background-position: 0 200px; }
        }
      `}</style>
    </>
  );
}
