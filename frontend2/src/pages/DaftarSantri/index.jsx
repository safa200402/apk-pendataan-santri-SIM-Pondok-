import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useAccess } from '../../access/useAccess.js'
import SantriPagination from './SantriPagination.jsx'
import EditDialog from './EditDialog.jsx'
import ViewDialog from './ViewDialog.jsx'
import PlacementsDialog from './PlacementsDialog.jsx'
import HistoryDialog from './HistoryDialog.jsx'
import CatatanDialog from './CatatanDialog.jsx'
import InfoDialog from './InfoDialog.jsx'
import DuplicatesDialog from './DuplicatesDialog.jsx'
import DeleteAllDialog from './DeleteAllDialog.jsx'
import QuickImportDialog from './QuickImportDialog.jsx'
import ImportExcelDialog from './ImportExcelDialog.jsx'
import { downloadSantriTemplate, exportSantriExcel } from './excelHelpers.js'
import { SANTRI_SECTIONS } from './santriSections.js'
import {
  getSantriStatusKey,
  formatSantriStatusLabel,
  confirmHapusPermanenBerlapis,
  normalizeSantriGender,
  isSantriBaru,
  truncateWords,
  getCardRowKey,
  AKAD_BADGE,
  countEmptySantriFields,
  fmtViewDate
} from './santriHelpers.js'
import styles from './DaftarSantri.module.css'

const SORT_OPTIONS = [
  { value: 'updated_desc', label: 'Edit terbaru' },
  { value: 'updated_asc', label: 'Edit terlama' },
  { value: 'created_desc', label: 'Tambah terbaru' },
  { value: 'created_asc', label: 'Tambah terlama' },
  { value: 'name_asc', label: 'Nama A-Z' },
  { value: 'name_desc', label: 'Nama Z-A' },
  { value: 'id_asc', label: 'ID kecil-besar' },
  { value: 'id_desc', label: 'ID besar-kecil' },
  { value: 'gender_asc', label: 'Gender L-P' },
  { value: 'gender_desc', label: 'Gender P-L' },
  { value: 'no_induk_asc', label: 'NIS kecil-besar' },
  { value: 'no_induk_desc', label: 'NIS besar-kecil' },
  { value: 'tanggal_masuk_dianggap_asc', label: 'Tanggal masuk terlama' },
  { value: 'tanggal_masuk_dianggap_desc', label: 'Tanggal masuk terbaru' }
]

const DEFAULT_FILTERS = { status: '', gender: '', statusAkad: '', angkatan: '', sort: 'updated_desc', pageSize: 25 }

function statusClass(status) {
  const key = getSantriStatusKey(status)
  if (key === 'active') return styles.pillActive
  if (key === 'dibekukan') return styles.pillFrozen
  return styles.pillInactive
}

