import { useEffect, useRef } from 'react'
import styles from './DaftarSantri.module.css'

export default function InfoDialog({ open, title, onClose, children }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dlg = dialogRef.current
    if (!dlg) return
    if (open && !dlg.open) dlg.showModal()
    if (!open && dlg.open) dlg.close()
  }, [open])

  return (
    <dialog ref={dialogRef} className={styles.dialog} onClose={onClose}>
      <h2 className={styles.dialogTitle}>{title}</h2>
      <div className={styles.infoCopy}>{children}</div>
      <div className={styles.dialogActions}>
        <button type="button" className={styles.secondary} onClick={onClose}>
          Tutup
        </button>
      </div>
    </dialog>
  )
}
