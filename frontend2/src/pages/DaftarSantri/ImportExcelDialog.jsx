import { useEffect, useRef, useState } from 'react'
import {
  parseSantriImportFile,
  previewImportConflicts,
  buildConflictItems,
  applyConflictDecisions,
  batchSaveSantri
} from './importHelpers.js'
import styles from './DaftarSantri.module.css'

// stage: 'parsing' | 'conflicts' | 'saving' | 'done' | 'error'
export default function ImportExcelDialog({ file, onClose, onImported }) {
  const dialogRef = useRef(null)
  const [stage, setStage] = useState('parsing')
  const [rows, setRows] = useState([])
  const [conflictItems, setConflictItems] = useState([])
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState('')
  const [savedCount, setSavedCount] = useState(0)

  useEffect(() => {
    const dlg = dialogRef.current
    if (dlg && !dlg.open) dlg.showModal()
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const parsedRows = await parseSantriImportFile(file)
        if (cancelled) return
        setRows(parsedRows)
        const conflicts = await previewImportConflicts(parsedRows)
        if (cancelled) return
        const items = buildConflictItems(conflicts)
        if (items.length) {
          setConflictItems(items)
          setStage('conflicts')
        } else {
          await doSave(parsedRows)
        }
      } catch (err) {
        if (cancelled) return
        setError(err.message || 'Gagal memproses file Excel.')
        setStage('error')
      }
    }
    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  async function doSave(finalRows) {
    setStage('saving')
    setProgress({ done: 0, total: finalRows.length })
    try {
      const result = await batchSaveSantri(finalRows, (done, total) => setProgress({ done, total }))
      setSavedCount(result.count)
      setStage('done')
      onImported && onImported()
    } catch (err) {
      setError(err.message || 'Gagal menyimpan data import.')
      setStage('error')
    }
  }

  function setDecision(key, decision) {
    setConflictItems((prev) => prev.map((item) => (item.key === key ? { ...item, decision } : item)))
  }

  function applyAll(decision) {
    setConflictItems((prev) =>
      prev.map((item) => ({ ...item, decision: decision === 'replace' ? (item.canReplace ? 'replace' : 'skip') : decision }))
    )
  }

  async function handleConfirmConflicts() {
    const finalRows = applyConflictDecisions(rows, conflictItems)
    if (!finalRows.length) {
      setError('Semua baris konflik dipilih untuk di-skip. Tidak ada data yang diimport.')
      setStage('error')
      return
    }
    await doSave(finalRows)
  }

  const replaceCount = conflictItems.filter((i) => i.decision === 'replace').length
  const skipCount = conflictItems.filter((i) => i.decision === 'skip').length
  const continueCount = conflictItems.filter((i) => i.decision === 'continue').length

  return (
    <dialog ref={dialogRef} className={styles.bigDialog} onClose={onClose}>
      <h2 className={styles.dialogTitle}>Import Excel Santri</h2>

      {stage === 'parsing' && <p className={styles.notice}>Membaca file dan memeriksa konflik nama...</p>}

      {stage === 'error' && (
        <>
          <p className={`${styles.notice} ${styles.noticeError}`}>{error}</p>
          <div className={styles.dialogActions}>
            <button type="button" className={styles.secondary} onClick={onClose}>
              Tutup
            </button>
          </div>
        </>
      )}

      {stage === 'conflicts' && (
        <>
          <p className={styles.dialogSubtitle}>
            Ditemukan {conflictItems.length} baris yang namanya mirip data santri yang sudah ada. Putuskan per baris
            sebelum import dilanjutkan -- Ganti akan memperbarui data lama (kolom kosong di Excel tidak menghapus isi
            lama), Lanjutkan membuat data baru, Skip tidak mengimpor baris itu.
          </p>
          <div className={styles.toolbar}>
            <button type="button" onClick={() => applyAll('replace')}>
              Ganti yang aman
            </button>
            <button type="button" onClick={() => applyAll('skip')}>
              Skip semua konflik
            </button>
            <button type="button" onClick={() => applyAll('continue')}>
              Lanjutkan semua (buat baru)
            </button>
          </div>
          <p className={styles.notice}>
            Pilihan saat ini: Ganti {replaceCount}, Skip {skipCount}, Lanjutkan {continueCount}.
          </p>

          <div className={styles.list}>
            {conflictItems.map((item) => (
              <div key={item.key} className={styles.card}>
                <div className={styles.nameRow}>
                  <strong>
                    Baris {item.rowNumber} &mdash; {item.name || '(tanpa nama)'}
                  </strong>
                  <span className={styles.pill}>{item.matchCount} cocok</span>
                </div>
                {item.existingMatches.map((match, idx) => (
                  <p key={idx} className={styles.duplicateMeta}>
                    <strong>{match.name || '-'}</strong> &mdash; {match.subtitle || 'Data lama tanpa ringkasan tambahan.'}
                  </p>
                ))}
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={item.decision === 'continue' ? styles.primary : ''}
                    onClick={() => setDecision(item.key, 'continue')}
                  >
                    Lanjutkan (baru)
                  </button>
                  <button
                    type="button"
                    className={item.decision === 'skip' ? styles.primary : ''}
                    onClick={() => setDecision(item.key, 'skip')}
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    className={item.decision === 'replace' ? styles.primary : ''}
                    disabled={!item.canReplace}
                    onClick={() => setDecision(item.key, 'replace')}
                  >
                    Ganti
                  </button>
                </div>
                <p className={styles.duplicateNote}>
                  {item.canReplace
                    ? 'Rekomendasi: Ganti. Data lama akan diperbarui.'
                    : 'Rekomendasi: Skip. Nama ini cocok ke lebih dari satu data lama, Ganti dinonaktifkan agar tidak salah menimpa data.'}
                </p>
              </div>
            ))}
          </div>

          <div className={styles.dialogActions}>
            <button type="button" className={styles.secondary} onClick={onClose}>
              Batalkan
            </button>
            <button type="button" className={styles.primary} onClick={handleConfirmConflicts}>
              Proses import
            </button>
          </div>
        </>
      )}

      {stage === 'saving' && (
        <p className={styles.notice}>
          Menyimpan {progress.done}/{progress.total}...
        </p>
      )}

      {stage === 'done' && (
        <>
          <p className={styles.notice}>Import selesai. {savedCount} baris santri berhasil disimpan.</p>
          <div className={styles.dialogActions}>
            <button type="button" className={styles.primary} onClick={onClose}>
              Tutup
            </button>
          </div>
        </>
      )}
    </dialog>
  )
}
