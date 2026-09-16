import { useEffect, useRef } from 'react'
import styles from './DaftarSantri.module.css'

export default function CatatanDialog({ open, itemName, pendingLabel, value, onChange, onSave, onClose, saving }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dlg = dialogRef.current
    if (!dlg) return
    if (open && !dlg.open) dlg.showModal()
    if (!open && dlg.open) dlg.close()
  }, [open])

  return (
    <dialog ref={dialogRef} className={styles.smallDialog} onClose={onClose}>
      <h2 className={styles.dialogTitle}>Keterangan Status</h2>
      <p className={styles.dialogSubtitle}>{pendingLabel ? `${itemName || '-'} — ${pendingLabel}` : itemName || '-'}</p>
      <label className={styles.field}>
        <span>Keterangan</span>
        <textarea rows={5} value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
      <div className={styles.dialogActions}>
        <button type="button" className={styles.secondary} onClick={onClose}>
          Batal
        </button>
        <button type="button" className={styles.primary} disabled={saving} onClick={onSave}>
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </dialog>
  )
}
