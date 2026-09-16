/**
 * Modul "Nilai Wajib" untuk halaman pages/nilaiUjian.
 *
 * Fitur: admin/akademik bisa menetapkan nama nilai tertentu sebagai WAJIB di sebuah kelas,
 * lengkap dengan tanggal ujian + tanggal maksimal terlambat pengumpulan. Sistem kemudian
 * memeriksa apakah nama nilai wajib itu benar-benar ada di kelas (nilaiUp dgn jenis cocok)
 * dan apakah SEMUA santri di kelas tersebut sudah punya nilai-nya. Perilaku saat tenggat
 * terlambat terlewati tapi nilai masih kosong = murni PERINGATAN (tampil merah), tidak
 * mengunci/mengubah nilai apa pun (sesuai pilihan user: opsi B).
 *
 * Dipasang sebagai Express router terpisah lalu di-mount di server.js utama.
 */
'use strict';
var path = require('node:path');
var fs = require('node:fs');
var express = require('express');
var DatabaseSync = require('node:sqlite').DatabaseSync;

// SHARE konfigurasi DB path yang sama dgn server.js utama (lihat DATA_DIR di server.js).
var DATA_DIR = path.join(__dirname, 'data');
var DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'pendataan-santri.sqlite');
var DB = new DatabaseSync(DB_PATH);
DB.exec('PRAGMA journal_mode = WAL;');

// Schema tabel nilaiWajibUjian (auto-create kalau belum ada). Supaya tidak duplikasi definisi
// dgn server.js utama (yang juga sudah punya schema nilaiWajibUjian di SCHEMAS-nya), di sini
// cukup CREATE TABLE IF NOT EXISTS — keduanya kompatibel (kolom identik). Tabel ini
// menggantikan tabel lama "nilaiWajib" (tanpa tahun ajaran); migrasi data lama dijalankan
// sekali di server.js (migrateNilaiWajibUjianTahunAjaran_). Setiap aturan terikat ke
// "tahun_ajaran_id" -- model "ikut TA aktif otomatis": aturan dibuat & tampil hanya untuk
// tahun ajaran yang sedang aktif (tahunAjaran.is_aktif = '1').
DB.exec('CREATE TABLE IF NOT EXISTS "nilaiWajibUjian" (' +
  '_rowid INTEGER PRIMARY KEY AUTOINCREMENT,' +
  '"id" TEXT,"jenis" TEXT,"sesi" TEXT,"id_kelas" TEXT,"tahun_ajaran_id" TEXT,"tanggal" TEXT,"max_terlambat" TEXT,' +
  '"catatan" TEXT,"status" TEXT,' +
  '"created_by_id" TEXT,"created_by_name" TEXT,"updated_by_id" TEXT,"updated_by_name" TEXT,' +
  '"edit_history" TEXT,"created_at" TEXT,"updated_at" TEXT)');
// DB lama yang sempat kena versi awal tabel ini tanpa kolom tahun_ajaran_id: tambahkan.
try { DB.exec('ALTER TABLE "nilaiWajibUjian" ADD COLUMN "tahun_ajaran_id" TEXT'); } catch (e) {}

