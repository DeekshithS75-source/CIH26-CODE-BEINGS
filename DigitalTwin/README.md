# Smart Agriculture Digital Twin Simulator 🌱

A complete cyber-physical simulation system showcasing a **Smart Farm Digital Twin** with real-time edge processing and control loops.

## System Architecture

The project demonstrates a multi-agent closed-loop IoT system:

```
┌─────────────────────────────────┐
│   DIGITAL TWIN FARM SIMULATOR   │ ◄───┐
│   - Advances time & weather     │     │
│   - Simulates soil moisture loss│     │
│   - Maintains global farm state │     │
└────────────────┬────────────────┘     │
                 │                      │
                 │ JSON HTTP telemetry  │ POST Command updates
                 ▼                      │ (Irrigation / Alerts)
┌─────────────────────────────────┐     │
│       EXPRESS REST API          │     │
│   - GET  /api/farm-data         │     │
│   - POST /api/zone/:id/control  │     │
└────────────────┬────────────────┘     │
                 │                      │
                 │ GET request          │
                 ▼                      │
┌─────────────────────────────────┐     │
│     WOKWI ESP32 CONTROLLER      ├─────┘
│   - Executes edge rules         │
│   - Controls physical hardware  │
│   - LCD telemetry display       │
└────────────────┬────────────────┘
                 │
                 │ Live Polling (2s)
                 ▼
┌─────────────────────────────────┐
│   FRONTEND NEXT.JS DASHBOARD    │
│   - Live SVG field conditions   │
│   - Interactive weather triggers│
│   - Scrollable Activity Log     │
└─────────────────────────────────┘
```

---

## Folder Structure

```
smart-farm-digital-twin/
│
├── backend/                  # Express API & Simulation Engine
│   ├── server.js             # Main server & background tick loops
│   ├── package.json          # Dependencies (express, cors)
│   ├── routes/
│   │     └── farmData.js     # GET telemetry, POST actions
│   ├── simulation/
│   │     ├── farmSimulator.js# State orchestrator
│   │     ├── weatherModel.js # Temp, light, humidity diurnal formulas
│   │     └── soilModel.js    # Moisture drain/irrigation formulas
│   └── data/
│         └── farmState.json  # Live JSON state persistence
│
├── frontend/                 # Next.js / React User Interface
│   ├── package.json          # React, Next.js, lucide-react
│   ├── pages/
│   │     ├── _app.js         # Styles loader
│   │     └── index.js        # Dashboard state coordinator
│   ├── components/
│   │     ├── FarmView.jsx    # SVG-based interactive crop fields
│   │     ├── SensorCards.jsx # Telemetry cards with status lights
│   │     └── ZoneDetails.jsx # Historical sparklines & overrides
│   └── styles/
│         └── globals.css     # Premium Glassmorphism styling
│
├── wokwi/                    # Hardware Simulation
│   ├── sketch.ino            # ESP32 C++ firmware code
│   └── diagram.json          # Connection wiring for Wokwi
│
└── README.md                 # Project instructions
```

---

## Getting Started

### 1. Start the Backend Server

The backend runs the simulation ticks (advancing 15 minutes of farm time every 3 seconds) and serves the REST endpoints.

```bash
# Navigate to backend folder and install dependencies
cd backend
npm install

# Start the simulation server
npm start
```
The server will boot on [http://localhost:3001](http://localhost:3001).
- Telemetry endpoint: `http://localhost:3001/api/farm-data?zone=A`
- Combined state endpoint: `http://localhost:3001/api/farm-data/all`

### 2. Start the Frontend Dashboard

The frontend displays the live fields, animations, and registers real-time events.

```bash
# Navigate to frontend folder and install dependencies
cd ../frontend
npm install

# Run the development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Testing the Closed-Loop IoT Flow

### Method A: Browser-based ESP32 Simulator (Instant Demo)
No hardware setup required! 
1. Open the Dashboard ([http://localhost:3000](http://localhost:3000)).
2. Click **Enable Browser ESP32 Simulator** on the right side panel.
3. The dashboard will now apply the edge rules locally in your browser.
4. Set weather to **Heatwave** or wait for the soil moisture to drop below 30%.
5. Watch the dashboard automatically trigger the irrigation sprinklers, log the event, and restore moisture back to 70%!

### Method B: True Wokwi ESP32 Simulation
Run the edge logic on a simulated ESP32 microcontroller inside Wokwi:

1. **Expose your local backend**: Because Wokwi runs in the cloud, it cannot access `localhost`. Open a tunnel to port 3001 using ngrok:
   ```bash
   ngrok http 3001
   ```
   *Note: Copy the public forwarding address (e.g. `https://xxxx.ngrok-free.app`).*

2. **Open Wokwi**: Go to [wokwi.com](https://wokwi.com) and start a new **ESP32** project.
3. **Firmware setup**: 
   - Open `sketch.ino` in Wokwi, and replace the contents with the code from [wokwi/sketch.ino](file:///d:/DigitalTwin/wokwi/sketch.ino).
   - Find line 17 (`const char* serverUrl = "..."`) and replace it with your **ngrok forwarding URL**.
4. **Wiring setup**: 
   - In Wokwi, find the `diagram.json` tab and replace its contents with [wokwi/diagram.json](file:///d:/DigitalTwin/wokwi/diagram.json).
5. **Run the simulation**:
   - Start the Wokwi simulation.
   - The virtual LCD screen will show `WiFi Connecting...` and then display the current temperature and moisture of **Zone A**.
   - If soil moisture falls below 30%, the ESP32 turns on the **Blue LED** (representing the irrigation valve) and POSTs a command to the backend to begin watering.
   - When the moisture climbs past 70%, the ESP32 shuts the blue LED off and sends a POST to stop watering.
   - If you set the weather to **Heatwave** and temperature exceeds 38°C, the ESP32 activates the **Red LED** (Heat warning alarm) and registers a heat warning on the dashboard logs.
