// Padanan SANTRI_SECTIONS di frontend/pages/daftarSantri/index.html. Field ber-`legacy: true`
// (sisa data lama, sudah tidak dipakai) SENGAJA di-drop -- tidak ada gunanya diulang di rewrite
// baru. Field `_status_akad` (computed, bukan input) juga di-drop dari sini, dirender terpisah
// lewat computeAkadStatus() di santriHelpers.js.
export const SANTRI_SECTIONS = [
  {
    title: 'Identitas inti',
    fields: [
      { key: 'nama_lengkap_akte', label: 'Nama lengkap sesuai akte', required: true },
      { key: 'nama_lengkap_kk', label: 'Nama lengkap sesuai KK' },
      { key: 'nama_setelah_diubah', label: 'Nama setelah diubah' },
      { key: 'nama_panggilan', label: 'Nama panggilan' },
      { key: 'catatan', label: 'Keterangan status', type: 'textarea' },
      { key: 'password', label: 'Password (kosongkan jika tidak ingin mengubah)', type: 'password' },
      { key: 'username', label: 'Username login (opsional, selain NIS)' },
      { key: 'no_induk', label: 'NIS', type: 'digits' },
      { key: 'nik', label: 'NIK', type: 'digits' },
      { key: 'jenis_kelamin_singkat', label: 'Jenis kelamin', type: 'select', options: ['L', 'P'] },
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Dibekukan', 'Inactive'] },
      { key: 'periode', label: 'Periode' },
      { key: 'angkatan', label: 'Angkatan (tahun)', type: 'year' }
    ]
  },
  {
    title: 'Akad',
    fields: [
      { key: 'tanggal_masuk_dianggap', label: 'Tanggal masuk', type: 'date' },
      { key: 'masa_belajar', label: 'Masa belajar sesuai akad', type: 'number', suffix: 'tahun' },
      { key: 'masa_pengabdian', label: 'Masa wajib pengabdian', type: 'number', suffix: 'tahun' },
      { key: 'akad_tambahan', label: 'Masa belajar tambahan', type: 'number', suffix: 'tahun' },
      { key: 'akad_tambahan_alasan', label: 'Alasan masa belajar tambahan', type: 'textarea' },
      { key: 'jenis_akad', label: 'Jenis akad', type: 'select', options: ['Mandiri', 'Subsidi', 'Beasiswa'] },
      { key: 'catatan_akad', label: 'Catatan tentang akad', type: 'textarea' }
    ]
  },
  {
    title: 'Data kelahiran',
    fields: [
      { key: 'tempat_lahir', label: 'Tempat lahir' },
      { key: 'tanggal_lahir', label: 'Tanggal lahir', type: 'date' }
    ]
  },
  {
    title: 'Kesehatan',
    fields: [
      { key: 'golongan_darah', label: 'Golongan darah', type: 'select', options: ['A', 'B', 'AB', 'O', 'Tidak tahu'] },
      { key: 'riwayat_penyakit', label: 'Riwayat penyakit / penyakit bawaan', type: 'textarea', placeholder: 'Cth: Asma sejak kecil; epilepsi; kelainan jantung bawaan. Tulis "-" bila tidak ada.' },
      { key: 'alergi', label: 'Alergi (makanan / obat / lainnya)', type: 'textarea', placeholder: 'Cth: Alergi udang & kepiting; alergi obat penisilin. Tulis "-" bila tidak ada.' },
      { key: 'kebutuhan_khusus', label: 'Kebutuhan khusus / disabilitas', type: 'textarea', placeholder: 'Cth: Gangguan penglihatan; ADHD. Tulis "-" bila tidak ada.' },
      { key: 'obat_rutin', label: 'Obat / perawatan rutin', type: 'textarea', placeholder: 'Cth: Inhaler salbutamol saat asma kambuh. Tulis "-" bila tidak ada.' },
      { key: 'catatan_kesehatan', label: 'Catatan kesehatan lain', type: 'textarea', placeholder: 'Cth: Riwayat operasi usus buntu 2022; nomor BPJS.' }
    ]
  },
  {
    title: 'Alamat sekarang',
    fields: [
      { key: 'alamat_sekarang_tempat', label: 'Tempat alamat sekarang' },
      { key: 'alamat_sekarang_rt', label: 'RT alamat sekarang' },
      { key: 'alamat_sekarang_rw', label: 'RW alamat sekarang' },
      { key: 'alamat_sekarang_desa', label: 'Kel/Desa alamat sekarang' },
      { key: 'alamat_sekarang_kecamatan', label: 'Kecamatan alamat sekarang' },
      { key: 'alamat_sekarang_kota', label: 'Kota/Kab alamat sekarang' },
      { key: 'alamat_sekarang_provinsi', label: 'Provinsi alamat sekarang' },
      { key: 'alamat_sekarang_kode_pos', label: 'Kode pos alamat sekarang' }
    ]
  },
  {
    title: 'Orang tua dan wali',
    fields: [
      { key: 'ayah_nama', label: 'Nama ayah' },
      { key: 'ayah_ttl', label: 'TTL ayah' },
      { key: 'ayah_pekerjaan', label: 'Pekerjaan ayah' },
      { key: 'ibu_nama', label: 'Nama ibu' },
      { key: 'ibu_ttl', label: 'TTL ibu' },
      { key: 'ibu_pekerjaan', label: 'Pekerjaan ibu' },
      { key: 'wali_nama', label: 'Nama wali' },
      { key: 'wali_ttl', label: 'TTL wali' },
      { key: 'wali_pekerjaan', label: 'Pekerjaan wali' }
    ]
  },
  {
    title: 'Alamat KTP',
    fields: [
      { key: 'alamat_ktp_tempat', label: 'Tempat alamat KTP' },
      { key: 'alamat_ktp_rt', label: 'RT alamat KTP' },
      { key: 'alamat_ktp_rw', label: 'RW alamat KTP' },
      { key: 'alamat_ktp_desa', label: 'Kel/Desa alamat KTP' },
      { key: 'alamat_ktp_kecamatan', label: 'Kecamatan alamat KTP' },
      { key: 'alamat_ktp_kota', label: 'Kota/Kab alamat KTP' },
      { key: 'alamat_ktp_provinsi', label: 'Provinsi alamat KTP' }
    ]
  },
  {
    title: 'Administrasi',
    fields: [
      { key: 'admin_kk', label: 'KK administrasi', type: 'file_doc' },
      { key: 'admin_ktp', label: 'KTP administrasi', type: 'file_doc' },
      { key: 'admin_akta', label: 'Akta administrasi', type: 'file_doc' },
      { key: 'no_hp', label: 'No HP' }
    ]
  },
  {
    title: 'Program dan jaminan',
    fields: [
      { key: 'tanggal_keluar', label: 'Tanggal keluar Al Bashiroh', type: 'date' },
      { key: 'infaq_pengajar', label: 'Infaq pengajar' },
      { key: 'jaminan', label: 'Jaminan', type: 'file_doc' },
      { key: 'asal_sekolah', label: 'Asal sekolah' }
    ]
  }
]
