/**
 * Modul "Sambungkan WhatsApp" untuk halaman pages/kelolaAuditBawahan.
 *
 * Fitur: Admin/Super Admin mengaktifkan koneksi WhatsApp Web (lewat library Baileys, koneksi
 * tidak resmi/unofficial ke WhatsApp -- ada risiko akun diblokir Meta kalau dipakai kirim
 * pesan massal/spam, di luar kendali kode ini), scan QR sekali dari HP yang login WA-nya,
 * lalu pilih 1 grup WA sebagai tujuan pengiriman pesan. Modul ini murni INFRASTRUKTUR:
 * koneksi + pemilihan grup + kirim pesan uji coba manual. TIDAK otomatis mengirim notifikasi
 * apa pun dari fitur audit lain -- itu di luar scope permintaan awal, tapi `sendMessage()`
 * diekspor supaya modul lain bisa `require('./whatsapp.js').sendMessage(jid, text)` kalau
 * nanti mau disambungkan ke pemicu tertentu.
 *
 * Dipasang sebagai Express router terpisah lalu di-mount di server.js utama, sama polanya
 * dgn backend/nilaiwajib.js (auth token dicek manual thd tabel pengurus, DB SQLite dibuka
 * sendiri, tabel/].json sendiri, tidak bergantung pada SCHEMAS di server.js).
 */
'use strict';
var path = require('node:path');
var fs = require('node:fs');
var express = require('express');
var DatabaseSync = require('node:sqlite').DatabaseSync;
var QRCode = require('qrcode');
var baileys = require('@whiskeysockets/baileys');
var makeWASocket = baileys.makeWASocket || baileys.default;
var useMultiFileAuthState = baileys.useMultiFileAuthState;
var DisconnectReason = baileys.DisconnectReason;
var fetchLatestBaileysVersion = baileys.fetchLatestBaileysVersion;

var DATA_DIR = path.join(__dirname, 'data');
var DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'pendataan-santri.sqlite');
var DB = new DatabaseSync(DB_PATH);
DB.exec('PRAGMA journal_mode = WAL;');

var AUTH_DIR = path.join(DATA_DIR, 'whatsapp-auth');
var WA_SETTINGS_PATH = path.join(DATA_DIR, 'whatsappSettings.json');
// targets: [{id, name, type: 'group'|'number'}] -- boleh banyak sekaligus (grup DAN/ATAU
// nomor perorangan, 2026-08-06). scheduleTimes: ['HH:MM', ...] -- boleh banyak jam sekaligus,
// broadcast (dibangun & dikirim dari server.js, lihat getTargets()/getScheduleTimes() di
// bawah) jalan tiap jam itu tercapai setiap hari, sampai dimatikan/diubah manual.
var WA_SETTINGS_DEFAULTS = { enabled: false, targets: [], scheduleTimes: [], setBy: '', setAt: '' };
var waSettingsState = Object.assign({}, WA_SETTINGS_DEFAULTS);
// Migrasi otomatis dari bentuk lama (1 groupId/groupName tunggal, sebelum fitur multi-target
// & jadwal ditambah) -- kalau file lama masih ada groupId tapi belum ada targets, pindahkan
// jadi 1 entry pertama di targets supaya tidak hilang.
function migrateLegacySettings_(raw) {
  if (raw && raw.groupId && (!Array.isArray(raw.targets) || !raw.targets.length)) {
    raw.targets = [{ id: raw.groupId, name: raw.groupName || raw.groupId, type: 'group' }];
  }
  return raw;
}
try { waSettingsState = Object.assign({}, WA_SETTINGS_DEFAULTS, migrateLegacySettings_(JSON.parse(fs.readFileSync(WA_SETTINGS_PATH, 'utf8')))); } catch (e) {}
function saveSettings_() { try { fs.writeFileSync(WA_SETTINGS_PATH, JSON.stringify(waSettingsState), 'utf8'); } catch (e) {} }
function reloadSettings() { try { waSettingsState = Object.assign({}, WA_SETTINGS_DEFAULTS, migrateLegacySettings_(JSON.parse(fs.readFileSync(WA_SETTINGS_PATH, 'utf8')))); } catch (e) { waSettingsState = Object.assign({}, WA_SETTINGS_DEFAULTS); } }
function getTargets() { return (waSettingsState.targets || []).slice(); }
function getScheduleTimes() { return (waSettingsState.scheduleTimes || []).slice(); }

