// Dipindah dari frontend/shared-access.js (getRoleScopeOptions/buildScopedPermissions/
// getScopedSession/setRoleScope) -- BUKAN sekadar ganti teks chip, tapi mesin permission
// yang sama: pengurus dgn 2+ jabatan bisa "lihat sebagai" salah satu jabatannya, dan
// session.permissions ikut dihitung ulang sesuai jabatan itu (dipakai semua canManageX
// di seluruh halaman lewat session.permissions yang sudah discope).
//
// PENTING: ini murni penyaring tampilan di client -- backend TETAP mengecek permission asli
// pengguna di server utk setiap aksi tulis. Salah pilih scope tidak membuka akses baru,
// cuma menyembunyikan/menampilkan tombol sesuai jabatan yang dipilih utk dilihat.
//
// SYNC: keyword ini harus sama dengan ACCESS_CONTROL di backend/server.js dan ACCESS_KEYWORDS
// di frontend/shared-access.js.
const ACCESS_KEYWORDS = {
  admin: ['admin', 'administrator', 'operator'],
  mudir: ['mudir', 'mudiroh', "mudir 'amm", 'mudir amm', "mudirul ma'had", 'mudirul mahad'],
  halaqohCoordinator: ['koordinator halaqoh', 'kordinator halaqoh', 'koord halaqoh'],
  pengampuHalaqoh: ['pengampu halaqoh', 'pengampu', 'musyrif halaqoh', 'murobbi halaqoh'],
  pengujiHafalan: ['penguji hafalan', 'penguji'],
  academic: ['akademik'],
  teacher: ['pengajar', 'ustadz', 'ustadzah', 'guru'],
  jamDigitalOperator: ['operator jam digital'],
  hukuman: ['bagian hukuman', 'hukuman', 'seksi hukuman', 'bidang hukuman', 'keamanan', 'seksi keamanan', 'bagian keamanan'],
  ksantrian: ['ksantrian', 'kesantrian', 'bagian kesantrian', 'staf kesantrian', 'seksi kesantrian', 'bidang kesantrian'],
  kesehatan: ['kesehatan', 'bagian kesehatan', 'seksi kesehatan', 'bidang kesehatan', 'klinik', 'uks', 'kesehatan santri'],
  sdm: ['sdm', 'sumber daya manusia', 'hr', 'human resources', 'kepegawaian', 'personalia', 'bagian sdm', 'seksi sdm'],
  kebersihan: ['kebersihan', 'kebersihan lingkungan', 'bagian kebersihan', 'seksi kebersihan', 'bidang kebersihan', 'petugas kebersihan'],
  pembinaRegu: ['pembina regu', 'wali regu', 'musyrif regu'],
  mading: ['bagian mading', 'seksi mading', 'redaksi mading', 'tim mading', 'mading'],
  pengawasLapangan: ['pengawas lapangan'],
  ketuaYayasan: ['ketua yayasan'],
  pembinaYayasan: ['pembina yayasan']
}

const ROLE_SCOPE_STORAGE_KEY = 'ps_role_scope'

export function normalizeAccessText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasKeyword(tokens, keywords) {
  return (keywords || []).some((keyword) => {
    const target = normalizeAccessText(keyword)
    return tokens.some((token) => token === target || token.indexOf(target) !== -1)
  })
}

function clonePlainObject(object) {
  return Object.assign({}, object || {})
}

function uniqueList(items) {
  const seen = {}
  return (items || []).filter((item) => {
    const key = normalizeAccessText(item)
    if (!key || seen[key]) return false
    seen[key] = true
    return true
  })
}

function getPermissions(session) {
  return session && session.permissions ? session.permissions : null
}

export function getStoredRoleScope() {
  try {
    return localStorage.getItem(ROLE_SCOPE_STORAGE_KEY) || ''
  } catch (error) {
    return ''
  }
}

export function clearRoleScope() {
  try {
    localStorage.removeItem(ROLE_SCOPE_STORAGE_KEY)
  } catch (error) {
    // ignore
  }
}

export function getRoleScopeOptions(session) {
  if (!session || session.role !== 'pengurus') return []
  const permissions = getPermissions(session)
  const configured = uniqueList(
    (session && Array.isArray(session.roleScopeOptions) ? session.roleScopeOptions : []).concat(
      permissions && Array.isArray(permissions.roleScopeOptions) ? permissions.roleScopeOptions : []
    )
  )
  if (!configured.length) return []
  return configured.map((label) => ({ key: normalizeAccessText(label), label }))
}

