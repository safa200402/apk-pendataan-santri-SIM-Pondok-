import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api.js'
import { formatSantriStatusLabel, confirmHapusPermanenBerlapis } from './santriHelpers.js'
import styles from './DaftarSantri.module.css'

function normalizeGroups(groups) {
  return (Array.isArray(groups) ? groups : [])
    .map((group) => {
      const candidates = Array.isArray(group && group.candidates) ? group.candidates.slice() : []
      return {
        name: (group && group.name) || '',
        keepSummary: (group && group.keepSummary) || '',
        candidates
      }
    })
    .filter((group) => group.candidates.length > 1)
}

export default function DuplicatesDialog({ open, canDelete, onClose, onDeleted }) {
  const dialogRef = useRef(null)
  const [groups, setGroups] = useState([])
  const [summary, setSummary] = useState('')
  const [busyId, setBusyId] = useState('')

  useEffect(() => {
    const dlg = dialogRef.current
    if (!dlg) return
    if (open && !dlg.open) dlg.showModal()
    if (!open && dlg.open) dlg.close()
  }, [open])

  async function load() {
    setSummary('Memuat data nama santri duplikat...')
    try {
      const data = await api('santri.duplicates')
      const normalized = normalizeGroups(data.groups)
      setGroups(normalized)
      if (!normalized.length) {
        setSummary('Tidak ada nama santri yang terdeteksi sama saat ini.')
      } else {
        const totalDeletable = normalized.reduce((sum, g) => sum + Math.max(0, g.candidates.length - 1), 0)
        setSummary(`${normalized.length} kelompok nama sama ditemukan. ${totalDeletable} data selain rekomendasi bisa dihapus setelah dicek.`)
      }
    } catch (error) {
      setGroups([])
      setSummary(error.message || 'Gagal memuat nama santri duplikat.')
    }
  }

  useEffect(() => {
    if (open) load()
  }, [open])

  async function handleDelete(candidate, groupName) {
    const ok = await confirmHapusPermanenBerlapis(
      `Hapus permanen duplikat "${candidate.name}" (kelompok "${groupName}")? SEMUA riwayat (nilai, hafalan, absensi, dll) ikut terhapus dan TIDAK BISA dipulihkan.`
    )
    if (!ok) return
    setBusyId(candidate.id)
    try {
      await api('santri.delete', { id: candidate.id, confirm: 'HAPUS' }, 'POST')
      setGroups((prev) =>
        prev.map((g) => ({ ...g, candidates: g.candidates.filter((c) => c.id !== candidate.id) })).filter((g) => g.candidates.length > 1)
      )
      onDeleted && onDeleted()
    } catch (error) {
      setSummary(error.message || 'Gagal menghapus data duplikat.')
    } finally {
      setBusyId('')
    }
  }

  return (
    <dialog ref={dialogRef} className={styles.bigDialog} onClose={onClose}>
      <h2 className={styles.dialogTitle}>Nama Santri Duplikat</h2>
      <p className={styles.dialogSubtitle}>{summary}</p>

      {groups.map((group) => (
        <div key={group.name} className={styles.duplicateGroup}>
          <p className={styles.duplicateGroupName}>{group.name}</p>
          <p className={styles.duplicateNote}>Simpan data yang paling lengkap. Kandidat lain bisa dihapus jika memang santri yang sama.</p>
          <p className={styles.duplicateRecommendation}>Rekomendasi simpan: {group.keepSummary || 'Data pertama paling lengkap.'}</p>
          {group.candidates.map((candidate, idx) => (
            <div key={candidate.id} className={idx === 0 ? `${styles.duplicateCandidate} ${styles.duplicateCandidateBest}` : styles.duplicateCandidate}>
              <div className={styles.nameRow}>
                <strong>{candidate.name || '-'}</strong>
                <span className={styles.pill}>{formatSantriStatusLabel(candidate.status)}</span>
              </div>
              <p className={styles.duplicateMeta}>
                ID {candidate.id || '-'} | NIS {candidate.noInduk || '-'} | NIK {candidate.nik || '-'}
              </p>
              <p className={styles.duplicateMeta}>
                Skor kelengkapan {Number(candidate.score || 0)} | {Number(candidate.filledFields || 0)} field terisi
              </p>
              <p className={styles.duplicateMeta}>{candidate.summary || '-'}</p>
              {idx === 0 && <p className={styles.duplicateRecommendation}>Ini kandidat paling lengkap untuk dipertahankan saat ini.</p>}
              {canDelete ? (
                <button
                  type="button"
                  className={styles.danger}
                  disabled={busyId === candidate.id}
                  onClick={() => handleDelete(candidate, group.name)}
                >
                  Hapus duplikat ini
                </button>
              ) : (
                <p className={styles.duplicateNote}>Mode baca saja. Hanya Super Admin yang bisa menghapus data duplikat.</p>
              )}
            </div>
          ))}
        </div>
      ))}

      <div className={styles.dialogActions}>
        <button type="button" className={styles.secondary} onClick={onClose}>
          Tutup
        </button>
      </div>
    </dialog>
  )
}
