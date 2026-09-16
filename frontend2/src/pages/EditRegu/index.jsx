import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api.js'
import { useAccess } from '../../access/useAccess.js'
import PersonChecklist from '../../components/PersonChecklist.jsx'
import styles from './EditRegu.module.css'

const EMPTY_FORM = {
  id: '',
  name: '',
  genderGroup: 'Ikhwan',
  description: '',
  status: 'Aktif',
  tahunAjaranId: '',
  pembinaIds: [],
  badalIds: [],
  santriIds: []
}

const GENDER_OPTIONS = ['Ikhwan', 'Akhowat', 'Campur', 'Tidak ada']

export default function EditRegu() {
  const { session, loading: accessLoading } = useAccess('editRegu')
  const [items, setItems] = useState([])
  const [refs, setRefs] = useState({ tahunAjaran: [], pengurus: [], santri: [] })
  const [tahunAjaranFilter, setTahunAjaranFilter] = useState('')
  const [q, setQ] = useState('')
  const [notice, setNotice] = useState('')
  const [noticeIsError, setNoticeIsError] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const dialogRef = useRef(null)

  const permissions = (session && session.permissions) || {}
  const canManage = !!permissions.canManageRegu
  const canDelete = !!permissions.canDelete

  async function loadRefs() {
    const data = await api('references', { sheetKey: 'regu' })
    const tahunAjaran = data.tahunAjaran || []
    setRefs({ tahunAjaran, pengurus: data.pengurus || [], santri: data.santri || [] })
    if (!tahunAjaranFilter) {
      const aktif = tahunAjaran.find((ta) => ta.isAktif)
      if (aktif) setTahunAjaranFilter(aktif.id)
    }
  }

  async function loadData(taId) {
    setNotice('Memuat regu...')
    setNoticeIsError(false)
    try {
      const data = await api('regu.list', { page: 1, pageSize: 100, q: q.trim(), tahunAjaranId: taId })
      setItems(data.items || [])
      setNotice('')
    } catch (error) {
      setNotice(error.message || 'Gagal memuat regu.')
      setNoticeIsError(true)
    }
  }

  useEffect(() => {
    if (accessLoading) return
    loadRefs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessLoading])

  useEffect(() => {
    if (accessLoading || !tahunAjaranFilter) return
    const timer = setTimeout(() => loadData(tahunAjaranFilter), 250)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessLoading, tahunAjaranFilter, q])

  function openDialog(item) {
    setForm(
      item
        ? {
            id: item.id,
            name: item.name || '',
            genderGroup: item.genderGroup || 'Ikhwan',
            description: item.description || '',
            status: item.status || 'Aktif',
            tahunAjaranId: item.tahunAjaranId || tahunAjaranFilter,
            pembinaIds: item.pembinaIds || [],
            badalIds: item.badalIds || [],
            santriIds: item.santriIds || []
          }
        : { ...EMPTY_FORM, tahunAjaranId: tahunAjaranFilter }
    )
    dialogRef.current && dialogRef.current.showModal()
  }

  function closeDialog() {
    dialogRef.current && dialogRef.current.close()
  }

  function toggleInList(field, id) {
    setForm((prev) => {
      const has = prev[field].includes(id)
      return { ...prev, [field]: has ? prev[field].filter((x) => x !== id) : [...prev[field], id] }
    })
  }

  const frozenSantriIds = new Set((refs.santri || []).filter((s) => s.statusLabel === 'Dibekukan').map((s) => s.id))

  async function handleSave(event) {
    event.preventDefault()
    if (!form.tahunAjaranId) {
      setNotice('Tahun ajaran wajib dipilih untuk regu.')
      setNoticeIsError(true)
      return
    }
    const pickedFrozen = form.santriIds.filter((id) => frozenSantriIds.has(id))
    if (pickedFrozen.length) {
      const names = (refs.santri || []).filter((s) => pickedFrozen.includes(s.id)).map((s) => s.name)
      if (!window.confirm(`${pickedFrozen.length} santri dibekukan ikut tercentang di kelompok ini:\n${names.join(', ')}\n\nSantri dibekukan boleh tetap berada di kelompok. Lanjutkan simpan?`)) {
        return
      }
    }
    setSaving(true)
    try {
      await api('regu.save', { record: form }, 'POST')
      closeDialog()
      await loadData(tahunAjaranFilter)
    } catch (error) {
      setNotice(error.message || 'Gagal menyimpan regu.')
      setNoticeIsError(true)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(item) {
    const nextActive = !item.active
    if (!window.confirm(`${nextActive ? 'Aktifkan' : 'Nonaktifkan'} regu "${item.name}"?`)) return
    try {
      await api('regu.toggle', { id: item.id, active: nextActive }, 'POST')
      await loadData(tahunAjaranFilter)
    } catch (error) {
      setNotice(error.message || 'Gagal mengubah status.')
      setNoticeIsError(true)
    }
  }

  async function handleDelete(item) {
    const word = window.prompt(`Ketik HAPUS untuk menghapus regu "${item.name}" (bisa dipulihkan lewat sampah).`)
    if (word === null) return
    try {
      await api('regu.delete', { id: item.id, confirm: word.trim() }, 'POST')
      await loadData(tahunAjaranFilter)
    } catch (error) {
      setNotice(error.message || 'Gagal menghapus regu.')
      setNoticeIsError(true)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Edit Regu</h1>
        {canManage && (
          <button type="button" className={styles.addBtn} onClick={() => openDialog(null)}>
            + Tambah regu
          </button>
        )}
      </div>

      <div className={styles.toolbar}>
        <select value={tahunAjaranFilter} onChange={(e) => setTahunAjaranFilter(e.target.value)}>
          {refs.tahunAjaran.map((ta) => (
            <option key={ta.id} value={ta.id}>
              {ta.namaDisplay || ta.nama}
              {ta.isAktif ? ' (Aktif)' : ''}
            </option>
          ))}
        </select>
        <input type="search" placeholder="Cari nama regu..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {notice && <p className={noticeIsError ? `${styles.notice} ${styles.noticeError}` : styles.notice}>{notice}</p>}

      <div className={styles.list}>
        {items.length === 0 && !notice && <p className={styles.notice}>Belum ada regu untuk tahun ajaran ini.</p>}
        {items.map((item) => (
          <div key={item.id} className={styles.card}>
            <div className={styles.nameRow}>
              <p className={styles.name}>{item.name}</p>
              <span className={`${styles.pill} ${item.active ? styles.pillActive : styles.pillInactive}`}>
                {item.status}
              </span>
              <span className={styles.pill}>{item.genderGroup || 'Tidak ada'}</span>
            </div>
            <p className={styles.summary}>
              Santri {item.santriCount ?? 0} &middot; Pembina {(item.pembinaLabels || []).join(', ') || '-'}
              {(item.badalLabels || []).length > 0 ? ` · Badal ${item.badalLabels.join(', ')}` : ''}
            </p>
            <div className={styles.actions}>
              <button type="button" onClick={() => openDialog(item)}>
                Edit
              </button>
              <button type="button" disabled={!canManage} onClick={() => handleToggle(item)}>
                {item.active ? 'Nonaktifkan' : 'Aktifkan'}
              </button>
              {canDelete && (
                <button type="button" className={styles.danger} onClick={() => handleDelete(item)}>
                  Hapus
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <dialog ref={dialogRef} className={styles.dialog}>
        <form onSubmit={handleSave}>
          <h2 className={styles.dialogTitle}>{form.id ? 'Edit regu' : 'Tambah regu'}</h2>

          <label className={styles.field}>
            <span>Nama regu</span>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>

          <label className={styles.field}>
            <span>Kategori gender</span>
            <select value={form.genderGroup} onChange={(e) => setForm({ ...form, genderGroup: e.target.value })}>
              {GENDER_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Deskripsi</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>

          <label className={styles.field}>
            <span>Status</span>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
          </label>

          <label className={styles.field}>
            <span>Tahun ajaran</span>
            <select
              required
              value={form.tahunAjaranId}
              onChange={(e) => setForm({ ...form, tahunAjaranId: e.target.value })}
            >
              <option value="" disabled>
                &mdash; Pilih tahun ajaran &mdash;
              </option>
              {refs.tahunAjaran.map((ta) => (
                <option key={ta.id} value={ta.id}>
                  {ta.namaDisplay || ta.nama}
                  {ta.isAktif ? ' (Aktif)' : ''}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Pembina</span>
            <PersonChecklist
              people={refs.pengurus}
              selectedIds={form.pembinaIds}
              onToggle={(id) => toggleInList('pembinaIds', id)}
            />
          </label>

          <label className={styles.field}>
            <span>Pembina badal</span>
            <PersonChecklist
              people={refs.pengurus}
              selectedIds={form.badalIds}
              onToggle={(id) => toggleInList('badalIds', id)}
            />
          </label>

          <label className={styles.field}>
            <span>Santri</span>
            <PersonChecklist
              people={refs.santri}
              selectedIds={form.santriIds}
              onToggle={(id) => toggleInList('santriIds', id)}
              frozenIds={frozenSantriIds}
            />
          </label>

          <div className={styles.dialogActions}>
            <button type="button" className={styles.secondary} onClick={closeDialog}>
              Batal
            </button>
            <button type="submit" className={styles.primary} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  )
}