// State koneksi murni in-memory (tidak persist -- selalu mulai dari 'disconnected' tiap
// server.js direstart, lalu init() otomatis nyambung ulang pakai kredensial tersimpan di
// AUTH_DIR kalau waSettingsState.enabled masih true, tanpa perlu scan ulang).
var waState = { status: 'disconnected', qrDataUrl: '', connectedNumber: '', lastError: '' };
var waSocket = null;
var waReconnectTimer = null;
// Kunci terpisah dari waState.status -- BUKAN dipakai buat status yg ditampilkan ke UI, murni
// mencegah 2 pemanggilan startConnection_() tumpang-tindih selagi await useMultiFileAuthState/
// fetchLatestBaileysVersion (sebelum waSocket sempat ke-assign). PENTING: jangan pernah pakai
// waState.status === 'connecting' sbg guard di sini -- connection.update (kind 'close') SUDAH
// nyetel waState.status = 'connecting' SEBELUM manggil scheduleReconnect_() (biar UI langsung
// kelihatan "menyambungkan..."), jadi kalau guard-nya baca status itu, startConnection_() yg
// dipanggil scheduleReconnect_() 4 detik kemudian akan SELALU langsung return tanpa ngapa-ngapain
// (waSocket sudah null tapi status "keburu" connecting) -- bug nyata yg pernah kejadian: abis WA
// sukses discan, Baileys otomatis minta "restart required" (kode 515, ini NORMAL & SELALU terjadi
// abis pairing pertama), tapi reconnect-nya deadlock di sini & QR/status macet permanen di
// "connecting" walau pairing-nya sendiri sudah berhasil (creds.json sudah tersimpan).
var waConnectingLock = false;

