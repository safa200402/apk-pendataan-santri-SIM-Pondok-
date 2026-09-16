import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api.js'
import { formatSantriStatusLabel } from './santriHelpers.js'
import { parseQuickImportEntries } from './quickImportHelpers.js'
import styles from './DaftarSantri.module.css'

export default function QuickImportDialog({ open, onClose, onSaved }) {
  const dialogRef = useRef(null)
  const [text, setText] = useState('')
  const [entries, setEntries] = useState([])
  const [parsed, setParsed] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [noticeIsError, setNoticeIsError] = useState(false)

  useEffect(() => {
    const dlg = dialogRef.current
    if (!dlg) return
    if (open && !dlg.open) dlg.showModal()
    if (!open && dlg.open) dlg.close()
    if (open) {
      setText('')
      setEntries([])
      setParsed(false)
      setDirty(false)
      setNotice('')
    }
  }, [open])

  function handleTextChange(value) {
    const hadPreview = entries.length > 0 || parsed
    setText(value)
    setDirty(hadPreview && !!value.trim())
    setParsed(false)
    setEntries([])
  }

  async function refreshPreview(rawText, silent) {
    const drafts = parseQuickImportEntries(rawText)
    if (!drafts.length) {
      setEntries([])
      return []
    }
    if (!silent) {
      setNotice('Memeriksa data inti santri dan warning duplikat terbaru...')
      setNoticeIsError(false)
    }
    const data = await api('santri.quickImportPreview', { drafts }, 'POST')
    const result = Array.isArray(data.entries) ? data.entries : []
    setEntries(result)
    return result
  }

  async function handleParse() {
    setDirty(false)
    setParsed(true)
    setBusy(true)
    try {
      await refreshPreview(text)
      setNotice('')
    } catch (error) {
      setEntries([])
      setNotice(error.message || 'Gagal membuat preview tempel santri inti.')
      setNoticeIsError(true)
    } finally {
      setBusy(false)
    }
  }

  function handleClear() {
    setText('')
    setEntries([])
    setParsed(false)
    setDirty(false)
    setNotice('')
  }

  async function handleSave(event) {
    event.preventDefault()
    if (busy) return
    setDirty(false)
    setParsed(true)
    setBusy(true)
    let fresh
    try {
      fresh = await refreshPreview(text, true)
    } catch (error) {
      setBusy(false)
      setNotice(error.message || 'Gagal memeriksa ulang preview tempel santri inti.')
      setNoticeIsError(true)
      return
    }

    const validEntries = fresh.filter((e) => e.isValid)
    const invalidEntries = fresh.filter((e) => !e.isValid)
    if (!validEntries.length) {
      setBusy(false)
      setNotice('Belum ada baris valid untuk disimpan.')
      setNoticeIsError(true)
      return
    }
    const confirmMessage = invalidEntries.length
      ? `Simpan ${validEntries.length} santri yang valid? ${invalidEntries.length} baris lain belum ikut disimpan.`
      : `Simpan ${validEntries.length} santri dari tempelan cepat?`
    if (!window.confirm(confirmMessage)) {
      setBusy(false)
      return
    }

    let savedCount = 0
    const failedEntries = []
    for (let i = 0; i < validEntries.length; i += 1) {
      const entry = validEntries[i]
      setNotice(`Menyimpan santri ${i + 1}/${validEntries.length}: ${entry.record.nama_lengkap_akte}...`)
      setNoticeIsError(false)
      try {
        await api('santri.save', { record: entry.record }, 'POST')
        savedCount += 1
      } catch (error) {
        failedEntries.push({ ...entry, blockingIssues: entry.blockingIssues.concat(error.message || 'Gagal menyimpan santri ini.'), isValid: false })
      }
    }

    setBusy(false)
    onSaved && onSaved()

    const remaining = invalidEntries.concat(failedEntries)
    if (remaining.length) {
      setEntries(remaining)
      setParsed(true)
      setDirty(false)
      setText(remaining.map((e) => e.sourceBlock).join('\n\n'))
      setNotice(
        savedCount
          ? `Berhasil menyimpan ${savedCount} santri. ${remaining.length} baris masih perlu ditinjau.`
          : 'Belum ada santri yang tersimpan. Periksa catatan di preview.'
      )
      setNoticeIsError(!savedCount)
      return
    }

    setNotice(`Berhasil menyimpan ${savedCount} santri dari tempelan cepat.`)
    setNoticeIsError(false)
    setTimeout(() => onClose(), 900)
  }

  const validCount = entries.filter((e) => e.isValid).length
  const invalidCount = entries.length - validCount
  const warningCount = entries.reduce((sum, e) => sum + (e.warnings ? e.warnings.length : 0), 0)
  const hasInput = !!text.trim()

  return (
    <dialog ref={dialogRef} className={styles.bigDialog} onClose={onClose}>
      <form onSubmit={handleSave}>
        <h2 className={styles.dialogTitle}>Tempel Santri Inti</h2>
        <p className={styles.dialogSubtitle}>
          Format label per baris, satu santri diawali baris "Santri: nama". Label lain: Nama ubah, Panggilan, NIS,
          NIK, Gender, Status, No HP, Catatan.
        </p>

        <label className={styles.field}>
          <span>Tempel data</span>
          <textarea
            rows={8}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={'Santri: Ahmad Fulan\nNIS: 232401001\nGender: L\nStatus: Aktif'}
          />
        </label>

        <div className={styles.toolbar}>
          <button type="button" disabled={busy} onClick={handleParse}>
            Buat preview
          </button>
          <button type="button" disabled={busy} onClick={handleClear}>
            Bersihkan
          </button>
        </div>

        {notice && <p className={noticeIsError ? `${styles.notice} ${styles.noticeError}` : styles.notice}>{notice}</p>}

        {dirty && hasInput && (
          <p className={`${styles.notice} ${styles.noticeError}`}>
            Isi tempelan sudah berubah. Klik "Buat preview" lagi supaya data yang disimpan sesuai tempelan terbaru.
          </p>
        )}

        {entries.length > 0 && (
          <>
            <div className={styles.metaRow}>
              <span className={styles.pill}>Total {entries.length}</span>
              <span className={styles.pill}>{validCount} siap disimpan</span>
              <span className={invalidCount ? `${styles.pill} ${styles.pillWarn}` : styles.pill}>{invalidCount} perlu dicek</span>
              <span className={warningCount ? `${styles.pill} ${styles.pillWarn}` : styles.pill}>{warningCount} warning</span>
            </div>
            <div className={styles.quickImportTableWrap}>
              <table className={styles.quickImportTable}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nama</th>
                    <th>Nama ubah</th>
                    <th>Gender</th>
                    <th>Status</th>
                    <th>NIS</th>
                    <th>No HP</th>
                    <th>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => (
                    <tr key={idx} className={entry.isValid ? styles.quickImportRowValid : styles.quickImportRowInvalid}>
                      <td>{entry.rowNumber}</td>
                      <td>
                        <strong>{(entry.display && entry.display.name) || '-'}</strong>
                      </td>
                      <td>{(entry.display && entry.display.renamedName) || '-'}</td>
                      <td>{(entry.display && entry.display.gender) || '-'}</td>
                      <td>{formatSantriStatusLabel(entry.display && entry.display.status)}</td>
                      <td>{(entry.display && entry.display.noInduk) || '-'}</td>
                      <td>{(entry.display && entry.display.noHp) || '-'}</td>
                      <td>
                        {(entry.blockingIssues || []).map((m, i) => (
                          <div key={`b${i}`} className={styles.quickImportIssueError}>
                            {m}
                          </div>
                        ))}
                        {(entry.warnings || []).map((m, i) => (
                          <div key={`w${i}`} className={styles.quickImportIssueWarn}>
                            {m}
                          </div>
                        ))}
                        {!(entry.blockingIssues || []).length && !(entry.warnings || []).length && 'Siap disimpan'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondary} onClick={onClose}>
            Batal
          </button>
          <button type="submit" className={styles.primary} disabled={busy || dirty || validCount === 0}>
            {validCount ? `Simpan ${validCount} data valid` : 'Simpan data valid'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
