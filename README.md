# Aplikasi Pendataan Santri

Aplikasi manajemen data pesantren (santri & pengurus) berbasis **Node.js + SQLite** di backend dan **HTML statis** di frontend — tanpa framework, tanpa build step.

Cakupan modul: data santri, halaqoh, kelas, regu, absensi, hafalan harian, nilai ujian/UAS, perkembangan & akhlak santri, jurnal SDM pengurus, audit kepatuhan berjenjang, pengumuman, jam digital, hingga backup/restore.

## Filosofi Desain

Proyek ini sengaja dibuat **anti-mainstream** dibanding stack modern pada umumnya, dengan satu tujuan utama: **kodenya harus mudah dibaca dan dipahami oleh AI coding assistant** (Claude Code, Cursor, dll), karena sebagian besar pengembangannya memang dikerjakan bersama AI.

### 1. Backend: sengaja hanya 3 file, dengan 1 file utama

Backend **tidak** dipecah menjadi puluhan file kecil ala `controllers/`, `services/`, `models/`, `routes/` seperti proyek Express pada umumnya. Alasannya: semakin banyak file kecil yang saling `require` satu sama lain, semakin sulit bagi AI (dan manusia) untuk mendapatkan gambaran utuh sebuah alur — AI harus melompat antar banyak file kecil hanya untuk mengikuti satu request sampai selesai.

Sebagai gantinya, backend hanya terdiri dari:

| File | Isi |
|---|---|
| [`backend/server.js`](backend/server.js) | **File utama.** Berisi hampir seluruh logika aplikasi: skema tabel, autentikasi & hak akses, seluruh action/endpoint, dan proses start server. Sengaja dibuat sebagai satu file besar (puluhan ribu baris) supaya AI bisa membaca satu alur fitur dari ujung ke ujung tanpa berpindah file. |
| [`backend/nilaiwajib.js`](backend/nilaiwajib.js) | Modul terpisah khusus fitur "Nilai Wajib" (penilaian wajib per kelas + tenggat). Dipisah karena scope-nya sempit dan cukup mandiri, dipasang sebagai Express router yang di-mount ke `server.js`. |
| [`backend/whatsapp.js`](backend/whatsapp.js) | Modul terpisah untuk integrasi WhatsApp (notifikasi/broadcast via Baileys), juga dipasang sebagai router terpisah. |

Prinsipnya: **jangan memecah file kecuali benar-benar independen.** Satu file besar yang linear jauh lebih mudah "dibaca sekali jalan" oleh AI daripada dua puluh file kecil yang saling memanggil.

Data disimpan di SQLite menggunakan modul bawaan Node.js (`node:sqlite`), bukan library pihak ketiga (`better-sqlite3`, dll) — mengurangi dependency dan native binding yang bisa bermasalah saat deploy. Setiap "sheet" (entitas seperti `santri`, `pengurus`, `jabatan`, `halaqoh`, dst) dipetakan ke satu tabel SQL yang skemanya didefinisikan di kode dan **dibuat otomatis** (`CREATE TABLE IF NOT EXISTS`) saat server pertama kali jalan — tidak perlu migrasi manual.

### 2. Frontend: HTML statis, sengaja tanpa framework

Frontend **tidak** memakai React, Next.js, Vue, atau bundler apa pun (Webpack/Vite). Setiap halaman adalah file HTML polos di [`frontend/pages/`](frontend/pages/), dengan JS vanilla di dalamnya, plus beberapa file `shared-*.js`/`shared-*.css` di root frontend yang dipakai bersama semua halaman:

| File bersama | Peran |
|---|---|
| `shared-shell.js` / `shared-shell.css` | Kerangka layout, session, dan bootstrap tiap halaman |
| `shared-access.js` | Aturan hak akses per halaman (`PAGE_RULES`) + resolusi permission dari jabatan |
| `shared-nav.js` | Menu navigasi (menyesuaikan halaman apa saja yang boleh dilihat pengguna) |
| `shared-ui.js` / `shared-ui.css` | Komponen & style UI yang dipakai berulang |
| `shared-audit.js`, `shared-export.js`, `shared-excel.js` | Util audit, export PDF/Excel |

Alasan tidak pakai framework: dengan ~78 halaman fitur, kompleksitas utama proyek ini ada pada **konsep per halaman dan kontrak endpoint-nya** (data apa yang dikirim, aturan akses apa yang berlaku, state apa yang perlu disinkronkan) — bukan pada komposisi komponen UI. HTML statis + JS vanilla membuat setiap halaman bisa langsung dibuka, dibaca, dan diubah tanpa proses build, tanpa JSX, dan tanpa lapisan abstraksi component tree yang justru menjauhkan AI (dan manusia) dari logika sebenarnya. Ini juga membuat iterasi jauh lebih cepat: tidak ada compile step, tinggal simpan file lalu refresh browser.

Backend dan frontend berjalan di **satu proses & satu port yang sama** — Express men-serve file statis di `frontend/` sekaligus meng-handle API, jadi tidak ada isu CORS maupun konfigurasi origin terpisah.

