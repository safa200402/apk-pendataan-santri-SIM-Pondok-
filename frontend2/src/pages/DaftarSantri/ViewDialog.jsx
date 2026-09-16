import { useEffect, useRef, useState } from 'react'
import { SANTRI_SECTIONS } from './santriSections.js'
import ViewField from './ViewField.jsx'
import DocViewer from './DocViewer.jsx'
import { computeAkadStatus, getPhotoInitials, isPdfName, resolveAssetUrl } from './santriHelpers.js'
import styles from './DaftarSantri.module.css'

export default function ViewDialog({ open, item, onClose }) {
  const dialogRef = useRef(null)
  const [viewer, setViewer] = useState(null)

  useEffect(() => {
    const dlg = dialogRef.current
    if (!dlg) return
    if (open && !dlg.open) dlg.showModal()
    if (!open && dlg.open) dlg.close()
  }, [open])

  const record = (item && item.record) || {}
  const akad = computeAkadStatus(record)

  function handleViewDoc(fileUrl) {
    setViewer({ src: resolveAssetUrl(fileUrl), title: String(fileUrl).split('/').pop(), isPdf: isPdfName(fileUrl) })
  }

  return (
    <>
      <dialog ref={dialogRef} className={styles.bigDialog} onClose={onClose}>
        <h2 className={styles.dialogTitle}>{item ? item.name : 'Data Santri'}</h2>

        <div className={styles.avatarRow}>
          <div className={styles.avatar}>
            {item && item.photoUrl ? (
              <img src={resolveAssetUrl(item.photoUrl)} alt="Foto" />
            ) : (
              getPhotoInitials(item && item.name)
            )}
          </div>
        </div>

        <div className={styles.viewField}>
          <span className={styles.viewLabel}>Status Akad (otomatis)</span>
          <span className={styles.akadBadge} style={{ background: akad.bg, color: akad.statusColor }}>
            {akad.statusLabel}
          </span>
        </div>

        {SANTRI_SECTIONS.map((section, idx) => (
          <details key={section.title} className={styles.section} open={idx === 0}>
            <summary>{section.title}</summary>
            <div className={styles.fieldGrid}>
              {section.fields.map((field) => (
                <ViewField key={field.key} field={field} record={record} onViewDoc={handleViewDoc} />
              ))}
            </div>
          </details>
        ))}

        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondary} onClick={onClose}>
            Tutup
          </button>
        </div>
      </dialog>
      <DocViewer
        open={!!viewer}
        title={viewer && viewer.title}
        src={viewer && viewer.src}
        isPdf={viewer && viewer.isPdf}
        onClose={() => setViewer(null)}
      />
    </>
  )
}