function cleanString_(v) { return v === undefined || v === null ? '' : String(v).trim(); }
function createError_(message, code) { var e = new Error(message); e.code = code || 500; return e; }
function nowIso_() {
  var APP_TIMEZONE = process.env.APP_TIMEZONE || process.env.TZ || 'Asia/Jakarta';
  var f = new Intl.DateTimeFormat('sv-SE', { timeZone: APP_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  var m = {}; f.formatToParts(new Date()).forEach(function (p) { m[p.type] = p.value; });
  return m.year + '-' + m.month + '-' + m.day + 'T' + m.hour + ':' + m.minute + ':' + m.second;
}

// ── Auth & permission (mini-clone dari backend/nilaiwajib.js, modul ini sengaja mandiri) ──
function authenticateFromToken_(token) {
  var tok = cleanString_(token);
  if (!tok) throw createError_('Token tidak ditemukan.', 401);
  var rows = DB.prepare('SELECT "id","name","token","status" FROM "pengurus"').all();
  var row = rows.find(function (r) {
    var status = cleanString_(r.status || '').toLowerCase();
    if (status === 'inactive' || status === 'nonaktif' || status === 'dibekukan' || status === 'frozen') return false;
    var tokens = []; try { tokens = JSON.parse(cleanString_(r.token) || '[]'); } catch (e) { tokens = [cleanString_(r.token)]; }
    if (!Array.isArray(tokens)) tokens = [cleanString_(r.token)];
    return tokens.indexOf(tok) !== -1;
  });
  if (!row) throw createError_('Token tidak valid atau sesi habis.', 401);
  return { id: cleanString_(row.id), name: cleanString_(row.name) };
}

// Koneksi WA itu infrastruktur server-wide (1 akun dipakai bersama, bukan per-jabatan spt
// nilai wajib) -- sengaja dibatasi HANYA Admin/Super Admin, TIDAK ikut jabatan Akademik dkk
// (beda dari halaman kelolaAuditBawahan sendiri yg lebih longgar aksesnya).
function canManageWa_(session) {
  if (cleanString_(session.id) === '1') return true;
  var KWS = ['super admin', 'superadmin', 'admin', 'administrator'];
  var pjRows = DB.prepare('SELECT j."name" AS jname, pj."status" AS pstatus FROM "pengurus_jabatan" pj LEFT JOIN "jabatan" j ON j."id" = pj."id_jabatan" WHERE pj."id_pengurus" = ?').all(cleanString_(session.id));
  var labels = pjRows.filter(function (r) {
    var s = cleanString_(r.pstatus).toLowerCase();
    return s === '' || s === 'aktif' || s === 'active';
  }).map(function (r) { return cleanString_(r.jname).toLowerCase(); }).filter(Boolean);
  return labels.some(function (l) { return KWS.some(function (k) { return l.indexOf(k) !== -1; }); });
}

// ── Koneksi Baileys ─────────────────────────────────────────────────────────────
function scheduleReconnect_() {
  if (waReconnectTimer) return;
  waReconnectTimer = setTimeout(function () {
    waReconnectTimer = null;
    startConnection_().catch(function (e) { waState.lastError = e.message || String(e); });
  }, 4000);
}

async function startConnection_() {
  if (waSocket || waConnectingLock) return;
  waConnectingLock = true;
  waState.status = 'connecting';
  waState.lastError = '';
  try {
    // Tiap langkah dibungkus try/catch sendiri & pesan errornya ditandai nama langkahnya --
    // supaya kalau gagal, admin langsung tahu PERSIS di langkah mana (baca folder sesi, ambil
    // versi Baileys, atau bikin koneksi) tanpa perlu buka log server sama sekali (pesannya
    // otomatis muncul di panel web lewat waState.lastError, lihat handleStatus_).
    var authRes;
    try {
      authRes = await useMultiFileAuthState(AUTH_DIR);
    } catch (e) {
      throw new Error('[baca folder sesi whatsapp-auth] ' + (e.message || e));
    }
    var state = authRes.state;
    var saveCreds = authRes.saveCreds;
    var version;
    try { version = (await fetchLatestBaileysVersion()).version; } catch (e) { version = undefined; }
    try {
      waSocket = makeWASocket({ auth: state, version: version, printQRInTerminal: false, browser: ['Pendataan Santri', 'Chrome', '1.0'] });
    } catch (e) {
      throw new Error('[bikin koneksi ke WhatsApp] ' + (e.message || e));
    }

    waSocket.ev.on('creds.update', saveCreds);
    waSocket.ev.on('connection.update', function (update) {
      if (update.qr) {
        waState.status = 'qr';
        QRCode.toDataURL(update.qr).then(function (dataUrl) { waState.qrDataUrl = dataUrl; }).catch(function () {});
      }
      if (update.connection === 'open') {
        waState.status = 'connected';
        waState.qrDataUrl = '';
        waState.lastError = '';
        var jid = cleanString_((waSocket && waSocket.user && waSocket.user.id) || '');
        waState.connectedNumber = jid.split(':')[0].split('@')[0];
      }
      if (update.connection === 'close') {
        var errOutput = update.lastDisconnect && update.lastDisconnect.error && update.lastDisconnect.error.output;
        var statusCode = errOutput && errOutput.statusCode;
        var loggedOut = statusCode === DisconnectReason.loggedOut;
        // Selalu dicatat ke log server (PENTING utk diagnosis -- sebelum ini, alasan
        // penutupan koneksi hilang tanpa jejak begitu masuk cabang loggedOut di bawah).
        console.error('[whatsapp] koneksi ditutup, statusCode=' + statusCode + ' loggedOut=' + loggedOut + ' pesan=' + ((update.lastDisconnect && update.lastDisconnect.error && update.lastDisconnect.error.message) || '-'));
        waSocket = null;
        if (loggedOut) {
          waState.status = 'disconnected';
          waState.qrDataUrl = '';
          waState.connectedNumber = '';
          waState.lastError = 'WhatsApp menutup sesi (kode ' + statusCode + ', kemungkinan konflik/logout dari sisi WhatsApp) sebelum sempat tersambung. Coba aktifkan & scan ulang; kalau berulang terus, kemungkinan ada masalah koneksi server ke WhatsApp atau aplikasi berjalan lebih dari 1 proses sekaligus.';
          waSettingsState.enabled = false;
          saveSettings_();
          try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (e) {}
        } else if (waSettingsState.enabled) {
          waState.status = 'connecting';
          waState.lastError = 'Koneksi terputus (statusCode ' + statusCode + '), mencoba menyambung ulang...';
          scheduleReconnect_();
        } else {
          waState.status = 'disconnected';
        }
      }
    });
  } catch (e) {
    waSocket = null;
    waState.status = 'disconnected';
    waState.lastError = e.message || String(e);
    console.error('[whatsapp] gagal memulai koneksi:', e.message || e);
    throw e;
  } finally {
    waConnectingLock = false;
  }
}

// logout=true: full unlink (hapus kredensial, wajib scan ulang). logout=false: cuma putus
// socket saat ini (dipakai saat toggle "Aktifkan" dimatikan) -- kredensial tetap disimpan,
// jadi nyalain lagi nanti tidak perlu scan ulang.
async function stopConnection_(logout) {
  if (waReconnectTimer) { clearTimeout(waReconnectTimer); waReconnectTimer = null; }
  if (waSocket) {
    try { if (logout) await waSocket.logout(); else waSocket.end(undefined); } catch (e) {}
    waSocket = null;
  }
  waState.status = 'disconnected';
  waState.qrDataUrl = '';
  if (logout) {
    waState.connectedNumber = '';
    try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (e) {}
  }
}

function init() {
  if (waSettingsState.enabled) {
    startConnection_().catch(function (e) { waState.lastError = e.message || String(e); });
  }
}

// Modul ini SENGAJA tidak tahu apa pun soal "audit" (murni infrastruktur koneksi + kirim
// pesan) -- tapi tombol "Kirim Audit Sekarang" & jadwal otomatis butuh teks audit-nya, yg
// logikanya (baca AUDIT_BAWAHAN_KINDS_ dkk) cuma ada di server.js. Daripada whatsapp.js
// require('./server.js') (server.js bukan modul biasa, itu entry point yg langsung jalanin
// app.listen) atau bikin circular require, server.js yg DAFTARIN fungsi pembangun teksnya ke
// sini sekali sesudah mount router (lihat registerBroadcastTextBuilder di server.js dekat
// app.use('/api/whatsapp', ...)).
var broadcastTextBuilder = null;
function registerBroadcastTextBuilder(fn) { broadcastTextBuilder = fn; }

async function sendMessage(jid, text) {
  if (!waSocket || waState.status !== 'connected') throw createError_('WhatsApp belum terhubung.', 409);
  var target = cleanString_(jid);
  if (!target) throw createError_('ID grup/nomor tujuan wajib diisi.', 400);
  await waSocket.sendMessage(target, { text: cleanString_(text) });
}

// ── Handler HTTP ─────────────────────────────────────────────────────────────
function handleStatus_(req, res) {
  try {
    var session = authenticateFromToken_(req.query.token || '');
    if (!canManageWa_(session)) return res.status(403).json({ ok: false, error: { message: 'Hanya Admin/Super Admin yang dapat melihat status WhatsApp.', code: 403 } });
    res.json({
      ok: true, data: {
        enabled: !!waSettingsState.enabled,
        status: waState.status,
        qrDataUrl: waState.status === 'qr' ? waState.qrDataUrl : '',
        connectedNumber: waState.connectedNumber,
        lastError: waState.lastError,
        targets: waSettingsState.targets || [],
        scheduleTimes: waSettingsState.scheduleTimes || []
      }
    });
  } catch (e) {
    res.status(e.code || 500).json({ ok: false, error: { message: e.message || 'Gagal.', code: e.code || 500 } });
  }
}

function handleEnable_(req, res) {
  try {
    var session = authenticateFromToken_(req.body.token || '');
    if (!canManageWa_(session)) return res.status(403).json({ ok: false, error: { message: 'Hanya Admin/Super Admin yang dapat mengubah pengaturan WhatsApp.', code: 403 } });
    var enabled = req.body.enabled === true || req.body.enabled === 'true';
    waSettingsState.enabled = enabled;
    waSettingsState.setBy = session.name; waSettingsState.setAt = nowIso_();
    saveSettings_();
    if (enabled) {
      startConnection_().catch(function (e) { waState.lastError = e.message || String(e); });
    } else {
      stopConnection_(false);
    }
    res.json({ ok: true, data: { enabled: enabled } });
  } catch (e) {
    res.status(e.code || 500).json({ ok: false, error: { message: e.message || 'Gagal.', code: e.code || 500 } });
  }
}

function handleLogout_(req, res) {
  try {
    var session = authenticateFromToken_(req.body.token || '');
    if (!canManageWa_(session)) return res.status(403).json({ ok: false, error: { message: 'Hanya Admin/Super Admin yang dapat memutus WhatsApp.', code: 403 } });
    waSettingsState.enabled = false;
    waSettingsState.setBy = session.name; waSettingsState.setAt = nowIso_();
    saveSettings_();
    stopConnection_(true).then(function () {
      res.json({ ok: true, data: { message: 'WhatsApp diputus. Silakan sambungkan ulang & scan QR untuk memakai lagi.' } });
    }).catch(function (e) {
      res.status(500).json({ ok: false, error: { message: e.message || 'Gagal memutus.', code: 500 } });
    });
  } catch (e) {
    res.status(e.code || 500).json({ ok: false, error: { message: e.message || 'Gagal.', code: e.code || 500 } });
  }
}

function handleGroups_(req, res) {
  try {
    var session = authenticateFromToken_(req.query.token || '');
    if (!canManageWa_(session)) return res.status(403).json({ ok: false, error: { message: 'Hanya Admin/Super Admin yang dapat melihat daftar grup.', code: 403 } });
    if (!waSocket || waState.status !== 'connected') return res.status(409).json({ ok: false, error: { message: 'WhatsApp belum terhubung.', code: 409 } });
    waSocket.groupFetchAllParticipating().then(function (map) {
      var groups = Object.keys(map).map(function (id) {
        var g = map[id];
        return { id: id, name: cleanString_(g.subject) || id, participants: (g.participants || []).length };
      }).sort(function (a, b) { return a.name.localeCompare(b.name, 'id'); });
      res.json({ ok: true, data: { groups: groups } });
    }).catch(function (e) {
      res.status(500).json({ ok: false, error: { message: 'Gagal mengambil daftar grup: ' + (e.message || e), code: 500 } });
    });
  } catch (e) {
    res.status(e.code || 500).json({ ok: false, error: { message: e.message || 'Gagal.', code: e.code || 500 } });
  }
}

// Nomor perorangan (BUKAN grup) ditulis user bebas format (boleh pakai spasi/strip/+/awalan
// 0) -- dirapikan ke JID standar Baileys di sini: buang semua non-digit, awalan '0' diganti
// '62' (konvensi nomor Indonesia), lalu akhiri '@s.whatsapp.net'. ID grup (diambil dari dialog
// "Cek Grup", sudah dalam bentuk "xxxx@g.us") dibiarkan apa adanya, tidak melalui fungsi ini.
function normalizePhoneJid_(raw) {
  var digits = cleanString_(raw).replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.charAt(0) === '0') digits = '62' + digits.slice(1);
  return digits + '@s.whatsapp.net';
}

function handleTargetAdd_(req, res) {
  try {
    var session = authenticateFromToken_(req.body.token || '');
    if (!canManageWa_(session)) return res.status(403).json({ ok: false, error: { message: 'Hanya Admin/Super Admin yang dapat mengatur tujuan pengiriman.', code: 403 } });
    var type = cleanString_(req.body.type) === 'number' ? 'number' : 'group';
    var id = type === 'number' ? normalizePhoneJid_(req.body.id) : cleanString_(req.body.id);
    if (!id) return res.status(400).json({ ok: false, error: { message: 'ID/nomor tujuan wajib diisi.', code: 400 } });
    var name = cleanString_(req.body.name) || id;
    var targets = (waSettingsState.targets || []).filter(function (t) { return t.id !== id; });
    targets.push({ id: id, name: name, type: type });
    waSettingsState.targets = targets;
    waSettingsState.setBy = session.name; waSettingsState.setAt = nowIso_();
    saveSettings_();
    res.json({ ok: true, data: { targets: waSettingsState.targets } });
  } catch (e) {
    res.status(e.code || 500).json({ ok: false, error: { message: e.message || 'Gagal.', code: e.code || 500 } });
  }
}

function handleTargetRemove_(req, res) {
  try {
    var session = authenticateFromToken_(req.body.token || '');
    if (!canManageWa_(session)) return res.status(403).json({ ok: false, error: { message: 'Hanya Admin/Super Admin yang dapat mengatur tujuan pengiriman.', code: 403 } });
    var id = cleanString_(req.body.id);
    waSettingsState.targets = (waSettingsState.targets || []).filter(function (t) { return t.id !== id; });
    waSettingsState.setBy = session.name; waSettingsState.setAt = nowIso_();
    saveSettings_();
    res.json({ ok: true, data: { targets: waSettingsState.targets } });
  } catch (e) {
    res.status(e.code || 500).json({ ok: false, error: { message: e.message || 'Gagal.', code: e.code || 500 } });
  }
}

// Format jam WAJIB "HH:MM" (24 jam) -- divalidasi di sini biar scheduler di server.js
// (bandingkan string HH:MM langsung, tanpa parsing lagi) selalu dapat data yang sudah bersih.
function isValidTimeStr_(s) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(cleanString_(s)); }

