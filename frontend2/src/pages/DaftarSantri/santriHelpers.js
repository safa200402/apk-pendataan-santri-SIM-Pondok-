// Helper murni dipindah apa adanya dari frontend/pages/daftarSantri/index.html supaya
// aturan bisnis (urutan status, dsb) tetap identik antara frontend lama & frontend2.

export function normalizeSantriStatusValue(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'aktif' || normalized === 'active') return 'Active'
  if (normalized === 'dibekukan' || normalized === 'beku' || normalized === 'frozen') return 'Dibekukan'
  if (normalized === 'nonaktif' || normalized === 'inactive' || normalized === 'inavtive') return 'Inactive'
  return String(value || '').trim()
}

export function getSantriStatusKey(value) {
  const normalized = normalizeSantriStatusValue(value).toLowerCase()
  if (normalized === 'inactive') return 'inactive'
  if (normalized === 'dibekukan') return 'dibekukan'
  return 'active'
}

export function formatSantriStatusLabel(value) {
  const normalized = normalizeSantriStatusValue(value).toLowerCase()
  if (normalized === 'active') return 'Aktif'
  if (normalized === 'dibekukan') return 'Dibekukan'
  if (normalized === 'inactive') return 'Nonaktif'
  return String(value || '').trim() || '-'
}

export function resolveAssetUrl(url) {
  if (!url) return ''
  const s = String(url)
  if (s.startsWith('data:') || s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/')) return s
  return '/' + s
}

export function getPhotoInitials(name) {
  return (
    String(name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('') || '?'
  )
}

export function isPdfName(name) {
  return /\.pdf(\?|#|$)/i.test(String(name || ''))
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Gagal membaca file.'))
    reader.readAsDataURL(file)
  })
}

export function fmtViewDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d)) return String(value)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatPersonList(list) {
  return Array.isArray(list) && list.length ? list.join(', ') : '-'
}

export function normalizeSantriGender(value) {
  const v = String(value || '').trim().toLowerCase()
  if (['l', 'lk', 'laki-laki', 'laki', 'pria', 'male'].includes(v)) return 'male'
  if (['p', 'pr', 'perempuan', 'wanita', 'female'].includes(v)) return 'female'
  return ''
}

export function isSantriBaru(item) {
  const createdAt = item && item.record && item.record.created_at
  if (!createdAt) return false
  const created = new Date(createdAt)
  if (isNaN(created)) return false
  const oneMonthLater = new Date(created)
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1)
  return new Date() < oneMonthLater
}

export function truncateWords(text, maxWords) {
  const trimmed = String(text || '').trim()
  if (!trimmed) return '(belum diisi)'
  const words = trimmed.split(/\s+/)
  if (words.length <= maxWords) return trimmed
  return words.slice(0, maxWords).join(' ') + '...'
}

// getCardRowClass -- diisi caller pakai nama kelas CSS Module (lihat DaftarSantri.module.css:
// rowMale, rowFemale, rowMaleFrozen, dst), bukan string literal seperti frontend lama.
export function getCardRowKey(gender, statusKey) {
  if (statusKey === 'inactive') {
    if (gender === 'male') return 'rowMaleInactive'
    if (gender === 'female') return 'rowFemaleInactive'
    return 'rowNogenderInactive'
  }
  if (statusKey === 'dibekukan') {
    if (gender === 'male') return 'rowMaleFrozen'
    if (gender === 'female') return 'rowFemaleFrozen'
    return 'rowNogenderFrozen'
  }
  if (gender === 'male') return 'rowMale'
  if (gender === 'female') return 'rowFemale'
  return ''
}

export const AKAD_BADGE = {
  santri_biasa: { label: 'Santri Biasa', bg: '#f5f0eb', ink: '#4d4034' },
  calon_pengabdian: { label: 'Calon Pengabdian', bg: '#fff3e0', ink: '#e65100' },
  pengabdian: { label: 'Pengabdian', bg: '#e3f2fd', ink: '#1565c0' },
  selesai: { label: 'Selesai', bg: '#e8f5e9', ink: '#2e7d32' }
}

