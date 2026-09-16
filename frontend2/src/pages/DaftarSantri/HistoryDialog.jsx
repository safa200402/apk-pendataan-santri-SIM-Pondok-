import { useEffect, useRef } from 'react'
import styles from './DaftarSantri.module.css'

function fmtDate(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d)) return String(iso)
  return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function HistoryDialog({ open, item, onClose }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dlg = dialogRef.current
    if (!dlg) return
    if (open && !dlg.open) dlg.showModal()
    if (!open && dlg.open) dlg.close()
  }, [open])

  let history = []
  try {
    history = JSON.parse((item && item.record && item.record.edit_history) || '[]')
  } catch (e) {
    history = []
  }

  return (
    <dialog ref={dialogRef} className={styles.smallDialog} onClose={onClose}>
      <h2 className={styles.dialogTitle}>Riwayat Edit</h2>
      <p className={styles.dialogSubtitle}>{item ? item.name : ''}</p>
      {history.length === 0 ? (
        <p className={styles.notice}>Belum ada riwayat edit.</p>
      ) : (
        <div className={styles.historyList}>
          {history.map((e, i) => (
            <div key={i} className={styles.historyItem}>
              <div className={styles.historyName}>
                {i + 1}. {e.name || '-'}
              </div>
              <div className={styles.historyMeta}>
                {e.jabatan || '-'} &middot; {e.action || 'edit'}
              </div>
              <div className={styles.historyAt}>{fmtDate(e.at)}</div>
            </div>
          ))}
        </div>
      )}
      <div className={styles.dialogActions}>
        <button type="button" className={styles.secondary} onClick={onClose}>
          Tutup
        </button>
      </div>
    </dialog>
  )
}
