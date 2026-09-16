// Padanan ringkas frontend/shared-nav.js -- HANYA memuat entri yang halamannya sudah benar-benar
// ada di frontend2/src/pages. Jangan tambah link ke halaman yang belum dibuat (dead link).
// Grup & label judul sama dengan versi lama (lihat frontend/shared-nav.js) biar orientasinya
// tidak berubah buat pengguna.
export const NAV_GROUPS = [
  {
    title: 'Dashboard',
    items: [
      { label: 'Beranda', path: '/beranda' },
      { label: 'Dashboard Admin', path: '/dashboardAdmin' }
    ]
  },
  {
    title: 'Santri',
    items: [{ label: 'Daftar Santri', path: '/daftarSantri' }]
  },
  {
    title: 'Tahun Ajaran',
    items: [{ label: 'Tahun Ajaran', path: '/tahunAjaran' }]
  },
  {
    title: 'Halaqoh',
    items: [{ label: 'Edit Halaqoh', path: '/editHalaqoh' }]
  },
  {
    title: 'Kelas',
    items: [{ label: 'Edit Kelas', path: '/editKelas' }]
  },
  {
    title: 'Regu',
    items: [{ label: 'Edit Regu', path: '/editRegu' }]
  },
  {
    title: 'Pengaturan',
    items: [
      { label: 'Akun Saya', path: '/editAkun' },
      { label: 'Pengaturan Tampilan', path: '/pengaturanTampilan' }
    ]
  }
]
