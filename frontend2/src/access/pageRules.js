// Padanan minimal dari frontend/shared-access.js (PAGE_RULES). Cuma diisi utk halaman yang
// SUDAH nyata di frontend2 -- jangan nebak aturan utk halaman placeholder yang belum ada
// logic-nya, biar nggak salah kunci akses nanti pas halaman itu beneran dikerjakan.
//
// allow(session) => true/false. Halaman tanpa entry di sini = default "boleh asal login"
// (lihat useAccess.js), SENGAJA permisif karena masih skeleton.
export const PAGE_RULES = {
  daftarSantri: {
    allow: (session) => !!(session && session.permissions && session.permissions.canViewSantri)
  }
}