function buildScopedPermissions(session, scopeLabel) {
  const permissions = clonePlainObject(getPermissions(session) || {})
  const defaultLabel = permissions.label || 'Super Admin'
  if (!scopeLabel || normalizeAccessText(scopeLabel) === normalizeAccessText(defaultLabel)) {
    return permissions
  }

  const tokens = [normalizeAccessText(scopeLabel)]
  const isJamDigitalOperator = hasKeyword(tokens, ACCESS_KEYWORDS.jamDigitalOperator)
  const isAdmin = !isJamDigitalOperator && hasKeyword(tokens, ACCESS_KEYWORDS.admin)
  const isBagianHukuman = hasKeyword(tokens, ACCESS_KEYWORDS.hukuman)
  const isKsantrian = hasKeyword(tokens, ACCESS_KEYWORDS.ksantrian)
  const isBagianKesehatan = hasKeyword(tokens, ACCESS_KEYWORDS.kesehatan)
  const isBagianSdm = hasKeyword(tokens, ACCESS_KEYWORDS.sdm)
  const isKebersihan = hasKeyword(tokens, ACCESS_KEYWORDS.kebersihan)
  const isMudir = hasKeyword(tokens, ACCESS_KEYWORDS.mudir)
  const isHalaqohCoordinator = hasKeyword(tokens, ACCESS_KEYWORDS.halaqohCoordinator)
  const isPengampuHalaqoh = hasKeyword(tokens, ACCESS_KEYWORDS.pengampuHalaqoh)
  const isPengujiHafalan = hasKeyword(tokens, ACCESS_KEYWORDS.pengujiHafalan)
  const isAcademic = hasKeyword(tokens, ACCESS_KEYWORDS.academic)
  const hasTeacherAccess = hasKeyword(tokens, ACCESS_KEYWORDS.teacher)
  const isPembinaRegu = hasKeyword(tokens, ACCESS_KEYWORDS.pembinaRegu)
  const hasMading = hasKeyword(tokens, ACCESS_KEYWORDS.mading)
  const isPengawasLapangan = hasKeyword(tokens, ACCESS_KEYWORDS.pengawasLapangan)
  const isKetuaYayasan = hasKeyword(tokens, ACCESS_KEYWORDS.ketuaYayasan)
  const isPembinaYayasan = hasKeyword(tokens, ACCESS_KEYWORDS.pembinaYayasan)
  const canManageHalaqoh = isAdmin || isHalaqohCoordinator || isPengampuHalaqoh
  const canManageKelasSiang = isAdmin || isAcademic
  const canManageNilaiUp = isAdmin || isAcademic || hasTeacherAccess
  const canManageKelasLevel = isAdmin || isAcademic || hasTeacherAccess
  const canManageAbsensi = isAdmin || isAcademic || isHalaqohCoordinator || isPengampuHalaqoh || hasTeacherAccess
  const canAccessJamDigital = isAdmin || isJamDigitalOperator
  const canManageJadwalIbadah = isAdmin || isHalaqohCoordinator
  const canManageJadwalPiket = isAdmin || isKebersihan
  const canAccessPanel = true
  const canViewSantri = canAccessPanel
  const accessLevel = isAdmin
    ? 'admin'
    : isMudir
      ? 'mudir'
      : isJamDigitalOperator
        ? 'operator_jam_digital'
        : isAcademic
          ? 'akademik'
          : isHalaqohCoordinator
            ? 'koordinator_halaqoh'
            : isPengampuHalaqoh
              ? 'pengampu_halaqoh'
              : isPengujiHafalan
                ? 'penguji_hafalan'
                : canManageNilaiUp
                  ? 'pengajar'
                  : isBagianKesehatan
                    ? 'kesehatan'
                    : isBagianSdm
                      ? 'sdm'
                      : isKsantrian
                        ? 'ksantrian'
                        : isKebersihan
                          ? 'kebersihan'
                          : isPembinaRegu
                            ? 'pembina_regu'
                            : hasMading
                              ? 'mading'
                              : isPengawasLapangan
                                ? 'pengawas_lapangan'
                                : 'staff'

  return Object.assign({}, permissions, {
    isSuperAdmin: false,
    isAdmin,
    isHalaqohCoordinator,
    isPengampuHalaqoh,
    isPengujiHafalan,
    isAcademic,
    isMudir,
    isPembinaRegu,
    hasMading,
    canDelete: false,
    canAccessPanel,
    canViewSantri,
    canManageSantri: isAdmin,
    canManagePengurus: isAdmin,
    canManageJabatan: false,
    canManageRegu: isAdmin || isKsantrian,
    canManageHalaqoh,
    canManageKelasSiang,
    canManageNilaiUp,
    canManageKelasLevel,
    canManageAbsensi,
    canManageKegiatanSop: isAdmin || isBagianSdm || isMudir,
    canManageContent: isAdmin || isMudir || hasMading || isAcademic,
    canAccessJamDigital,
    isBagianHukuman,
    isBagianKesehatan,
    isBagianSdm,
    isKsantrian,
    isKebersihan,
    isPengawasLapangan,
    isKetuaYayasan,
    isPembinaYayasan,
    canManageJadwalIbadah,
    canManageJadwalPiket,
    canAccessIzinPulang: isAdmin || isKsantrian,
    canManageBuku: isAdmin || isAcademic,
    canUploadSoal: isAdmin || isAcademic || hasTeacherAccess,
    canManageSoal: isAdmin || isAcademic,
    canManageKoordinatAbsensi: isAdmin || isBagianSdm,
    canManageSdmJurnalAll: isAdmin || isBagianSdm,
    canViewSdmJurnalAll: isMudir,
    canInputPelanggaran: true,
    canAssignHukuman: isAdmin || isBagianHukuman,
    canAccessSantriSakit: isAdmin || isBagianKesehatan || isKsantrian,
    canEditSantriSakit: isAdmin || isBagianKesehatan || isKsantrian,
    canImportData: false,
    canExportData: false,
    canExportAll: false,
    accessLevel,
    label: scopeLabel
  })
}