export default function DaftarSantri() {
  const { session, loading: accessLoading } = useAccess('daftarSantri')
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const [items, setItems] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [notice, setNotice] = useState('')
  const [noticeIsError, setNoticeIsError] = useState(false)
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const [infoOpen, setInfoOpen] = useState(null) // 'status' | 'consequence' | null

  const [editState, setEditState] = useState({ open: false, item: null })
  const [viewItem, setViewItem] = useState(null)
  const [placementsItem, setPlacementsItem] = useState(null)
  const [historyItem, setHistoryItem] = useState(null)

  const [catatan, setCatatan] = useState({ open: false, item: null, pendingLabel: '', value: '', saving: false })
  const [pendingStatusChange, setPendingStatusChange] = useState(null)

  const [duplicatesOpen, setDuplicatesOpen] = useState(false)
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const [quickImportOpen, setQuickImportOpen] = useState(false)
  const [toolExtrasOpen, setToolExtrasOpen] = useState(false)
  const [excelBusy, setExcelBusy] = useState(false)
  const [importFile, setImportFile] = useState(null)

  const permissions = (session && session.permissions) || {}
  const canManage = !!permissions.canManageSantri
  const canDelete = !!permissions.canDelete
  const canToggleInactive = canManage

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  useEffect(() => {
    setPage(1)
  }, [q])

  async function fetchList() {
    return api('santri.list', {
      page,
      pageSize: filters.pageSize,
      q: q.trim(),
      status: filters.status,
      gender: filters.gender,
      statusAkad: filters.statusAkad,
      angkatan: filters.angkatan,
      sort: filters.sort
    })
  }

  useEffect(() => {
    if (accessLoading) return
    let cancelled = false
    const timer = setTimeout(async () => {
      setNotice('Memuat data santri...')
      setNoticeIsError(false)
      try {
        const data = await fetchList()
        if (cancelled) return
        setItems(data.items || [])
        setTotalPages(data.totalPages || 1)
        setTotal(data.total || 0)
        setNotice('')
      } catch (error) {
        if (cancelled) return
        setNotice(error.message || 'Gagal memuat santri.')
        setNoticeIsError(true)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page, filters, accessLoading])

  async function reload() {
    try {
      const data = await fetchList()
      setItems(data.items || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch (error) {
      setNotice(error.message || 'Gagal memuat santri.')
      setNoticeIsError(true)
    }
  }

  function toggleExpanded(id) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleExpandAll() {
    const allExpanded = items.length > 0 && items.every((item) => expandedIds.has(item.id))
    setExpandedIds(allExpanded ? new Set() : new Set(items.map((item) => item.id)))
  }

  function openCatatanDialog(item, pendingLabel) {
    setCatatan({ open: true, item, pendingLabel: pendingLabel || '', value: item.catatan || '', saving: false })
  }

  function closeCatatanDialog() {
    setCatatan((prev) => ({ ...prev, open: false }))
    setPendingStatusChange(null)
  }

  async function saveCatatan() {
    const item = catatan.item
    if (!item) return
    setCatatan((prev) => ({ ...prev, saving: true }))
    try {
      await api('santri.catatan.save', { id: item.id, catatan: catatan.value }, 'POST')
      setItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, catatan: catatan.value } : entry)))
      setNotice('Keterangan status berhasil disimpan.')
      setNoticeIsError(false)
      setCatatan((prev) => ({ ...prev, open: false, saving: false }))
      const pending = pendingStatusChange && pendingStatusChange.id === item.id ? pendingStatusChange : null
      setPendingStatusChange(null)
      if (pending) {
        const freshItem = { ...item, catatan: catatan.value }
        if (pending.kind === 'toggle') await handleToggle(freshItem, true)
        else if (pending.kind === 'freeze') await handleFreeze(freshItem, true)
      }
    } catch (error) {
      setNotice(error.message || 'Gagal menyimpan keterangan status.')
      setNoticeIsError(true)
      setCatatan((prev) => ({ ...prev, saving: false }))
    }
  }

  async function handleToggle(item, fromCatatan) {
    if (!canToggleInactive) {
      setNotice('Hanya Admin dan Super Admin yang bisa mengubah status aktif/nonaktif santri.')
      setNoticeIsError(true)
      return
    }
    const nextActive = !item.active
    if (!nextActive && getSantriStatusKey(item.status) === 'active') {
      setNotice('Santri harus Dibekukan dulu sebelum bisa dinonaktifkan.')
      setNoticeIsError(true)
      return
    }
    if (!fromCatatan) {
      setPendingStatusChange({ kind: 'toggle', id: item.id })
      setNotice('Periksa / ubah Keterangan Status dulu, lalu klik Simpan untuk melanjutkan perubahan status.')
      setNoticeIsError(false)
      openCatatanDialog(item, nextActive ? 'akan diaktifkan kembali' : 'akan dinonaktifkan')
      return
    }
    if (!nextActive && !String(item.catatan || '').trim()) {
      setNotice('Keterangan Status wajib diisi sebelum menonaktifkan santri ini.')
      setNoticeIsError(true)
      setPendingStatusChange({ kind: 'toggle', id: item.id })
      openCatatanDialog(item, 'akan dinonaktifkan')
      return
    }
    if (!window.confirm(`${nextActive ? 'Aktifkan' : 'Nonaktifkan'} santri "${item.name}"?`)) return
    try {
      await api('santri.toggle', { id: item.id, active: nextActive }, 'POST')
      await reload()
    } catch (error) {
      setNotice(error.message || 'Gagal mengubah status santri.')
      setNoticeIsError(true)
    }
  }

  async function handleFreeze(item, fromCatatan) {
    if (!canManage) {
      setNotice('Hanya Admin dan Super Admin yang bisa mengubah status dibekukan.')
      setNoticeIsError(true)
      return
    }
    const currentKey = getSantriStatusKey(item.status)
    if (currentKey === 'inactive') {
      setNotice('Santri nonaktif hanya bisa diaktifkan kembali oleh Admin atau Super Admin.')
      setNoticeIsError(true)
      return
    }
    const nextStatus = currentKey === 'dibekukan' ? 'Active' : 'Dibekukan'
    if (!fromCatatan) {
      setPendingStatusChange({ kind: 'freeze', id: item.id })
      setNotice('Periksa / ubah Keterangan Status dulu, lalu klik Simpan untuk melanjutkan perubahan status.')
      setNoticeIsError(false)
      openCatatanDialog(item, nextStatus === 'Dibekukan' ? 'akan dibekukan' : 'akan diaktifkan normal')
      return
    }
    if (nextStatus === 'Dibekukan' && !String(item.catatan || '').trim()) {
      setNotice('Keterangan Status wajib diisi sebelum membekukan santri ini.')
      setNoticeIsError(true)
      setPendingStatusChange({ kind: 'freeze', id: item.id })
      openCatatanDialog(item, 'akan dibekukan')
      return
    }
    const confirmMsg =
      currentKey === 'dibekukan'
        ? `Aktifkan kembali status normal santri "${item.name}"?`
        : `Bekukan santri "${item.name}"? Santri tetap bisa masuk kelas, halaqoh, dan regu.`
    if (!window.confirm(confirmMsg)) return
    try {
      await api('santri.save', { record: { id: item.id, status: nextStatus } }, 'POST')
      await reload()
    } catch (error) {
      setNotice(error.message || 'Gagal mengubah status santri.')
      setNoticeIsError(true)
    }
  }

  async function handleDelete(item) {
    if (!canDelete) return
    const ok = await confirmHapusPermanenBerlapis(
      `Hapus PERMANEN santri "${item.name}"? Seluruh riwayat (nilai, hafalan, absensi, dll) ikut terhapus dan TIDAK BISA dipulihkan.`
    )
    if (!ok) {
      setNotice('Hapus permanen dibatalkan.')
      setNoticeIsError(true)
      return
    }
    try {
      await api('santri.delete', { id: item.id, confirm: 'HAPUS' }, 'POST')
      await reload()
    } catch (error) {
      setNotice(error.message || 'Gagal menghapus santri.')
      setNoticeIsError(true)
    }
  }

  async function handleResetAllPasswords() {
    if (!window.confirm('Reset SEMUA password seluruh santri ke "password123"?\n\nSemua santri harus ganti password setelah ini.')) return
    setNotice('Mereset semua password santri...')
    setNoticeIsError(false)
    try {
      const data = await api('santri.resetAllPasswords', {}, 'POST')
      setNotice(`Selesai. ${data.count} password santri berhasil direset ke default.`)
      setNoticeIsError(false)
    } catch (error) {
      setNotice(error.message || 'Gagal mereset password.')
      setNoticeIsError(true)
    }
  }

  async function handleExportTxtTempel() {
    setNotice('Menyiapkan export TXT tempel santri inti...')
    setNoticeIsError(false)
    try {
      const data = await api('santri.quickImportExport')
      const filename = data.filename || `santri-tempel-${Date.now()}.txt`
      const blob = new Blob([String(data.text || '')], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setNotice(`Export TXT tempel santri siap diunduh. Total ${Number(data.count || 0)} santri.`)
      setNoticeIsError(false)
    } catch (error) {
      setNotice(error.message || 'Gagal export TXT tempel santri inti.')
      setNoticeIsError(true)
    }
  }

  async function handleDownloadTemplate() {
    setExcelBusy(true)
    try {
      await downloadSantriTemplate()
    } catch (error) {
      setNotice(error.message || 'Gagal membuat template Excel.')
      setNoticeIsError(true)
    } finally {
      setExcelBusy(false)
    }
  }

  async function handleExportExcel() {
    setExcelBusy(true)
    try {
      await exportSantriExcel()
    } catch (error) {
      setNotice(error.message || 'Gagal export Excel.')
      setNoticeIsError(true)
    } finally {
      setExcelBusy(false)
    }
  }

  const allExpanded = items.length > 0 && items.every((item) => expandedIds.has(item.id))

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Daftar Santri ({total})</h1>
        <div className={styles.headerHelpBtns}>
          <button type="button" className={styles.helpBtn} aria-label="Penjelasan status santri" onClick={() => setInfoOpen('status')}>
            ?
          </button>
          <button
            type="button"
            className={styles.helpBtn}
            aria-label="Penjelasan data yang berubah saat status diubah"
            onClick={() => setInfoOpen('consequence')}
          >
            i
          </button>
        </div>
      </div>

      <div className={styles.filters}>
        <label className={styles.field}>
          <span>Cari nama, NIS, NIK, jenis akad</span>
          <input type="search" placeholder="Mis. Abdan, 232401..., subsidi" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Status</span>
          <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
            <option value="">Semua</option>
            <option value="active">Aktif</option>
            <option value="dibekukan">Dibekukan</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </label>
        <label className={styles.field}>
          <span>Jenis kelamin</span>
          <select value={filters.gender} onChange={(e) => updateFilter('gender', e.target.value)}>
            <option value="">Semua</option>
            <option value="male">{'🧊'} Laki-laki</option>
            <option value="female">{'🌸'} Perempuan</option>
          </select>
        </label>
        <label className={styles.field}>
          <span>Status Akad</span>
          <select value={filters.statusAkad} onChange={(e) => updateFilter('statusAkad', e.target.value)}>
            <option value="">Semua</option>
            <option value="santri_biasa">Santri Biasa</option>
            <option value="calon_pengabdian">Calon Pengabdian</option>
            <option value="pengabdian">Pengabdian</option>
            <option value="selesai">Selesai</option>
          </select>
        </label>
        <label className={styles.field}>
          <span>Angkatan (tahun)</span>
          <input
            value={filters.angkatan}
            inputMode="numeric"
            maxLength={4}
            placeholder="Semua angkatan"
            onChange={(e) => updateFilter('angkatan', e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
        </label>
        <label className={styles.field}>
          <span>Urutkan</span>
          <select value={filters.sort} onChange={(e) => updateFilter('sort', e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Jumlah per halaman</span>
          <select value={filters.pageSize} onChange={(e) => updateFilter('pageSize', Number(e.target.value))}>
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.toolbar}>
        {canManage && (
          <button type="button" className={styles.addBtn} onClick={() => setEditState({ open: true, item: null })}>
            Tambah santri
          </button>
        )}
        <button type="button" onClick={reload}>
          Muat ulang
        </button>
        <button type="button" onClick={toggleExpandAll} disabled={items.length === 0}>
          {allExpanded ? 'Tutup semua' : 'Buka semua'}
        </button>
        <button type="button" onClick={() => setDuplicatesOpen(true)}>
          Nama duplikat
        </button>
        {canDelete && (
          <button type="button" onClick={() => setToolExtrasOpen((v) => !v)} aria-expanded={toolExtrasOpen}>
            {toolExtrasOpen ? '−' : '+'}
          </button>
        )}
        {canDelete && toolExtrasOpen && (
          <>
            <button type="button" onClick={() => setQuickImportOpen(true)}>
              Tempel santri inti
            </button>
            <button type="button" onClick={handleExportTxtTempel}>
              Export TXT tempel
            </button>
            <button type="button" disabled={excelBusy} onClick={handleDownloadTemplate}>
              Template Excel
            </button>
            <button type="button" disabled={excelBusy} onClick={handleExportExcel}>
              Export Excel
            </button>
            <button type="button" onClick={() => document.getElementById('importExcelInput').click()}>
              Import Excel
            </button>
            <input
              id="importExcelInput"
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files && e.target.files[0]
                e.target.value = ''
                if (file) setImportFile(file)
              }}
            />
            <button type="button" onClick={handleResetAllPasswords}>
              Reset semua password
            </button>
            <button type="button" className={styles.danger} onClick={() => setDeleteAllOpen(true)}>
              Hapus semua data
            </button>
          </>
        )}
      </div>

      {notice && <p className={noticeIsError ? `${styles.notice} ${styles.noticeError}` : styles.notice}>{notice}</p>}

      <SantriPagination page={page} totalPages={totalPages} total={total} onChange={setPage} />

      <div className={styles.list}>
        {!notice && items.length === 0 && <p className={styles.notice}>Belum ada santri pada halaman ini.</p>}
        {items.map((item, index) => {
          const gender = normalizeSantriGender(item.jenisKelamin)
          const statusKey = getSantriStatusKey(item.status)
          const rowKey = getCardRowKey(gender, statusKey)
          const akad = item.statusAkad ? AKAD_BADGE[item.statusAkad] : null
          const expanded = expandedIds.has(item.id)
          const haqCount = Number(item.halaqohCountAktifTa || 0)
          const kelasCount = Number(item.kelasCountAktifTa || 0)
          const reguCount = Number(item.reguCountAktifTa || 0)
          const emptyCount = countEmptySantriFields(item.record, SANTRI_SECTIONS)

          return (
            <div key={item.id} className={`${styles.card} ${rowKey ? styles[rowKey] : ''}`}>
              <div className={styles.cardHead}>
                <div
                  className={styles.cardMain}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpanded(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') toggleExpanded(item.id)
                  }}
                >
                  <div className={styles.titleRow}>
                    {isSantriBaru(item) && <span className={styles.newBadge}>NEW</span>}
                    <strong className={styles.name}>{item.name || '-'}</strong>
                    {gender === 'male' && (
                      <span className={styles.pill} title="Laki-laki">
                        {'🧊'}
                      </span>
                    )}
                    {gender === 'female' && (
                      <span className={styles.pill} title="Perempuan">
                        {'🌸'}
                      </span>
                    )}
                    {akad && (
                      <span className={styles.pill} style={{ background: akad.bg, color: akad.ink }}>
                        {akad.label}
                      </span>
                    )}
                  </div>
                  <span className={styles.hint}>
                    {index + 1} pada halaman ini &middot; NIS {item.noInduk || '-'} &middot;{' '}
                    <strong style={{ color: haqCount === 1 ? '#2e7d32' : '#e65100' }}>Halaqoh {haqCount}</strong> &middot;{' '}
                    <strong style={{ color: kelasCount > 0 && kelasCount <= 3 ? '#2e7d32' : '#e65100' }}>Kelas {kelasCount}</strong>{' '}
                    &middot; <strong style={{ color: reguCount >= 1 ? '#2e7d32' : '#e65100' }}>Regu {reguCount}</strong> &middot;
                    Keterangan Status: {truncateWords(item.catatan, 7)}
                  </span>
                </div>
                <button type="button" onClick={() => setViewItem(item)}>
                  Lihat
                </button>
              </div>

              {expanded && (
                <div className={styles.cardDetail}>
                  <div className={styles.metaRow}>
                    <span className={`${styles.pill} ${statusClass(item.status)}`}>{formatSantriStatusLabel(item.status)}</span>
                    <span className={item.adminComplete ? styles.pill : `${styles.pill} ${styles.pillWarn}`}>
                      {item.adminComplete ? 'Admin lengkap' : 'Data admin belum lengkap'}
                    </span>
                    <span className={emptyCount ? `${styles.pill} ${styles.pillWarn}` : styles.pill}>
                      {emptyCount ? `${emptyCount} field kosong` : 'Data lengkap'}
                    </span>
                  </div>
                  <div className={styles.summaryBlock}>
                    <p>
                      <strong>NIS:</strong> {item.noInduk || '-'}
                    </p>
                    <p>
                      <strong>NIK:</strong> {item.nik || '-'}
                    </p>
                    <p>
                      <strong>Jenis akad:</strong> {item.jenisAkad || '-'}
                    </p>
                    <p>
                      <strong>Tanggal masuk:</strong> {item.tanggalMasukDianggap ? fmtViewDate(item.tanggalMasukDianggap) : '-'}
                    </p>
                    <p>
                      <strong>Keterangan Status:</strong> {item.catatan || <em>Belum ada keterangan status.</em>}
                    </p>
                    <p>
                      <strong>Halaqoh:</strong> {haqCount} &middot; <strong>Kelas:</strong> {kelasCount} &middot;{' '}
                      <strong>Regu:</strong> {reguCount}
                      {item.tahunAjaranAktifNama ? ` (Tahun Ajaran Aktif: ${item.tahunAjaranAktifNama})` : ''}
                    </p>
                  </div>
                  <div className={styles.actions}>
                    <button type="button" onClick={() => setPlacementsItem(item)}>
                      Penempatan
                    </button>
                    <button type="button" disabled={!canManage} onClick={() => setEditState({ open: true, item })}>
                      Edit
                    </button>
                    <button type="button" disabled={!canManage} onClick={() => openCatatanDialog(item)}>
                      Edit Keterangan Status
                    </button>
                    <button type="button" onClick={() => setHistoryItem(item)}>
                      Riwayat Edit
                    </button>
                    {statusKey !== 'inactive' && (
                      <button type="button" disabled={!canManage} onClick={() => handleFreeze(item, false)}>
                        {statusKey === 'dibekukan' ? 'Aktifkan normal' : 'Dibekukan'}
                      </button>
                    )}
                    {statusKey !== 'active' && (
                      <button type="button" disabled={!canToggleInactive} onClick={() => handleToggle(item, false)}>
                        {statusKey === 'inactive' ? 'Aktifkan' : 'Nonaktifkan'}
                      </button>
                    )}
                    {canDelete && (
                      <button type="button" className={styles.danger} onClick={() => handleDelete(item)}>
                        Hapus Permanen
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <SantriPagination page={page} totalPages={totalPages} total={total} onChange={setPage} />

      <EditDialog
        open={editState.open}
        item={editState.item}
        canManage={canManage}
        onClose={() => setEditState({ open: false, item: null })}
        onSaved={() => {
          setEditState({ open: false, item: null })
          reload()
        }}
      />
      <ViewDialog open={!!viewItem} item={viewItem} onClose={() => setViewItem(null)} />
      <PlacementsDialog open={!!placementsItem} item={placementsItem} onClose={() => setPlacementsItem(null)} />
      <HistoryDialog open={!!historyItem} item={historyItem} onClose={() => setHistoryItem(null)} />
      <CatatanDialog
        open={catatan.open}
        itemName={catatan.item && catatan.item.name}
        pendingLabel={catatan.pendingLabel}
        value={catatan.value}
        onChange={(v) => setCatatan((prev) => ({ ...prev, value: v }))}
        onSave={saveCatatan}
        onClose={closeCatatanDialog}
        saving={catatan.saving}
      />

      <InfoDialog open={infoOpen === 'status'} title="Penjelasan Status Santri" onClose={() => setInfoOpen(null)}>
        <p>Santri memiliki 3 status: Aktif, Nonaktif, dan Dibekukan.</p>
        <p>
          <strong>Aktif:</strong> berarti bisa masuk halaqoh, regu, dan kelas.
        </p>
        <p>
          <strong>Nonaktif:</strong> tidak bisa masuk halaqoh, regu, dan kelas. Santri yang dinonaktifkan otomatis
          dikeluarkan dari halaqoh, regu, dan kelas -- hampir seperti dihapus datanya. Biasanya untuk santri yang
          sudah lulus, keluar, atau dikeluarkan.
        </p>
        <p>
          <strong>Dibekukan:</strong> santri yang keluar/cuti di tengah tahun ajaran akan dibekukan sampai ajaran
          baru, baru kemudian dinonaktifkan. Belum ada konsekuensi dikeluarkan dari kelompok -- statusnya masih
          seperti aktif. Kalau Status Akad (otomatis) sudah "Pengabdian", status wajib diubah jadi Dibekukan
          (keterangan "pengabdian"), hanya Admin/Super Admin yang bisa mengubahnya.
        </p>
      </InfoDialog>

      <InfoDialog
        open={infoOpen === 'consequence'}
        title="Apa Saja yang Berubah Saat Status Diubah"
        onClose={() => setInfoOpen(null)}
      >
        <p>
          <strong>Aktif &rarr; Nonaktif:</strong> santri otomatis dikeluarkan dari halaqoh, kelas siang, dan regu.
          Semua riwayat (nilai, hafalan, absensi, dll) tetap tersimpan utuh. Kalau diaktifkan lagi, harus dimasukkan
          ulang manual ke halaqoh/kelas/regu -- tidak otomatis kembali.
        </p>
        <p>
          <strong>Dibekukan:</strong> keanggotaan di halaqoh/kelas/regu TIDAK dicabut. Bedanya, selama dibekukan
          santri tidak dihitung "wajib diisi datanya" di pengingat harian (hafalan, perkembangan, tasmi', nilai
          ujian). Bisa dikembalikan ke Aktif kapan saja tanpa kehilangan data.
        </p>
        <p>
          <strong>Hapus Permanen (Super Admin):</strong> beda dari Nonaktif -- SEMUA data atas nama santri ini ikut
          terhapus habis: nilai, hafalan, absensi, catatan perkembangan, riwayat pindah halaqoh/regu, izin, sakit,
          pelanggaran, dan foto profil. Tidak bisa dipulihkan.
        </p>
      </InfoDialog>

      <DuplicatesDialog
        open={duplicatesOpen}
        canDelete={canDelete}
        onClose={() => setDuplicatesOpen(false)}
        onDeleted={reload}
      />
      <DeleteAllDialog
        open={deleteAllOpen}
        onClose={() => setDeleteAllOpen(false)}
        onDeleted={(message) => {
          setNotice(message || 'Semua data santri berhasil dihapus.')
          setNoticeIsError(false)
          setPage(1)
          reload()
        }}
      />
      <QuickImportDialog open={quickImportOpen} onClose={() => setQuickImportOpen(false)} onSaved={reload} />
      {importFile && (
        <ImportExcelDialog file={importFile} onClose={() => setImportFile(null)} onImported={reload} />
      )}
    </div>
  )
}