function handleScheduleSave_(req, res) {
  try {
    var session = authenticateFromToken_(req.body.token || '');
    if (!canManageWa_(session)) return res.status(403).json({ ok: false, error: { message: 'Hanya Admin/Super Admin yang dapat mengatur jadwal.', code: 403 } });
    var times = Array.isArray(req.body.times) ? req.body.times.map(cleanString_) : [];
    var invalid = times.filter(function (t) { return !isValidTimeStr_(t); });
    if (invalid.length) return res.status(400).json({ ok: false, error: { message: 'Format jam tidak valid: ' + invalid.join(', ') + ' (harus HH:MM).', code: 400 } });
    waSettingsState.scheduleTimes = Array.from(new Set(times)).sort();
    waSettingsState.setBy = session.name; waSettingsState.setAt = nowIso_();
    saveSettings_();
    res.json({ ok: true, data: { scheduleTimes: waSettingsState.scheduleTimes } });
  } catch (e) {
    res.status(e.code || 500).json({ ok: false, error: { message: e.message || 'Gagal.', code: e.code || 500 } });
  }
}

// Kirim pesan uji coba ke SEMUA target tersimpan sekaligus (bukan cuma 1) -- konsisten dgn
// broadcast jadwal beneran (dibangun di server.js, lihat buildAuditBawahanBroadcastText_ +
// runWaScheduleCheck_) yg juga kirim ke semua target. Gagal di 1 target tidak menghentikan
// pengiriman ke target lain -- hasil per-target dikembalikan biar admin tahu mana yg gagal.
function handleSendTest_(req, res) {
  try {
    var session = authenticateFromToken_(req.body.token || '');
    if (!canManageWa_(session)) return res.status(403).json({ ok: false, error: { message: 'Hanya Admin/Super Admin yang dapat mengirim pesan uji coba.', code: 403 } });
    var text = cleanString_(req.body.text) || 'Tes koneksi WhatsApp dari Pendataan Santri.';
    var targets = waSettingsState.targets || [];
    if (!targets.length) return res.status(400).json({ ok: false, error: { message: 'Belum ada target (grup/nomor) yang disimpan.', code: 400 } });
    Promise.all(targets.map(function (t) {
      return sendMessage(t.id, text).then(function () { return { id: t.id, name: t.name, ok: true }; })
        .catch(function (e) { return { id: t.id, name: t.name, ok: false, error: e.message || String(e) }; });
    })).then(function (results) {
      var failed = results.filter(function (r) { return !r.ok; });
      res.json({ ok: true, data: { message: failed.length ? ('Terkirim ke ' + (results.length - failed.length) + '/' + results.length + ' target.') : 'Pesan uji coba terkirim ke semua target.', results: results } });
    });
  } catch (e) {
    res.status(e.code || 500).json({ ok: false, error: { message: e.message || 'Gagal.', code: e.code || 500 } });
  }
}