// session -> versi "discope" sesuai pilihan aktif di localStorage (kalau ada & valid).
// Dipakai sebagai SATU-SATUNYA session yang di-expose lewat useSession()/useAccess() --
// jadi semua halaman yang sudah baca session.permissions.X otomatis ikut ter-scope tanpa
// perlu diubah satu-satu.
export function getScopedSession(session) {
  const options = getRoleScopeOptions(session)
  if (!options.length) return session

  const permissions = getPermissions(session)
  const isSuperAdmin = !!(permissions && permissions.isSuperAdmin)
  let selectedScope = getStoredRoleScope()

  if (!selectedScope && !isSuperAdmin && options.length >= 2) {
    selectedScope = options[0].label
  }
  if (!selectedScope) return session

  const selected = options.find(
    (option) => option.key === normalizeAccessText(selectedScope) || normalizeAccessText(option.label) === normalizeAccessText(selectedScope)
  )
  if (!selected) {
    clearRoleScope()
    return session
  }

  const selectedLabel = selected.label
  if (normalizeAccessText(selectedLabel) === normalizeAccessText((permissions || {}).label || '')) {
    return session
  }

  const scoped = clonePlainObject(session)
  scoped.permissions = buildScopedPermissions(session, selectedLabel)
  scoped.scopeLabel = selectedLabel
  scoped.jabatanLabels = [selectedLabel]
  scoped.primaryJabatanLabel = selectedLabel
  return scoped
}

export function getActiveRoleScopeLabel(session) {
  const scoped = getScopedSession(session)
  return scoped && scoped.scopeLabel ? scoped.scopeLabel : ''
}

// Pilih scope baru. Balikin true kalau berhasil disimpan (caller lalu perlu bikin context
// re-render, mis. bump state counter -- localStorage sendiri tidak memicu re-render React).
export function setRoleScope(session, scopeLabel) {
  const options = getRoleScopeOptions(session)
  if (!options.length) {
    clearRoleScope()
    return
  }
  const normalizedScope = normalizeAccessText(scopeLabel)
  const selected = options.find((option) => option.key === normalizedScope || normalizeAccessText(option.label) === normalizedScope)
  if (!selected) {
    clearRoleScope()
    return
  }

  const activeLabel = getActiveRoleScopeLabel(session) || (getPermissions(session) || {}).label || ''
  if (normalizeAccessText(selected.label) === normalizeAccessText(activeLabel)) {
    clearRoleScope()
    return
  }

  const permissions = getPermissions(session)
  const isSuperAdmin = !!(permissions && permissions.isSuperAdmin)
  if (!isSuperAdmin && options.length >= 2 && normalizeAccessText(selected.label) === normalizeAccessText(options[0].label)) {
    clearRoleScope()
    return
  }

  try {
    localStorage.setItem(ROLE_SCOPE_STORAGE_KEY, selected.label)
  } catch (error) {
    // ignore
  }
}
