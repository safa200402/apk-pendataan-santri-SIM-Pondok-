import { fmtViewDate, formatSantriStatusLabel, isPdfName } from './santriHelpers.js'
import styles from './DaftarSantri.module.css'

export default function ViewField({ field, record, onViewDoc }) {
  if (field.type === 'password') return null
  const raw = record[field.key] ?? ''
  const empty = <span className={styles.viewEmpty}>Belum diisi</span>

  if (field.type === 'file_doc') {
    const fileUrl = record[field.key + '_file'] || ''
    if (!fileUrl) {
      return (
        <div className={styles.viewField}>
          <span className={styles.viewLabel}>{field.label}</span>
          {empty}
        </div>
      )
    }
    return (
      <div className={styles.viewField}>
        <span className={styles.viewLabel}>{field.label}</span>
        <button type="button" className={styles.docViewBtn} onClick={() => onViewDoc(fileUrl)}>
          {isPdfName(fileUrl) ? '📄 Lihat PDF' : '🖼️ Lihat file'}
        </button>
      </div>
    )
  }

  if (field.type === 'date') {
    return (
      <div className={styles.viewField}>
        <span className={styles.viewLabel}>{field.label}</span>
        {raw ? <span className={styles.viewValue}>{fmtViewDate(raw)}</span> : empty}
      </div>
    )
  }

  if (field.type === 'select') {
    let label = String(raw || '')
    if (field.key === 'status') label = formatSantriStatusLabel(raw)
    else if (field.key === 'jenis_kelamin_singkat') {
      const g = String(raw || '').toUpperCase()
      label = g === 'L' ? '🧊 Laki-laki' : g === 'P' ? '🌸 Perempuan' : ''
    }
    return (
      <div className={styles.viewField}>
        <span className={styles.viewLabel}>{field.label}</span>
        {label ? <span className={styles.viewValue}>{label}</span> : empty}
      </div>
    )
  }

  const text = field.type === 'number' && raw !== '' ? `${raw}${field.suffix ? ' ' + field.suffix : ''}` : String(raw || '')
  return (
    <div className={styles.viewField}>
      <span className={styles.viewLabel}>{field.label}</span>
      {text ? <span className={styles.viewValue}>{text}</span> : empty}
    </div>
  )
}