// Helper util (mini-clone dari yang ada di server.js utama, supaya modul ini mandiri).
function cleanString_(v) { return v === undefined || v === null ? '' : String(v).trim(); }
function nowIso_() {
  var APP_TIMEZONE = process.env.APP_TIMEZONE || process.env.TZ || 'Asia/Jakarta';
  var f = new Intl.DateTimeFormat('sv-SE', { timeZone: APP_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  var m = {}; f.formatToParts(new Date()).forEach(function (p) { m[p.type] = p.value; });
  return m.year + '-' + m.month + '-' + m.day + 'T' + m.hour + ':' + m.minute + ':' + m.second;
}
function parseIdList_(value) {
  if (Array.isArray(value)) return Array.from(new Set(value.map(cleanString_).filter(Boolean)));
  var raw = cleanString_(value); if (!raw) return [];
  if (raw.charAt(0) === '{' && raw.slice(-1) === '}') raw = raw.slice(1, -1);
  return Array.from(new Set(raw.split(/[\n,;]+/).map(cleanString_).filter(Boolean)));
}
function parseJsonList_(value) {
  if (Array.isArray(value)) return value;
  var raw = cleanString_(value); if (!raw) return [];
  try { var p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch (e) { return []; }
}
function assertValidDateOnly_(value, label) {
  var raw = cleanString_(value);
  var match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw createError_((label || 'Tanggal') + ' tidak valid.', 400);
  return raw;
}
function normalizeDateOnly_(value) {
  var raw = cleanString_(value); var m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? [m[1], m[2], m[3]].join('-') : '';
}
function createError_(message, code) { var e = new Error(message); e.code = code || 500; return e; }

// Parse input nama nilai wajib menjadi { jenis, sesi }. Sesi ujian sekarang ditulis
// langsung menyatu di nama (mis. "ujian-1", "ujian-2"), bukan field terpisah — supaya
// user tidak perlu ingat isi 2 kolom, cukup ketik satu nama.
function parseJenisSesiInput_(raw) {
  var s = cleanString_(raw).toLowerCase();
  if (!s) return null;
  var m = s.match(/^ujian[\s\-_]*(\d+)$/);
  if (m) return { jenis: 'ujian', sesi: String(parseInt(m[1], 10)) };
  if (s === 'ujian') return { jenis: 'ujian', sesi: '1' };
  if (s.indexOf('ujian') === 0) return null; // "ujian..." tapi format sesi tidak dikenali
  return { jenis: s, sesi: '1' };
}

// Baca semua baris nilaiWajibUjian. Kalau taId dikirim, dibatasi ke tahun ajaran itu saja.
function listNilaiWajibRows_(taId) {
  var ta = cleanString_(taId);
  var stmt = DB.prepare('SELECT _rowid AS __rowid, * FROM "nilaiWajibUjian"' +
    (ta ? ' WHERE "tahun_ajaran_id" = ?' : '') + ' ORDER BY _rowid ASC');
  var rows = ta ? stmt.all(ta) : stmt.all();
  return rows.map(function (r) {
    return Object.assign({}, r, { _rowNumber: Number(r.__rowid) + 1 });
  });
}
function findNilaiWajibRowById_(id) {
  var row = DB.prepare('SELECT _rowid AS __rowid, * FROM "nilaiWajibUjian" WHERE "id" = ?').get(cleanString_(id));
  if (!row) return null;
  return Object.assign({}, row, { _rowNumber: Number(row.__rowid) + 1 });
}
// ID unik global di seluruh tabel (lintas tahun ajaran), bukan per-TA -- supaya deep-link
// ?openHalaqoh= / edit / delete by-id tetap tidak ambigu meski aturan tiap TA terpisah.
function nextId_() {
  var row = DB.prepare('SELECT MAX(CAST("id" AS INTEGER)) AS mx FROM "nilaiWajibUjian"').get();
  return (row && !isNaN(parseInt(row.mx, 10)) ? parseInt(row.mx, 10) : 0) + 1;
}

// ── Normalisasi ──────────────────────────────────────────────────────────────
function normalizeNilaiWajibRow_(row) {
  return {
    id: cleanString_(row.id),
    jenis: cleanString_(row.jenis),
    sesi: cleanString_(row.sesi || '1'),
    kelasId: cleanString_(row.id_kelas),
    tahunAjaranId: cleanString_(row.tahun_ajaran_id),
    tanggal: cleanString_(row.tanggal),
    maxTerlambat: cleanString_(row.max_terlambat),
    catatan: cleanString_(row.catatan),
    status: cleanString_(row.status || 'Aktif'),
    active: cleanString_(row.status || 'Aktif').toLowerCase() !== 'nonaktif'
  };
}

// ── Dataset helper (baca referensi kelas & santri + nilaiUp) ──────────────────
function loadKelas_(kelasId) {
  // Ambil baris kelasSiang + roster id_santri (kolom id_murid) + id_pengajar.
  var row = DB.prepare('SELECT _rowid AS __rowid, * FROM "kelasSiang" WHERE "id" = ?').get(cleanString_(kelasId));
  if (!row) return null;
  return {
    id: cleanString_(row.id),
    name: cleanString_(row.name),
    tahunAjaranId: cleanString_(row.tahun_ajaran_id),
    santriIds: parseIdList_(row.id_murid),
    pengajarIds: parseIdList_(row.id_pengajar)
  };
}
function loadSantriName_(santriId) {
  var row = DB.prepare('SELECT "nama_setelah_diubah","nama_lengkap_akte","nama_panggilan" FROM "santri" WHERE "id" = ?').get(cleanString_(santriId));
  if (!row) return '';
  return cleanString_(row.nama_setelah_diubah) || cleanString_(row.nama_lengkap_akte) || cleanString_(row.nama_panggilan) || ('#' + santriId);
}
// Tahun ajaran yang sedang aktif (is_aktif='1'). Dipakai supaya agregasi nilai wajib
// hanya menghitung kelas di TA berjalan, bukan kelas dari TA lama yang masih tersimpan.
function getActiveTahunAjaranId_() {
  var row = DB.prepare('SELECT "id" FROM "tahunAjaran" WHERE "is_aktif" = \'1\' LIMIT 1').get();
  return row ? cleanString_(row.id) : '';
}
// Aturan nilai wajib boleh dikelola untuk tahun ajaran mana pun (bukan cuma TA aktif) --
// dialog "Atur Nilai Wajib" punya dropdown TA sendiri. Validasi id TA yang dikirim klien.
function tahunAjaranExists_(taId) {
  var id = cleanString_(taId);
  if (!id) return false;
  return !!DB.prepare('SELECT 1 FROM "tahunAjaran" WHERE "id" = ? LIMIT 1').get(id);
}
function loadTahunAjaranMeta_(taId) {
  var row = DB.prepare('SELECT "id","nama","is_aktif" FROM "tahunAjaran" WHERE "id" = ?').get(cleanString_(taId));
  if (!row) return null;
  return { id: cleanString_(row.id), nama: cleanString_(row.nama), isAktif: cleanString_(row.is_aktif) === '1' };
}
function loadNilaiUpForKelas_(kelasId) {
  return DB.prepare('SELECT * FROM "nilaiUp" WHERE "id_kelas" = ?').all(cleanString_(kelasId)).map(function (r) {
    return {
      id: cleanString_(r.id),
      jenis: cleanString_(r.jenis || 'up'),
      sesi: cleanString_(r.sesi || '1'),
      tanggal: cleanString_(r.tanggal),
      entries: parseJsonList_(r.detail_nilai),
      status: cleanString_(r.status || 'Aktif'),
      active: cleanString_(r.status || 'Aktif').toLowerCase() !== 'nonaktif'
    };
  });
}

// ── Cek status kelengkapan satu aturan nilaiWajib thd data kelas ───────────────
// Return { status: 'lengkap'|'belum'|'terlambat', totalSantri, terisi, kosong, kolomSesuai }
function evaluateNilaiWajib_(aturan, kelas, nilaiUpList, todayStr) {
  var result = { status: 'belum', totalSantri: 0, terisi: 0, kosong: 0, kolomSesuai: null, keterlambatan: false };
  if (!kelas) return result;
  var santriIds = kelas.santriIds || [];
  result.totalSantri = santriIds.length;

  // Cari kolom nilaiUp yang cocok dgn aturan (jenis sama; kalau jenis=ujian, sesi juga sama).
  // Kalau ada >1 baris aktif yg cocok (duplikat), ambil yg PERTAMA ditemukan -- konsisten
  // dgn upSessions.find()/latestByJenis di grid nilaiUjian (server.js:handleNilaiUpByKelas_),
  // supaya status kelengkapan di sini tidak kontradiksi dgn yg dilihat guru di grid.
  var match = null;
  nilaiUpList.forEach(function (n) {
    if (match) return;
    if (!n.active) return;
    if (n.jenis !== aturan.jenis) return;
    if (aturan.jenis === 'ujian' && cleanString_(n.sesi) !== cleanString_(aturan.sesi)) return;
    match = n;
  });
  if (!match) {
    // Tidak ada kolom nilai dgn nama/sesi itu sama sekali.
    result.keterlambatan = !!(aturan.maxTerlambat && todayStr > aturan.maxTerlambat);
    result.status = result.keterlambatan ? 'terlambat' : 'belum';
    return result;
  }
  result.kolomSesuai = { id: match.id, tanggal: match.tanggal };
  // Hitung santri yang sudah punya nilai.
  var nilaiMap = {};
  (match.entries || []).forEach(function (e) {
    var sid = cleanString_(e.id_santri || e.santriId);
    if (sid && cleanString_(e.nilai) !== '') nilaiMap[sid] = true;
  });
  santriIds.forEach(function (sid) { if (nilaiMap[sid]) result.terisi += 1; });
  result.kosong = result.totalSantri - result.terisi;
  // Status: lengkap (0 kosong), terlambat (ada kosong & sudah lewat max), belum (ada kosong & belum lewat)
  if (result.kosong === 0) {
    result.status = 'lengkap';
  } else {
    result.keterlambatan = !!(aturan.maxTerlambat && todayStr > aturan.maxTerlambat);
    result.status = result.keterlambatan ? 'terlambat' : 'belum';
  }
  return result;
}

// ── Handler utama ─────────────────────────────────────────────────────────────
// CATATAN: autentikasi/otorisasi sederhana di sini — token dicek via tabel pengurus
// (kompatibel dgn mekanisme server.js utama). Hanya pengurus aktif dgn permission
// canManageNilaiUp (pengajar/akademik/admin/superadmin) yang boleh.
function authenticateFromToken_(token) {
  var tok = cleanString_(token);
  if (!tok) throw createError_('Token tidak ditemukan.', 401);
  // Cari pengurus aktif dgn token ini di daftar token JSON-nya.
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

// Cek permission pengurus: boleh kelola nilai kelas? Cari jabatan aktif pengurus ini &
// label-nya mengandung keyword pengajar/akademik/admin/super admin (kompatibel dgn
// ACCESS_CONTROL di server.js utama). Jaga-jaga: super admin (id=1 atau jabatan Super Admin)
// selalu lolos.
function canManageNilai_(session, kelasId) {
  // Super admin / admin / akademik / pengajar keyword.
  var KWS = ['super admin', 'superadmin', 'admin', 'administrator', 'akademik', 'pengajar', 'guru', 'ustadz', 'ustadzah', 'operator'];
  // Ambil jabatan labels pengurus ini.
  var pjRows = DB.prepare('SELECT pj."id_jabatan" AS jid, j."name" AS jname, pj."status" AS pstatus FROM "pengurus_jabatan" pj LEFT JOIN "jabatan" j ON j."id" = pj."id_jabatan" WHERE pj."id_pengurus" = ?').all(cleanString_(session.id));
  var labels = pjRows.filter(function (r) {
    var s = cleanString_(r.pstatus).toLowerCase();
    return s === '' || s === 'aktif' || s === 'active';
  }).map(function (r) { return cleanString_(r.jname).toLowerCase(); }).filter(Boolean);
  var hasKw = labels.some(function (l) { return KWS.some(function (k) { return l.indexOf(k) !== -1; }); });
  // id=1 = primary super admin, selalu boleh.
  if (cleanString_(session.id) === '1') return true;
  if (!hasKw) return false;
  // Kalau admin/akademik/superadmin keyword -> boleh semua kelas. Kalau cuma pengajar/guru,
  // cek apakah dia pengajar/badal kelas ini.
  var isAdminLike = labels.some(function (l) {
    return ['super admin', 'superadmin', 'admin', 'administrator', 'akademik', 'operator'].some(function (k) { return l.indexOf(k) !== -1; });
  });
  if (isAdminLike) return true;
  // pengajar: harus jadi pengajar/badal kelas tsb.
  var kelas = loadKelas_(kelasId);
  if (!kelas) return false;
  return kelas.pengajarIds.indexOf(cleanString_(session.id)) !== -1;
}

// Cek permission pengurus untuk kelola aturan nilai wajib GLOBAL (admin/akademik/superadmin).
function canManageNilaiGlobal_(session) {
  var KWS = ['super admin', 'superadmin', 'admin', 'administrator', 'akademik', 'operator'];
  if (cleanString_(session.id) === '1') return true;
  var pjRows = DB.prepare('SELECT pj."id_jabatan" AS jid, j."name" AS jname, pj."status" AS pstatus FROM "pengurus_jabatan" pj LEFT JOIN "jabatan" j ON j."id" = pj."id_jabatan" WHERE pj."id_pengurus" = ?').all(cleanString_(session.id));
  var labels = pjRows.filter(function (r) {
    var s = cleanString_(r.pstatus).toLowerCase();
    return s === '' || s === 'aktif' || s === 'active';
  }).map(function (r) { return cleanString_(r.jname).toLowerCase(); }).filter(Boolean);
  return labels.some(function (l) { return KWS.some(function (k) { return l.indexOf(k) !== -1; }); });
}

// List semua aturan nilai wajib GLOBAL (id_kelas kosong = berlaku semua kelas) untuk satu
// tahun ajaran. Default = TA aktif; klien boleh kirim ?taId=<id> untuk melihat/kelola TA lain
// (dialog "Atur Nilai Wajib" punya dropdown TA). Kelengkapan dievaluasi thd kelas di TA itu.
function handleList_(req, res) {
  try {
    var session = authenticateFromToken_(req.query.token || '');
    var todayStr = nowIso_().slice(0, 10);
    var taId = cleanString_(req.query.taId) || getActiveTahunAjaranId_();
    var taMeta = taId ? loadTahunAjaranMeta_(taId) : null;
    if (!taId || !taMeta) return res.json({ ok: true, data: { items: [], today: todayStr, tahunAjaranId: '', tahunAjaran: null } });
    var rows = listNilaiWajibRows_(taId).map(normalizeNilaiWajibRow_).filter(function (r) { return r.active && !r.kelasId; });
    // Aturan global: evaluasi terhadap kelas aktif DI TAHUN AJARAN yang dipilih (kelas dari
    // TA lain tidak ikut dihitung, meski statusnya masih "Aktif" di database).
    var allKelas = DB.prepare('SELECT * FROM "kelasSiang"').all().map(function (row) {
      return {
        id: cleanString_(row.id), name: cleanString_(row.name),
        tahunAjaranId: cleanString_(row.tahun_ajaran_id),
        santriIds: parseIdList_(row.id_murid), pengajarIds: parseIdList_(row.id_pengajar),
        active: cleanString_(row.status || 'Aktif').toLowerCase() !== 'nonaktif'
      };
    }).filter(function (k) { return k.active && k.tahunAjaranId === taId; });

    var enriched = rows.map(function (r) {
      var kelasEvals = allKelas.map(function (k) {
        var nilaiUpList = loadNilaiUpForKelas_(k.id);
        return evaluateNilaiWajib_(r, k, nilaiUpList, todayStr);
      });
      var totalKelas = kelasEvals.length;
      var kelasLengkap = kelasEvals.filter(function (e) { return e.status === 'lengkap'; }).length;
      var kelasBelum = kelasEvals.filter(function (e) { return e.status === 'belum'; }).length;
      var kelasTerlambat = kelasEvals.filter(function (e) { return e.status === 'terlambat'; }).length;
      // Status agregat aturan: terlambat jika ada 1+ kelas terlambat, lengkap jika semua lengkap, dll.
      var aggStatus = kelasTerlambat > 0 ? 'terlambat' : (kelasLengkap === totalKelas ? 'lengkap' : 'belum');
      return Object.assign({}, r, {
        tanggalUjian: r.tanggal, maxTerlambat: r.maxTerlambat,
        completeness: { status: aggStatus, totalKelas: totalKelas, kelasLengkap: kelasLengkap, kelasBelum: kelasBelum, kelasTerlambat: kelasTerlambat }
      });
    });
    res.json({ ok: true, data: { items: enriched, today: todayStr, tahunAjaranId: taId, tahunAjaran: taMeta } });
  } catch (e) {
    res.status(e.code || 500).json({ ok: false, error: { message: e.message || 'Gagal.', code: e.code || 500 } });
  }
}

// Save (create/update) aturan nilai wajib GLOBAL (berlaku untuk semua kelas).
function handleSave_(req, res) {
  try {
    var session = authenticateFromToken_(req.body.token || req.query.token || '');
    var b = req.body || {};
    var id = cleanString_(b.id);
    var rawInput = cleanString_(b.jenis);
    // Tanggal ujian WAJIB diisi (2026-08-05): dipakai audit di kelolaAudit sbg patokan
    // "sudah waktunya isi nilai" (popup non-blocking) sebelum eskalasi ke "terlambat"
    // (popup blocking, tergantung max_terlambat) -- tanpa tanggal ujian, tidak ada dasar
    // buat nentuin kapan popup pertama itu mulai muncul. Lihat collectNilaiWajibGapItems_
    // di backend/server.js.
    if (!cleanString_(b.tanggal)) return res.status(400).json({ ok: false, error: { message: 'Tanggal ujian wajib diisi.', code: 400 } });
    var tanggal = assertValidDateOnly_(b.tanggal, 'Tanggal ujian');
    // Maks. terlambat WAJIB diisi juga (2026-08-05) -- tanpa ini, aturan tidak akan pernah
    // eskalasi ke tahap "terlambat" (blocking) di audit kelolaAudit, cuma nyangkut selamanya
    // di tahap "belum" (non-blocking) -- lihat collectNilaiWajibGapItems_ di backend/server.js.
    if (!cleanString_(b.maxTerlambat)) return res.status(400).json({ ok: false, error: { message: 'Tanggal maksimal terlambat wajib diisi.', code: 400 } });
    var maxTerlambat = assertValidDateOnly_(b.maxTerlambat, 'Tanggal maksimal terlambat');
    var catatan = cleanString_(b.catatan);

    if (!rawInput) return res.status(400).json({ ok: false, error: { message: 'Nama nilai wajib harus diisi.', code: 400 } });
    var parsed = parseJenisSesiInput_(rawInput);
    if (!parsed) return res.status(400).json({ ok: false, error: { message: 'Format tidak dikenali. Untuk ujian, tulis "ujian-1", "ujian-2", dst.', code: 400 } });
    var jenis = parsed.jenis;
    var sesi = parsed.sesi;
    if (maxTerlambat < tanggal) return res.status(400).json({ ok: false, error: { message: 'Tanggal maksimal terlambat tidak boleh sebelum tanggal ujian.', code: 400 } });
    if (!canManageNilaiGlobal_(session)) return res.status(403).json({ ok: false, error: { message: 'Anda tidak punya akses untuk mengatur nilai wajib.', code: 403 } });

    // Aturan terikat ke tahun ajaran. Klien (dropdown TA di dialog) kirim b.taId; default ke
    // TA aktif kalau tidak dikirim. Boleh TA mana pun asal id-nya valid.
    var taId = cleanString_(b.taId) || getActiveTahunAjaranId_();
    if (!taId || !tahunAjaranExists_(taId)) {
      return res.status(400).json({ ok: false, error: { message: 'Tahun ajaran tidak valid. Pilih tahun ajaran dulu.', code: 400 } });
    }

    var now = nowIso_();
    if (id) {
      var existing = findNilaiWajibRowById_(id);
      if (!existing) return res.status(404).json({ ok: false, error: { message: 'Aturan nilai wajib tidak ditemukan.', code: 404 } });
      DB.prepare('UPDATE "nilaiWajibUjian" SET "jenis"=?, "sesi"=?, "id_kelas"=?, "tahun_ajaran_id"=?, "tanggal"=?, "max_terlambat"=?, "catatan"=?, "status"=?, "updated_by_id"=?, "updated_by_name"=?, "updated_at"=? WHERE "id"=?')
        .run(jenis, sesi, '', taId, tanggal, maxTerlambat, catatan, 'Aktif', cleanString_(session.id), cleanString_(session.name), now, id);
      return res.json({ ok: true, data: { id: id, message: 'Aturan nilai wajib diperbarui.' } });
    }
    var newId = String(nextId_());
    DB.prepare('INSERT INTO "nilaiWajibUjian" ("id","jenis","sesi","id_kelas","tahun_ajaran_id","tanggal","max_terlambat","catatan","status","created_by_id","created_by_name","updated_by_id","updated_by_name","created_at","updated_at") VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(newId, jenis, sesi, '', taId, tanggal, maxTerlambat, catatan, 'Aktif', cleanString_(session.id), cleanString_(session.name), cleanString_(session.id), cleanString_(session.name), now, now);
    return res.json({ ok: true, data: { id: newId, message: 'Aturan nilai wajib ditambahkan.' } });
  } catch (e) {
    res.status(e.code || 500).json({ ok: false, error: { message: e.message || 'Gagal menyimpan.', code: e.code || 500 } });
  }
}

// Hapus aturan nilai wajib (hard delete).
function handleDelete_(req, res) {
  try {
    var session = authenticateFromToken_(req.body.token || req.query.token || '');
    var id = cleanString_(req.body.id || req.query.id);
    if (!id) return res.status(400).json({ ok: false, error: { message: 'ID wajib diisi.', code: 400 } });
    var existing = findNilaiWajibRowById_(id);
    if (!existing) return res.status(404).json({ ok: false, error: { message: 'Aturan nilai wajib tidak ditemukan.', code: 404 } });
    // Aturan global — cek akses admin/akademik global. Aturan tahun ajaran mana pun boleh
    // dihapus (dialog "Atur Nilai Wajib" bisa memilih TA lewat dropdown-nya sendiri).
    if (!canManageNilaiGlobal_(session)) return res.status(403).json({ ok: false, error: { message: 'Akses ditolak.', code: 403 } });
    DB.prepare('DELETE FROM "nilaiWajibUjian" WHERE "id" = ?').run(id);
    return res.json({ ok: true, data: { id: id, message: 'Aturan nilai wajib dihapus.' } });
  } catch (e) {
    res.status(e.code || 500).json({ ok: false, error: { message: e.message || 'Gagal menghapus.', code: e.code || 500 } });
  }
}

// Endpoint khusus: status kelengkapan semua nilai wajib di satu kelas (untuk indikator di UI).
function handleByKelas_(req, res) {
  try {
    var session = authenticateFromToken_(req.query.token || '');
    var kelasId = cleanString_(req.query.kelasId);
    if (!kelasId) return res.status(400).json({ ok: false, error: { message: 'kelasId wajib diisi.', code: 400 } });
    var kelas = loadKelas_(kelasId);
    if (!kelas) return res.status(404).json({ ok: false, error: { message: 'Kelas tidak ditemukan.', code: 404 } });
    var todayStr = nowIso_().slice(0, 10);
    // Badge kelengkapan per kelas dievaluasi pakai aturan tahun ajaran KELAS itu sendiri
    // (bukan selalu TA aktif) -- supaya saat melihat kelas dari TA lain, badge-nya nyambung.
    var taId = cleanString_(kelas.tahunAjaranId) || getActiveTahunAjaranId_();
    if (!taId) return res.json({ ok: true, data: { kelasId: kelasId, kelasName: kelas.name, tahunAjaranId: '', items: [], summary: { total: 0, lengkap: 0, belum: 0, terlambat: 0 }, today: todayStr } });
    // Aturan global (id_kelas kosong) tahun ajaran ini berlaku untuk semua kelas TA tsb, termasuk kelas ini.
    var aturanList = listNilaiWajibRows_(taId).map(normalizeNilaiWajibRow_).filter(function (r) { return r.active && !r.kelasId; });
    var nilaiUpList = loadNilaiUpForKelas_(kelasId);
    var items = aturanList.map(function (a) {
      var ev = evaluateNilaiWajib_(a, kelas, nilaiUpList, todayStr);
      return Object.assign({}, a, { completeness: ev });
    });
    // Ringkasan agregat.
    var summary = { total: items.length, lengkap: items.filter(function (i) { return i.completeness.status === 'lengkap'; }).length, belum: items.filter(function (i) { return i.completeness.status === 'belum'; }).length, terlambat: items.filter(function (i) { return i.completeness.status === 'terlambat'; }).length };
    return res.json({ ok: true, data: { kelasId: kelasId, kelasName: kelas.name, tahunAjaranId: taId, items: items, summary: summary, today: todayStr } });
  } catch (e) {
    res.status(e.code || 500).json({ ok: false, error: { message: e.message || 'Gagal.', code: e.code || 500 } });
  }
}

// PENTING: data nilai wajib berubah tiap ada yg simpan/hapus aturan, dan endpoint ini di-
// mount terpisah (app.use('/api/nilaiwajib', ...), BUKAN lewat dispatcher utama /api yg
// sudah otomatis dipasangi header no-cache) -- tanpa ini, GET /list bisa kena cache proxy
// hosting (mis. LSCache LiteSpeed) & terus jawab data BASI walau aturan baru sudah tersimpan
// di database, persis bug yg sama pernah kejadian di backend/whatsapp.js.
function noStoreMiddleware_(req, res, next) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
}

// Buat & export Express router. Dipasang di server.js utama: app.use('/api/nilaiwajib', router)
function createRouter() {
  var router = express.Router();
  router.use(noStoreMiddleware_);
  router.get('/list', handleList_);
  router.post('/save', express.json(), handleSave_);
  router.post('/delete', express.json(), handleDelete_);
  router.get('/by-kelas', handleByKelas_);
  return router;
}

module.exports = { createRouter: createRouter };