// Tombol "Kirim Audit Sekarang" -- sama persis logikanya dgn broadcast terjadwal
// (runWaScheduleCheck_ di server.js), tapi dipicu manual & langsung (tidak nunggu jam
// jadwal). Dipakai jg oleh dokumentasi/keputusan user 2026-08-06: "tambahkan tombol kirim
// audit langsung".
function handleBroadcastSendNow_(req, res) {
  try {
    var session = authenticateFromToken_(req.body.token || '');
    if (!canManageWa_(session)) return res.status(403).json({ ok: false, error: { message: 'Hanya Admin/Super Admin yang dapat mengirim audit ke WhatsApp.', code: 403 } });
    if (typeof broadcastTextBuilder !== 'function') return res.status(500).json({ ok: false, error: { message: 'Pembangun teks audit belum siap.', code: 500 } });
    var targets = waSettingsState.targets || [];
    if (!targets.length) return res.status(400).json({ ok: false, error: { message: 'Belum ada target (grup/nomor) WhatsApp yang disimpan.', code: 400 } });
    var text;
    try { text = broadcastTextBuilder(); } catch (e) { return res.status(500).json({ ok: false, error: { message: 'Gagal menyusun teks audit: ' + (e.message || e), code: 500 } }); }
    if (!text) return res.status(400).json({ ok: false, error: { message: 'Tidak ada audit yang perlu dikirim saat ini (semua sudah lengkap, atau belum ada tahun ajaran aktif).', code: 400 } });
    Promise.all(targets.map(function (t) {
      return sendMessage(t.id, text).then(function () { return { id: t.id, name: t.name, ok: true }; })
        .catch(function (e) { return { id: t.id, name: t.name, ok: false, error: e.message || String(e) }; });
    })).then(function (results) {
      var failed = results.filter(function (r) { return !r.ok; });
      res.json({ ok: true, data: { message: failed.length ? ('Terkirim ke ' + (results.length - failed.length) + '/' + results.length + ' target.') : 'Audit terkirim ke semua target.', results: results } });
    });
  } catch (e) {
    res.status(e.code || 500).json({ ok: false, error: { message: e.message || 'Gagal.', code: e.code || 500 } });
  }
}

