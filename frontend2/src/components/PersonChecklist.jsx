import { useState } from 'react'
import styles from './PersonChecklist.module.css'

// Checklist orang (pengurus/santri) dengan filter teks sederhana -- padanan ringan dari
// checklist tempel-nama di frontend lama (window.PSUI selector), tanpa fitur tempel massal.
export default function PersonChecklist({ people, selectedIds, onToggle, frozenIds }) {
  const [q, setQ] = useState('')
  const frozen = frozenIds || new Set()
  const filtered = q.trim()
    ? people.filter((p) => (p.name || p.nama || '').toLowerCase().includes(q.trim().toLowerCase()))
    : people

  return (
    <div className={styles.wrap}>
      <input
        className={styles.search}
        type="search"
        placeholder={`Cari... (${selectedIds.length} dipilih)`}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className={styles.list}>
        {filtered.length === 0 && <span className={styles.hint}>Tidak ada.</span>}
        {filtered.map((p) => (
          <label key={p.id}>
            <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => onToggle(p.id)} />
            {p.name || p.nama || p.id}
            {frozen.has(p.id) && <span className={styles.frozenTag}>Dibekukan</span>}
          </label>
        ))}
      </div>
    </div>
  )
}
