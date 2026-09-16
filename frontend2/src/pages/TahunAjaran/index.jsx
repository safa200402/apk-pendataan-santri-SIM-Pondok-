import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api.js'
import { useAccess } from '../../access/useAccess.js'
import styles from './TahunAjaran.module.css'

const EMPTY_FORM = { id: '', nama: '', semester: '', tanggalMulai: '', tanggalSelesai: '' }

function formatDate(value) {
  if (!value) return '-'
  const parts = String(value).split('-')
  if (parts.length !== 3) return value
  return `${parts[2]}-${parts[1]}-${parts[0]}`
}

export default function TahunAjaran() {
  const { session, loading: accessLoading } = useAccess('tahunAjaran')
  const [items, setItems] = useState([])
  const [notice, setNotice] = useState('')
  const [noticeIsError, setNoticeIsError] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const dialogRef = useRef(null)

  const permissions = (session && session.permissions) || {}
  // Sama dengan canManageRecord() di frontend/pages/tahunAjaran/index.html: edit/lock/reorder
  // boleh Admin & Super Admin. Tambah/jadikan-aktif tetap Super Admin only (canDelete di backend).
  const canManage = !!(permissions.isAdmin || permissions.isSuperAdmin)
  const canSuperAdmin = !!permissions.isSuperAdmin

  async function loadData() {
    setNotice('Memuat tahun ajaran...')
    setNoticeIsError(false)
    try {
      const data = await api('tahunAjaran.list')
      setItems(data.items || [])
      setNotice('')
    } catch (error) {
      setNotice(error.message || 'Gagal memuat data.')
      setNoticeIsError(true)
    }
  }

  useEffect(() => {
    if (accessLoading) return
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessLoading])

  function openDialog(item) {
    setForm(
      item
        ? {
            id: item.id,
            nama: item.nama || '',
            semester: item.semester || '',
            tanggalMulai: item.tanggalMulai || '',
            tanggalSelesai: item.tanggalSelesai || ''
          }
        : EMPTY_FORM
    )
    dialogRef.current && dialogRef.current.showModal()
  }

  function closeDialog() {
    dialogRef.current && dialogRef.current.close()
  }

  async function handleSave(event) {
    event.preventDefault()
    setSaving(true)
    try {
      await api('tahunAjaran.save', { record: form }, 'POST')
      closeDialog()
      await loadData()
    } catch (error) {
      setNotice(error.message || 'Gagal menyimpan.')
      setNoticeIsError(true)
    } finally {
      setSaving(false)
    }
  }

  async function handleSetActive(item) {
    if (!window.confirm(`Jadikan "${item.nama}" sebagai tahun ajaran aktif?`)) return
    try {
      await api('tahunAjaran.setActive', { id: item.id }, 'POST')
      await loadData()
    } catch (error) {
      setNotice(error.message || 'Gagal mengubah tahun ajaran aktif.')
      setNoticeIsError(true)
    }
  }

  async function handleReorder(item, direction) {
    try {
      await api('tahunAjaran.reorder', { id: item.id, direction }, 'POST')
      await loadData()
    } catch (error) {
      setNotice(error.message || 'Gagal mengubah urutan.')
      setNoticeIsError(true)
    }
  }

  async function handleToggleLock(item) {
    const confirmMsg = item.isLocked
      ? `Buka (Open) tahun ajaran "${item.nama}"? Status Open: seluruh data tahun ajaran ini bisa diedit kembali.`
      : `Tutup (Close) tahun ajaran "${item.nama}"? Status Close: seluruh data yang terikat (kelas, halaqoh, regu, absensi, nilai, dll) tidak bisa diedit.`
    if (!window.confirm(confirmMsg)) return
    try {
      await api('tahunAjaran.lock', { id: item.id }, 'POST')
      await loadData()
    } catch (error) {
      setNotice(error.message || 'Gagal mengubah status Open/Close.')
      setNoticeIsError(true)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Tahun Ajaran</h1>
        {canSuperAdmin && (
          <button type="button" className={styles.addBtn} onClick={() => openDialog(null)}>
            + Tambah tahun ajaran
          </button>
        )}
      </div>

      {notice && <p className={noticeIsError ? `${styles.notice} ${styles.noticeError}` : styles.notice}>{notice}</p>}

      <div className={styles.list}>
        {items.length === 0 && !notice && <p className={styles.notice}>Belum ada tahun ajaran.</p>}
        {items.map((item, index) => (
          <div key={item.id} className={item.isLocked ? `${styles.card} ${styles.cardLocked}` : styles.card}>
            <div className={styles.orderCol}>
              <button
                type="button"
                disabled={!canManage || index === 0}
                onClick={() => handleReorder(item, 'up')}
                aria-label="Naikkan urutan"
              >
                &#9650;
              </button>
              <button
                type="button"
                disabled={!canManage || index === items.length - 1}
                onClick={() => handleReorder(item, 'down')}
                aria-label="Turunkan urutan"
              >
                &#9660;
              </button>
            </div>

            <div className={styles.main}>
              <div className={styles.nameRow}>
                <p className={styles.name}>
                  {item.nama} {item.isLocked ? '\u{1F512}' : ''}
                </p>
                <span className={`${styles.pill} ${item.isAktif ? styles.pillAktif : styles.pillNonaktif}`}>
                  {item.isAktif ? 'Aktif' : 'Nonaktif'}
                </span>
                <span className={`${styles.pill} ${item.isLocked ? styles.pillClosed : styles.pillOpen}`}>
                  {item.isLocked ? 'Close' : 'Open'}
                </span>
              </div>
              <p className={styles.hint}>
                {item.semester ? `Semester ${item.semester} · ` : ''}
                {formatDate(item.tanggalMulai)} &mdash; {formatDate(item.tanggalSelesai)}
              </p>
            </div>

            <div className={styles.actions}>
              {canSuperAdmin && !item.isAktif && !item.isLocked && (
                <button type="button" className={styles.primary} onClick={() => handleSetActive(item)}>
                  Jadikan aktif
                </button>
              )}
              <button type="button" disabled={item.isLocked} onClick={() => openDialog(item)}>
                Edit
              </button>
              <button type="button" disabled={!canManage} onClick={() => handleToggleLock(item)}>
                {item.isLocked ? '\u{1F513} Buka (Open)' : '\u{1F512} Tutup (Close)'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <dialog ref={dialogRef} className={styles.dialog}>
        <form onSubmit={handleSave}>
          <h2 className={styles.dialogTitle}>{form.id ? 'Edit tahun ajaran' : 'Tambah tahun ajaran'}</h2>

          <label className={styles.field}>
            <span>Nama tahun ajaran</span>
            <input
              required
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              placeholder="Contoh: 2024/2025 atau TA Ganjil 2025"
            />
          </label>

          <label className={styles.field}>
            <span>Semester</span>
            <select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}>
              <option value="">&mdash; Tidak ditentukan &mdash;</option>
              <option value="Ganjil">Ganjil (Semester 1)</option>
              <option value="Genap">Genap (Semester 2)</option>
            </select>
          </label>

          <label className={styles.field}>
            <span>Tanggal mulai</span>
            <input
              type="date"
              value={form.tanggalMulai}
              onChange={(e) => setForm({ ...form, tanggalMulai: e.target.value })}
            />
          </label>

          <label className={styles.field}>
            <span>Tanggal selesai</span>
            <input
              type="date"
              value={form.tanggalSelesai}
              onChange={(e) => setForm({ ...form, tanggalSelesai: e.target.value })}
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
