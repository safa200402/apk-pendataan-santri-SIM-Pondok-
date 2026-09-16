import { normalizeSantriStatusValue, getSantriStatusKey, formatSantriStatusLabel, isPdfName } from './santriHelpers.js'
import styles from './DaftarSantri.module.css'

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

// Sumber kebenaran cuma 3 key sementara (__d/__m/__y) -- EditDialog yang mengisi nilai awalnya
// (parse dari record[field.key]) dan merakitnya balik jadi YYYY-MM-DD saat simpan.
function DateGroupField({ field, form, setForm }) {
  const curDay = form[`${field.key}__d`] || ''
  const curMonth = form[`${field.key}__m`] || ''
  const curYear = form[`${field.key}__y`] || ''
  const nowYear = new Date().getFullYear()
  const yearStart = field.key === 'tanggal_lahir' ? 1940 : 2000
  const yearEnd = nowYear + 5
  const years = []
  for (let y = yearEnd; y >= yearStart; y -= 1) years.push(y)

  function updatePart(part, partValue) {
    setForm((prev) => ({ ...prev, [`${field.key}__${part}`]: partValue }))
  }

  return (
    <label className={styles.field}>
      <span>{field.label}</span>
      <div className={styles.dateGroup}>
        <select value={curDay} onChange={(e) => updatePart('d', e.target.value)} required={!!field.required}>
          <option value="">--</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select value={curMonth} onChange={(e) => updatePart('m', e.target.value)} required={!!field.required}>
          <option value="">-- Bulan --</option>
          {MONTH_NAMES.map((nm, i) => (
            <option key={nm} value={i + 1}>
              {nm}
            </option>
          ))}
        </select>
        <select value={curYear} onChange={(e) => updatePart('y', e.target.value)} required={!!field.required}>
          <option value="">-- Tahun --</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </label>
  )
}

function FileDocField({ field, form, setForm, docs, onPick, onDelete, onView }) {
  const existingUrl = form[`${field.key}_file`] || ''
  const pending = docs[field.key]
  const deleted = pending && pending.delete
  const hasFile = !deleted && (pending ? true : !!existingUrl)
  const pendingName = pending && !pending.delete ? pending.name : ''
  const currentIsPdf = pending && !pending.delete ? isPdfName(pending.name) : isPdfName(existingUrl)

  return (
    <div className={styles.docField}>
      <label className={styles.field}>
        <span>{field.label}</span>
        <input
          type="text"
          value={form[field.key] || ''}
          onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
          placeholder={field.placeholder || '(nomor/keterangan dokumen bila ada)'}
        />
      </label>
      <div className={styles.docUploadArea}>
        {!hasFile ? (
          <span className={styles.docNoFile}>Belum ada file</span>
        ) : (
          <span className={styles.docPreviewLine}>
            {currentIsPdf ? '📄 PDF' : '🖼️ Gambar'}
            {pendingName ? ` (baru: ${pendingName})` : ''}
            <button type="button" className={styles.docViewBtn} onClick={() => onView(field.key)}>
              Lihat
            </button>
            <button type="button" className={styles.docDeleteBtn} onClick={() => onDelete(field.key)}>
              Hapus
            </button>
          </span>
        )}
        <label className={styles.docPickBtn}>
          Pilih file (gambar/PDF)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files && e.target.files[0]
              e.target.value = ''
              if (file) onPick(field.key, file)
            }}
          />
        </label>
      </div>
    </div>
  )
}

