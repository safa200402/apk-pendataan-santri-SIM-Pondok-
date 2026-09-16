import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api.js'
import { useAccess } from '../../access/useAccess.js'
import PersonChecklist from '../../components/PersonChecklist.jsx'
import styles from './EditKelas.module.css'

const JAM_OPTIONS = ['-'].concat(Array.from({ length: 11 }, (_, i) => `Jam ${i + 1}`))
const GENDER_OPTIONS = ['Ikhwan', 'Akhowat', 'Campur', 'Tidak ada']
const JENIS_SUGGESTIONS = ['Ekstrakurikuler', 'Kelas Pagi', 'Kelas Siang', 'Bimbel', 'Tahfizh']

const EMPTY_FORM = {
  id: '',
  name: '',
  jam: '',
  jenis: '',
  genderGroup: 'Ikhwan',
  status: 'Aktif',
  catatan: '',
  silabus: '',
  tahunAjaranId: '',
  pengajarIds: [],
  badalIds: [],
  santriIds: []
}

export default function EditKelas() {
  const { session, loading: accessLoading } = useAccess('editKelas')
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
  const canManage = !!permissions.canManageKelasSiang
  const canDelete = !!permissions.canDelete

  async function loadRefs() {
    const data = await api('references', { sheetKey: 'kelas' })
    const tahunAjaran = data.tahunAjaran || []
    setRefs({ tahunAjaran, pengurus: data.pengurus || [], santri: data.santri || [] })
    if (!tahunAjaranFilter) {
      const aktif = tahunAjaran.find((ta) => ta.isAktif)
      if (aktif) setTahunAjaranFilter(aktif.id)
    }
  }

  async function loadData(taId) {
    setNotice('Memuat kelas...')
    setNoticeIsError(false)
    try {
      const data = await api('kelas.list', { page: 1, pageSize: 100, q: q.trim(), tahunAjaranId: taId })
      setItems(data.items || [])
      setNotice('')
    } catch (error) {
      setNotice(error.message || 'Gagal memuat kelas.')
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
            jam: item.jam || '',
            jenis: item.jenis || '',
            genderGroup: item.genderGroup || 'Ikhwan',
            status: item.status || 'Aktif',
            catatan: item.catatan || '',
            silabus: item.silabus || '',
            tahunAjaranId: item.tahunAjaranId || tahunAjaranFilter,
            pengajarIds: item.pengajarIds || [],
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
      setNotice('Tahun ajaran wajib dipilih untuk kelas.')
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
      await api('kelas.save', { record: form }, 'POST')
      closeDialog()
      await loadData(tahunAjaranFilter)
    } catch (error) {
      setNotice(error.message || 'Gagal menyimpan kelas.')
      setNoticeIsError(true)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(item) {
    const nextActive = !item.active
    if (!window.confirm(`${nextActive ? 'Aktifkan' : 'Nonaktifkan'} kelas "${item.name}"?`)) return
    try {
      await api('kelas.toggle', { id: item.id, active: nextActive }, 'POST')
      await loadData(tahunAjaranFilter)
    } catch (error) {
      setNotice(error.message || 'Gagal mengubah status.')
      setNoticeIsError(true)
    }
  }

  async function handleDelete(item) {
    const word = window.prompt(`Ketik HAPUS untuk menghapus kelas "${item.name}" (bisa dipulihkan lewat sampah).`)
    if (word === null) return
    try {
      await api('kelas.delete', { id: item.id, confirm: word.trim() }, 'POST')
      await loadData(tahunAjaranFilter)
    } catch (error) {
      setNotice(error.message || 'Gagal menghapus kelas.')
      setNoticeIsError(true)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Edit Kelas</h1>
        {canManage && (
          <button type="button" className={styles.addBtn} onClick={() => openDialog(null)}>
            + Tambah kelas
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
        <input type="search" placeholder="Cari nama kelas..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {notice && <p className={noticeIsError ? `${styles.notice} ${styles.noticeError}` : styles.notice}>{notice}</p>}

      <div className={styles.list}>
        {items.length === 0 && !notice && <p className={styles.notice}>Belum ada kelas untuk tahun ajaran ini.</p>}
        {items.map((item) => (
          <div key={item.id} className={styles.card}>
            <div className={styles.nameRow}>
              <p className={styles.name}>
                {item.name} {item.jam ? `(${item.jam})` : ''}
              </p>
              <span className={`${styles.pill} ${item.active ? styles.pillActive : styles.pillInactive}`}>
                {item.status}
              </span>
              {item.jenis && <span className={styles.pill}>{item.jenis}</span>}
            </div>
            <p className={styles.summary}>
              Murid {item.santriCount ?? 0} &middot; Guru {(item.pengajarLabels || []).join(', ') || '-'}
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
          <h2 className={styles.dialogTitle}>{form.id ? 'Edit kelas' : 'Tambah kelas'}</h2>

          <label className={styles.field}>
            <span>Nama kelas</span>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>

          <label className={styles.field}>
            <span>Jam</span>
            <select required value={form.jam} onChange={(e) => setForm({ ...form, jam: e.target.value })}>
              <option value="" disabled>
                &mdash; Pilih jam &mdash;
              </option>
              {JAM_OPTIONS.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Jenis kelas</span>
            <input
              list="jenisKelasOptions"
              value={form.jenis}
              onChange={(e) => setForm({ ...form, jenis: e.target.value })}
              placeholder="Tanpa keterangan jenis"
            />
            <datalist id="jenisKelasOptions">
              {JENIS_SUGGESTIONS.map((j) => (
                <option key={j} value={j} />
              ))}
            </datalist>
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
            <span>Guru pengajar</span>
            <PersonChecklist
              people={refs.pengurus}
              selectedIds={form.pengajarIds}
              onToggle={(id) => toggleInList('pengajarIds', id)}
            />
          </label>

          <label className={styles.field}>
            <span>Guru badal</span>
            <PersonChecklist
              people={refs.pengurus}
              selectedIds={form.badalIds}
              onToggle={(id) => toggleInList('badalIds', id)}
            />
          </label>

          <label className={styles.field}>
            <span>Murid</span>
            <PersonChecklist
              people={refs.santri}
              selectedIds={form.santriIds}
              onToggle={(id) => toggleInList('santriIds', id)}
              frozenIds={frozenSantriIds}
            />
          </label>

          <label className={styles.field}>
            <span>Catatan</span>
            <textarea rows={3} value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} />
          </label>

          <label className={styles.field}>
            <span>Silabus</span>
            <textarea rows={3} value={form.silabus} onChange={(e) => setForm({ ...form, silabus: e.target.value })} />
          </label>

          <p className={styles.notice}>Deadline silabus terstruktur (dengan tanggal per topik) belum ada di frontend2 -- kelola lewat frontend lama kalau perlu.</p>

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
