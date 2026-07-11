/**
 * Exposes local backend to the internet for Wokwi ESP32.
 *
 * Usage (pick one):
 *   npm run tunnel          → tries ngrok, then localtunnel
 *   npm run tunnel:lt       → localtunnel only (no signup)
 *   npm run tunnel:ngrok    → ngrok only (needs NGROK_AUTHTOKEN)
 *
 * Copy the printed HTTPS URL into wokwi/sketch.ino → serverUrl
 */
const { spawn } = require('child_process');
const ngrok = require('ngrok');

const PORT = process.env.PORT || 3001;
const mode = process.argv[2] || 'auto';

function printReady(url, provider) {
  console.log('');
  console.log('================================================================');
  console.log(`  WOKWI TUNNEL READY (${provider})`);
  console.log('================================================================');
  console.log('');
  console.log(`  Paste into sketch.ino line 14:`);
  console.log(`  const char* serverUrl = "${url}";`);
  console.log('');
  console.log('  Test endpoints:');
  console.log(`    GET  ${url}/api/farm-data?zone=A`);
  console.log(`    POST ${url}/api/esp32/telemetry`);
  console.log('');
  console.log('  Keep this terminal open. Ctrl+C to stop.');
  console.log('================================================================');
  console.log('');
}

async function startNgrok() {
  const url = await ngrok.connect({
    addr: PORT,
    authtoken_from_env: true,
  });
  printReady(url, 'ngrok');
}

function startLocaltunnel() {
  const lt = spawn('npx', ['localtunnel', '--port', String(PORT)], {
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  lt.stdout.on('data', (data) => {
    const text = data.toString();
    process.stdout.write(text);
    const match = text.match(/https:\/\/[^\s]+/);
    if (match) {
      printReady(match[0], 'localtunnel');
    }
  });

  lt.stderr.on('data', (data) => process.stderr.write(data));
  lt.on('close', (code) => process.exit(code || 0));
}

(async () => {
  if (mode === 'lt' || mode === 'localtunnel') {
    startLocaltunnel();
    return;
  }

  if (mode === 'ngrok') {
    try {
      await startNgrok();
    } catch (err) {
      console.error('ngrok failed:', err.message);
      console.error('Set NGROK_AUTHTOKEN or use: npm run tunnel:lt');
      process.exit(1);
    }
    return;
  }

  // auto: try ngrok first, fall back to localtunnel
  try {
    await startNgrok();
  } catch {
    console.log('ngrok unavailable — starting localtunnel (no signup needed)...\n');
    startLocaltunnel();
  }
})();