// Padanan countEmptySantriFields() frontend lama, tapi dihitung dari SANTRI_SECTIONS versi
// frontend2 (field `legacy: true` sudah di-drop dari config, jadi tidak ikut dihitung).
export function countEmptySantriFields(record, sections) {
  const r = record || {}
  let count = 0
  sections.forEach((section) => {
    section.fields.forEach((field) => {
      if (field.type === 'password') return
      const val = String(r[field.key] || '').trim().toLowerCase()
      if (!val || val === '-' || val === 'tidak ada' || val === 'none' || val === 'n/a') count += 1
    })
  })
  return count
}

// Status Akad (otomatis) -- dipakai di dialog Edit & Lihat, dan card ringkas.
export function computeAkadStatus(record) {
  const tgl = record.tanggal_masuk_dianggap
  const mb = parseInt(record.masa_belajar) || 0
  const mp = parseInt(record.masa_pengabdian) || 0
  const at = parseInt(record.akad_tambahan) || 0
  let statusKey = null
  let statusLabel = '—'
  let statusColor = '#999'
  if (tgl && mb) {
    const masuk = new Date(tgl)
    if (!isNaN(masuk)) {
      const total = mb + at
      const akhirBelajar = new Date(masuk)
      akhirBelajar.setFullYear(akhirBelajar.getFullYear() + total)
      const akhirPengabdian = new Date(akhirBelajar)
      akhirPengabdian.setFullYear(akhirPengabdian.getFullYear() + mp)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const calonStart = new Date(akhirBelajar)
      calonStart.setFullYear(calonStart.getFullYear() - 1)
      if (mp > 0 && today >= akhirPengabdian) {
        statusKey = 'selesai'
        statusLabel = 'Selesai'
        statusColor = '#2e7d32'
      } else if (today >= akhirBelajar) {
        statusKey = 'pengabdian'
        statusLabel = 'Pengabdian'
        statusColor = '#1565c0'
      } else if (today >= calonStart) {
        statusKey = 'calon_pengabdian'
        statusLabel = 'Calon Pengabdian'
        statusColor = '#e65100'
      } else {
        statusKey = 'santri_biasa'
        statusLabel = 'Santri Biasa'
        statusColor = '#4d4034'
      }
    }
  }
  const bgMap = { selesai: '#e8f5e9', pengabdian: '#e3f2fd', calon_pengabdian: '#fff3e0', santri_biasa: '#f5f0eb' }
  const bg = statusKey ? bgMap[statusKey] || '#f5f0eb' : '#f5f0eb'
  const note = !tgl ? 'Isi Tanggal Masuk Dianggap untuk menghitung' : !mb ? 'Isi Masa Belajar untuk menghitung' : ''
  const pengabdianReminder =
    statusKey === 'pengabdian' && getSantriStatusKey(record.status) !== 'dibekukan'
      ? 'Santri sudah masuk masa Pengabdian — status santri harus diubah jadi Dibekukan (keterangan "pengabdian"). Hanya Admin/Super Admin yang bisa mengubahnya.'
      : ''
  return { statusLabel, statusColor, bg, note, pengabdianReminder }
}

// Konfirmasi hapus permanen berlapis: harus ketik "HAPUS" 5 kali berturut-turut, sama seperti
// frontend lama (data santri + seluruh riwayat ikut kehapus, sengaja diperketat).
export async function confirmHapusPermanenBerlapis(message) {
  for (let i = 1; i <= 5; i += 1) {
    const typed = window.prompt(`${message}\n\nKetik HAPUS untuk lanjut (konfirmasi ${i} dari 5).`)
    if (typed === null) return false
    if ((typed || '').trim().toUpperCase() !== 'HAPUS') return false
  }
  return true
}