export default function FieldInput({ field, form, setForm, docs, onDocPick, onDocDelete, onDocView, isNewRecord, canToggleInactive }) {
  const value = form[field.key] ?? ''
  const required = !!field.required

  function handleChange(e) {
    const v = e.target.value
    setForm((prev) => ({ ...prev, [field.key]: v }))
  }

  if (field.type === 'file_doc') {
    return (
      <FileDocField
        field={field}
        form={form}
        setForm={setForm}
        docs={docs}
        onPick={onDocPick}
        onDelete={onDocDelete}
        onView={onDocView}
      />
    )
  }

  if (field.type === 'date') {
    return <DateGroupField field={field} form={form} setForm={setForm} />
  }

  if (field.type === 'year') {
    return (
      <label className={styles.field}>
        <span>{field.label}</span>
        <input
          value={value}
          inputMode="numeric"
          maxLength={4}
          placeholder="cth. 2024"
          onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
          required={required}
        />
      </label>
    )
  }

  if (field.type === 'digits') {
    return (
      <label className={styles.field}>
        <span>{field.label}</span>
        <input
          value={value}
          inputMode="numeric"
          onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value.replace(/\D/g, '') }))}
          required={required}
        />
      </label>
    )
  }

  if (field.type === 'number') {
    return (
      <label className={styles.field}>
        <span>{field.label}</span>
        <div className={styles.numberRow}>
          <input type="number" min="0" step="1" value={value} onChange={handleChange} required={required} />
          {field.suffix && <span className={styles.suffix}>{field.suffix}</span>}
        </div>
      </label>
    )
  }

  if (field.type === 'textarea') {
    return (
      <label className={styles.field}>
        <span>{field.label}</span>
        <textarea rows={4} value={value} placeholder={field.placeholder || ''} onChange={handleChange} required={required} />
      </label>
    )
  }

  if (field.type === 'select') {
    const isStatusField = field.key === 'status'
    const normalizedValue = isStatusField
      ? normalizeSantriStatusValue(value)
      : field.key === 'jenis_kelamin_singkat'
        ? String(value || '').toUpperCase() === 'P'
          ? 'P'
          : String(value || '').toUpperCase() === 'L'
            ? 'L'
            : ''
        : String(value)
    const isInactiveStatus = isStatusField && getSantriStatusKey(normalizedValue) === 'inactive'
    // Urutan wajib: santri Aktif yang sedang diedit tidak boleh langsung ke Nonaktif.
    const lockInactiveByOrder = isStatusField && !isNewRecord && getSantriStatusKey(normalizedValue) === 'active'
    let options = isStatusField && !canToggleInactive
      ? isInactiveStatus
        ? ['Inactive']
        : field.options.filter((o) => getSantriStatusKey(o) !== 'inactive')
      : field.options
    if (lockInactiveByOrder) {
      options = options.filter((o) => getSantriStatusKey(o) !== 'inactive')
    }
    const disabled = isStatusField && isInactiveStatus && !canToggleInactive

    return (
      <label className={styles.field}>
        <span>{field.label}</span>
        <select
          value={normalizedValue}
          onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
          required={required}
          disabled={disabled}
        >
          <option value="">-- Pilih --</option>
          {options.map((option) => {
            const optionLabel = isStatusField
              ? formatSantriStatusLabel(option)
              : field.key === 'jenis_kelamin_singkat'
                ? option === 'L'
                  ? '🧊 Laki-laki'
                  : '🌸 Perempuan'
                : option
            return (
              <option key={option} value={option}>
                {optionLabel}
              </option>
            )
          })}
        </select>
        {lockInactiveByOrder && (
          <p className={styles.fieldNote}>
            Santri Aktif tidak bisa langsung Nonaktif -- ubah dulu ke <strong>Dibekukan</strong>, simpan, baru bisa
            dinonaktifkan.
          </p>
        )}
      </label>
    )
  }

  if (field.type === 'password') {
    return (
      <label className={styles.field}>
        <span>{field.label}</span>
        <input type="password" value={value} autoComplete="new-password" onChange={handleChange} />
      </label>
    )
  }

  return (
    <label className={styles.field}>
      <span>{field.label}</span>
      <input
        value={value}
        placeholder={field.placeholder || ''}
        autoComplete={field.key === 'username' ? 'off' : undefined}
        onChange={handleChange}
        required={required}
      />
    </label>
  )
}
