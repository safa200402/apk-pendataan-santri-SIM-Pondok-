# CATATAN: Syarat Upload/Deploy Node.js Express ke Vercel

Ditulis setelah percobaan deploy project ini ke Vercel gagal (parse error duplikat fungsi, lalu 404 NOT_FOUND). Isinya syarat umum deploy Express ke Vercel + kenapa project ini belum memenuhi syarat-syarat tersebut.

## Syarat Umum Deploy Express ke Vercel

1. **Jangan pakai `app.listen()`**
   Express app harus di-*export* sebagai handler (`module.exports = app`), bukan dijalankan sebagai server yang nyala terus-menerus. Vercel menjalankan kode sebagai serverless function yang hidup sesaat per-request, bukan proses yang listen di satu port selamanya.

2. **Struktur folder `/api`**
   Butuh file entry (misalnya `api/index.js`) di root project. Vercel otomatis menganggap tiap file di folder `api/` sebagai 1 serverless function.

3. **File `vercel.json`**
   Wajib ada supaya Vercel tahu cara routing request. Minimal isinya:
   - `builds` — arahkan ke `api/index.js` pakai runtime `@vercel/node`
   - `routes` — arahkan semua path (`/(.*)`) ke function tersebut

   Tanpa file ini, Vercel tidak tahu request masuk harus diarahkan ke mana → hasilnya 404 NOT_FOUND walau build sukses.

4. **Koneksi database tidak boleh mengandalkan 1 proses yang hidup terus**
   Tiap request serverless bisa kena instance/container baru, jadi koneksi DB harus dibuat ulang tiap kali (connection pooling) atau pakai database yang memang serverless-friendly (bukan file lokal).

5. **Batas jumlah serverless function**
   Paket gratis (Hobby) maksimal 12 serverless function per deployment.

6. **Filesystem bersifat sementara (ephemeral)**
   Cuma folder `/tmp` yang bisa ditulis saat runtime, dan isinya TIDAK permanen — hilang tiap kali function di-restart/cold start/redeploy. Selain `/tmp`, filesystem bersifat read-only.

## Kenapa Project Ini Belum Memenuhi Syarat

| Syarat | Status di project ini |
|---|---|
| Tidak pakai `app.listen()` | ❌ Masih pakai (`backend/server.js` fungsi `startServer_()`, dipanggil dari `app.js`) |
| Struktur folder `/api` | ❌ Belum ada |
| File `vercel.json` | ❌ Belum ada sama sekali |
| Database tidak bergantung 1 proses persisten | ❌ Pakai SQLite **file lokal** (`node:sqlite` / `DatabaseSync`) — bukan database serverless-friendly |
| Filesystem permanen untuk data | ❌ SQLite file akan HILANG tiap cold start/redeploy karena filesystem ephemeral (kecuali dipindah ke `/tmp`, tapi itu pun tidak permanen) |
| Proses hidup terus utk koneksi eksternal | ❌ Ada koneksi WhatsApp (Baileys) yang butuh socket tetap hidup — tidak cocok dengan model serverless yang mati-hidup per-request |

## Kesimpulan

Project ini pada dasarnya adalah **server Node.js tradisional yang harus hidup terus** (stateful): pakai file database SQLite lokal + koneksi WhatsApp persisten. Arsitektur ini secara fundamental berbenturan dengan model Vercel (serverless, stateless, filesystem sementara).

Supaya bisa jalan normal di Vercel, minimal harus:
- Ubah `server.js` supaya bisa di-*export* sebagai handler (bukan `app.listen()`)
- Bikin folder `api/` + `vercel.json`
- Pindahkan database dari SQLite file lokal ke database eksternal (mis. Postgres/MySQL managed, atau layanan seperti Neon/PlanetScale/Turso)
- Pindahkan koneksi WhatsApp Baileys ke layanan terpisah yang berjalan di server persisten (VPS/Railway/Render), karena serverless tidak cocok untuk socket yang harus tetap hidup

**Alternatif yang lebih simpel:** deploy ke platform yang mendukung server Node.js persisten seperti **Railway**, **Render**, atau VPS biasa — tidak perlu ubah arsitektur apa pun, tinggal jalankan `npm start` seperti biasa.

## Sumber

- https://vercel.com/docs/frameworks/backend/express
- https://vercel.com/kb/guide/using-express-with-vercel
- https://www.geeksforgeeks.org/node-js/deploy-serverless-express-application-to-vercel/
- https://kuberns.com/blogs/vercel-node-js/
- https://community.vercel.com/t/deploying-express-app-to-vercel/7547
