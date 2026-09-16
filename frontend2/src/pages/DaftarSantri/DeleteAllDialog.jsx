import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api.js'
import styles from './DaftarSantri.module.css'

const PHRASE = 'HAPUS SEMUA'

export default function DeleteAllDialog({ open, onClose, onDeleted }) {
  const dialogRef = useRef(null)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const dlg = dialogRef.current
    if (!dlg) return
    if (open && !dlg.open) dlg.showModal()
    if (!open && dlg.open) dlg.close()
    if (open) {
      setValue('')
      setError('')
    }
  }, [open])

  async function handleSubmit(event) {
    event.preventDefault()
    if (value.trim() !== PHRASE) {
      setError(`Tulis ${PHRASE} untuk melanjutkan.`)
      return
    }
    setBusy(true)
    setError('')
    try {
      const data = await api('santri.deleteAll', {}, 'POST')
      onDeleted && onDeleted(data.message)
      onClose()
    } catch (error) {
      setError(error.message || 'Gagal menghapus semua data santri.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <dialog ref={dialogRef} className={styles.smallDialog} onClose={onClose}>
      <h2 className={styles.dialogTitle}>Hapus Semua Data Santri</h2>
      <p className={`${styles.notice} ${styles.noticeError}`}>
        Ini menghapus PERMANEN seluruh data santri beserta seluruh riwayatnya. Tidak bisa dipulihkan.
      </p>
      <form onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span>
            Ketik <strong>{PHRASE}</strong> untuk konfirmasi
          </span>
          <input value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" placeholder={`Ketik ${PHRASE}`} />
        </label>
        {error && <p className={`${styles.notice} ${styles.noticeError}`}>{error}</p>}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondary} onClick={onClose}>
            Batal
          </button>
          <button type="submit" className={styles.danger} disabled={busy || value.trim() !== PHRASE}>
            {busy ? 'Menghapus...' : 'Konfirmasi'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
