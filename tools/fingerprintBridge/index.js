require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const fs = require('fs');
const path = require('path');
const ZKLib = require('node-zklib');

const DEVICE_IP = process.env.DEVICE_IP || '192.168.1.201';
const DEVICE_PORT = parseInt(process.env.DEVICE_PORT || '4370', 10);
const DEVICE_SN = process.env.DEVICE_SN || '';
const SERVER_API_BASE = process.env.SERVER_API_BASE || '';
const BRIDGE_KEY = process.env.FINGERPRINT_BRIDGE_KEY || '';
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '120000', 10);
const CURSOR_FILE = path.join(__dirname, 'lastSync.json');

if (!SERVER_API_BASE || !BRIDGE_KEY) {
  console.error('SERVER_API_BASE dan FINGERPRINT_BRIDGE_KEY wajib diisi di .env (lihat .env.example).');
  process.exit(1);
}

function readCursor() {
  try {
    const raw = JSON.parse(fs.readFileSync(CURSOR_FILE, 'utf8'));
    return raw.lastSync ? new Date(raw.lastSync) : null;
  } catch (e) {
    return null;
  }
}

function writeCursor(date) {
  fs.writeFileSync(CURSOR_FILE, JSON.stringify({ lastSync: date.toISOString() }, null, 2));
}

function pad2(n) { return String(n).padStart(2, '0'); }

// Format "YYYY-MM-DD HH:MM:SS" sesuai jam lokal alat (bukan UTC).
function formatDateTime(date) {
  return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()) +
    ' ' + pad2(date.getHours()) + ':' + pad2(date.getMinutes()) + ':' + pad2(date.getSeconds());
}

async function pushToServer(records) {
  const body = new URLSearchParams();
  body.append('action', 'fingerprint.bridge.ingest');
  body.append('bridgeKey', BRIDGE_KEY);
  body.append('records', JSON.stringify(records));
  const res = await fetch(SERVER_API_BASE, { method: 'POST', body });
  const json = await res.json();
  if (!json.ok) {
    throw new Error((json.error && json.error.message) || 'Server menolak data.');
  }
  return json.data;
}

async function syncOnce() {
  const lastSync = readCursor();
  console.log('[' + new Date().toISOString() + '] Konek ke alat ' + DEVICE_IP + ':' + DEVICE_PORT + ' ...');

  const zkInstance = new ZKLib(DEVICE_IP, DEVICE_PORT, 10000, 4000);
  try {
    await zkInstance.createSocket();
    const result = await zkInstance.getAttendances();
    const logs = (result && result.data) || [];
    console.log('Total scan tersimpan di alat: ' + logs.length);

    let newest = lastSync;
    const records = [];
    logs.forEach(function (log) {
      const t = new Date(log.recordTime);
      if (isNaN(t.getTime())) return;
      if (lastSync && t <= lastSync) return; // sudah pernah dikirim
      records.push({
        pin: String(log.deviceUserId != null ? log.deviceUserId : log.userSid || '').trim(),
        waktu: formatDateTime(t),
        deviceSn: DEVICE_SN
      });
      if (!newest || t > newest) newest = t;
    });

    if (records.length === 0) {
      console.log('Tidak ada scan baru sejak sync terakhir.');
    } else {
      console.log('Mengirim ' + records.length + ' scan baru ke server...');
      const data = await pushToServer(records);
      console.log('Server: ' + data.message);
      if (newest) writeCursor(newest);
    }
  } catch (err) {
    console.error('Gagal sync: ' + err.message);
  } finally {
    try { await zkInstance.disconnect(); } catch (e) { /* alat mungkin sudah putus, abaikan */ }
  }
}

async function main() {
  await syncOnce();
  setInterval(syncOnce, POLL_INTERVAL_MS);
}

main();
