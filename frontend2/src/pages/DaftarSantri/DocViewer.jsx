import { useEffect, useRef } from 'react'
import styles from './DaftarSantri.module.css'

// Pratinjau file di layar (tidak mengunduh) -- src harus URL absolut/blob/data, sudah di-resolve
// pemanggil. isPdf -> iframe, selain itu -> img.
export default function DocViewer({ open, title, src, isPdf, onClose }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dlg = dialogRef.current
    if (!dlg) return
    if (open && !dlg.open) dlg.showModal()
    if (!open && dlg.open) dlg.close()
  }, [open])

  return (
    <dialog ref={dialogRef} className={styles.docViewerDialog} onClose={onClose}>
      <div className={styles.docViewerHeader}>
        <span className={styles.docViewerTitle} title={title}>
          {title || 'Lihat File'}
        </span>
        <button type="button" onClick={onClose}>
          &times;
        </button>
      </div>
      <div className={styles.docViewerBody}>
        {!src ? (
          <span className={styles.docViewerEmpty}>File tidak dapat dimuat.</span>
        ) : isPdf ? (
          <iframe src={`${src}#toolbar=0&navpanes=0`} title={title || 'PDF'} />
        ) : (
          <img src={src} alt={title || 'Gambar'} />
        )}
      </div>
    </dialog>
  )
}