// PENTING: status koneksi WA berubah tiap detik (qr/connecting/connected) dan tidak boleh
// sekalipun kena cache proxy/CDN di depan Node (mis. LSCache bawaan LiteSpeed di banyak
// shared hosting) -- kalau ke-cache, GET /status bisa terus-terusan jawab data BASI walau
// data aslinya (file whatsappSettings.json / status Baileys yg sebenarnya) sudah berubah,
// persis gejala "toggle aktif tapi baliknya keliatan false lagi" yg pernah kejadian. Header
// ini SENGAJA dipasang di modul ini sendiri (bukan cuma andalkan applyNoStoreHeaders_ di
// server.js) karena router ini di-mount terpisah lewat app.use('/api/whatsapp', ...), tidak
// otomatis lewat helper tsb.
function noStoreMiddleware_(req, res, next) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
}

function createRouter() {
  var router = express.Router();
  router.use(noStoreMiddleware_);
  router.get('/status', handleStatus_);
  router.post('/enable', express.json(), handleEnable_);
  router.post('/logout', express.json(), handleLogout_);
  router.get('/groups', handleGroups_);
  router.post('/target/add', express.json(), handleTargetAdd_);
  router.post('/target/remove', express.json(), handleTargetRemove_);
  router.post('/schedule/save', express.json(), handleScheduleSave_);
  router.post('/send-test', express.json(), handleSendTest_);
  router.post('/broadcast/send-now', express.json(), handleBroadcastSendNow_);
  return router;
}

module.exports = { createRouter: createRouter, init: init, sendMessage: sendMessage, getTargets: getTargets, getScheduleTimes: getScheduleTimes, registerBroadcastTextBuilder: registerBroadcastTextBuilder, settingsPath: WA_SETTINGS_PATH, reloadSettings: reloadSettings };