### Pola API: satu endpoint, berbasis `action`

Alih-alih puluhan route REST (`GET /api/santri`, `POST /api/santri`, dst), sebagian besar komunikasi frontend-backend lewat **satu endpoint** `POST/GET /api` dengan body/query berisi field `action` (mis. `login`, `santri.login`, `jabatan.list`, `export.data`, dst.), yang di-dispatch lewat `switch (action)` di `server.js`. Beberapa fitur yang butuh protokol berbeda (upload file besar, event stream jam digital, fingerprint bridge, WhatsApp) punya route Express khusus di luar pola ini.

## Cara Menjalankan

**Prasyarat:** Node.js versi 22.5+ (memakai modul bawaan `node:sqlite`, tidak perlu install database terpisah).

```bash
# 1. Install dependency
npm install

# 2. Jalankan server (production-style, tanpa auto-restart)
npm start

# atau, untuk development (auto-restart saat file berubah)
npm run dev
```

Setelah server jalan, buka:

```
http://localhost:3000
```

Frontend statis dan API sama-sama disajikan dari port ini (default `3000`, bisa diubah lewat env var `PORT`). Database SQLite (`backend/data/pendataan-santri.sqlite`) dan seluruh tabelnya dibuat otomatis saat server pertama kali start — tidak ada langkah setup database manual.

Variabel environment yang dikenali:

| Env var | Default | Kegunaan |
|---|---|---|
| `PORT` | `3000` | Port HTTP server |
| `APP_HOST` | `0.0.0.0` | Host yang di-bind (untuk akses dari LAN) |
| `DB_PATH` | `backend/data/pendataan-santri.sqlite` | Lokasi file database |

Di Windows, tersedia juga `start-backend.bat` yang otomatis mendeteksi IP LAN dan membuka firewall rule agar server bisa diakses dari perangkat lain di jaringan yang sama.

## Model Pengguna & Hak Akses

Ada dua jenis akun utama, login lewat halaman terpisah (`pages/login` untuk pengurus, `pages/loginSantri` untuk santri):

- **Santri** — akun dengan akses terbatas ke data dirinya sendiri (rekam jejak, nilai, kondisi/pelanggaran, pengumuman, dll).
- **Pengurus** — akun staf/pengajar/pengelola, dengan hak akses yang **bergantung pada jabatan** yang disandangnya. Satu akun pengurus bisa punya lebih dari satu jabatan sekaligus.

### Cara kerja pengecekan hak akses (auth flow)

Hak akses **tidak** dicek lewat daftar role tetap (seperti `admin`/`editor`/`viewer` pada umumnya), tapi lewat pencocokan **kata kunci jabatan**, dengan urutan pengecekan:

1. **Apakah akun ini pengurus atau santri?** (`session.role === 'pengurus' | 'santri'`) — santri langsung dibatasi ke action-action milik santri sendiri.
2. **Jabatan apa saja yang dimiliki akun ini?** Satu pengurus bisa memiliki banyak jabatan (`jabatanLabels`/`jabatanIds`), bukan cuma satu.
3. **Jabatan/scope mana yang sedang AKTIF?** Karena satu akun bisa multi-jabatan, pengguna memilih satu "scope" aktif (disimpan di `localStorage` sebagai `ps_role_scope`, dikirim di setiap request). Hak akses efektif untuk request itu dihitung dari jabatan yang sedang di-scope, bukan gabungan semua jabatan sekaligus — supaya perilaku UI konsisten dengan jabatan yang sedang "dipakai".
4. **Cocokkan label jabatan ke kata kunci akses generik.** Server hanya mengenal sekumpulan kata kunci jabatan generik di `ACCESS_CONTROL` (mis. `halaqohCoordinatorJabatanKeywords: ['koordinator halaqoh', 'kordinator halaqoh', 'koord halaqoh']`), **bukan** nama jabatan spesifik apa adanya. Jadi jabatan custom seperti *"Koordinator Halaqoh Ikhwan"* atau *"Koordinator Halaqoh Akhwat"* tetap otomatis dikenali sebagai bagian dari kelompok `halaqohCoordinator`, karena teksnya mengandung kata kunci `"koordinator halaqoh"`. Ini membuat admin bebas membuat variasi nama jabatan (per gender, per unit, dll) tanpa perlu mengubah kode.
5. Dari hasil pencocokan itu, dibangun objek `permissions` (flag seperti `isHalaqohCoordinator`, `canManageSantri`, `canManageKelasSiang`, dst.) yang dipakai untuk memutuskan action mana yang boleh dijalankan di backend, dan halaman mana yang boleh diakses di frontend (`PAGE_RULES` di `shared-access.js`, logikanya sengaja disinkronkan manual dengan `ACCESS_CONTROL` di `server.js`).

Jabatan tertentu (`Super Admin`, `Admin`) dan beberapa flag khusus (mis. penugasan sebagai pembina regu/pengampu halaqoh tertentu) bisa melewati/menambah aturan kata kunci di atas untuk kasus yang butuh pengecualian.
