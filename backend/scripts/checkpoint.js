const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, '..', 'data', 'pendataan-santri.sqlite');

console.log('Membuka:', DB_PATH);
const db = new DatabaseSync(DB_PATH);

const before = db.prepare('PRAGMA wal_checkpoint').get();
console.log('Status sebelum checkpoint:', JSON.stringify(before));

const result = db.prepare('PRAGMA wal_checkpoint(TRUNCATE)').get();
console.log('Hasil wal_checkpoint(TRUNCATE):', JSON.stringify(result));

if (result.busy) {
  console.log('Peringatan: ada koneksi lain yang masih aktif (server mungkin masih berjalan), checkpoint tidak lengkap.');
}

db.close();
console.log('Selesai. File -wal/-shm sudah digabungkan ke database utama.');
