import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api.js'
import { formatPersonList } from './santriHelpers.js'
import styles from './DaftarSantri.module.css'

function Group({ title, items, renderExtra }) {
  return (
    <div className={styles.placementGroup}>
      <p className={styles.placementGroupTitle}>{title}</p>
      {items.length === 0 ? (
        <p className={styles.placementsEmpty}>Belum ada.</p>
      ) : (
        items.map((item, idx) => (
          <div key={idx} className={styles.placementItem}>
            <strong>{item.name}</strong>
            <div className={styles.placementDetail}>{renderExtra(item)}</div>
          </div>
        ))
      )}
    </div>
  )
}

export default function PlacementsDialog({ open, item, onClose }) {
  const dialogRef = useRef(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const dlg = dialogRef.current
    if (!dlg) return
    if (open && !dlg.open) dlg.showModal()
    if (!open && dlg.open) dlg.close()
  }, [open])

  useEffect(() => {
    if (!open || !item) return
    setData(null)
    setError('')
    api('santri.placements', { id: item.id })
      .then(setData)
      .catch((err) => setError(err.message || 'Gagal memuat data penempatan.'))
  }, [open, item])

  return (
    <dialog ref={dialogRef} className={styles.dialog} onClose={onClose}>
      <h2 className={styles.dialogTitle}>Penempatan &mdash; {item ? item.name : ''}</h2>
      {error && <p className={`${styles.notice} ${styles.noticeError}`}>{error}</p>}
      {!error && !data && <p className={styles.notice}>Memuat data penempatan...</p>}
      {data && (
        <>
          {data.tahunAjaranAktifNama && <p className={styles.placementsTaNote}>Tahun Ajaran Aktif: {data.tahunAjaranAktifNama}</p>}
          <Group
            title="Halaqoh"
            items={data.halaqoh || []}
            renderExtra={(h) => (
              <>
                Pengampu: {formatPersonList(h.pengampuLabels)}
                <br />
                Pengampu badal: {formatPersonList(h.badalLabels)}
              </>
            )}
          />
          <Group
            title="Kelas"
            items={data.kelasSiang || []}
            renderExtra={(k) => (
              <>
                Pengajar: {formatPersonList(k.pengajarLabels)}
                <br />
                Pengajar badal: {formatPersonList(k.badalLabels)}
                {k.jam ? (
                  <>
                    <br />
                    Jam: {k.jam}
                  </>
                ) : null}
                {k.jenis ? (
                  <>
                    <br />
                    Jenis: {k.jenis}
                  </>
                ) : null}
              </>
            )}
          />
          <Group
            title="Regu"
            items={data.regu || []}
            renderExtra={(r) => (
              <>
                Pembina: {formatPersonList(r.pembinaLabels)}
                <br />
                Pembina badal: {formatPersonList(r.badalLabels)}
              </>
            )}
          />
        </>
      )}
      <div className={styles.dialogActions}>
        <button type="button" className={styles.secondary} onClick={onClose}>
          Tutup
        </button>
      </div>
    </dialog>
  )
}
