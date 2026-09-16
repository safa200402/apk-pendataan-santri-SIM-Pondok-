import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api.js'
import { SANTRI_SECTIONS } from './santriSections.js'
import FieldInput from './FieldInput.jsx'
import DocViewer from './DocViewer.jsx'
import { fileToDataUrl, resolveAssetUrl, getPhotoInitials, isPdfName } from './santriHelpers.js'
import styles from './DaftarSantri.module.css'

const DATE_FIELD_LABELS = {
  tanggal_masuk_dianggap: 'Tanggal masuk',
  tanggal_lahir: 'Tanggal lahir',
  tanggal_keluar: 'Tanggal keluar Al Bashiroh'
}

function buildInitialForm(record) {
  const form = {}
  SANTRI_SECTIONS.forEach((section) => {
    section.fields.forEach((field) => {
      if (field.type === 'date') {
        const raw = record[field.key] || ''
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
        form[`${field.key}__d`] = m ? String(Number(m[3])) : ''
        form[`${field.key}__m`] = m ? String(Number(m[2])) : ''
        form[`${field.key}__y`] = m ? m[1] : ''
      } else if (field.type === 'file_doc') {
        form[field.key] = record[field.key] || ''
        form[`${field.key}_file`] = record[`${field.key}_file`] || ''
      } else if (field.type === 'password') {
        form[field.key] = ''
      } else {
        form[field.key] = record[field.key] ?? ''
      }
    })
  })
  return form
}

export default function EditDialog({ open, item, canManage, onClose, onSaved }) {
  const dialogRef = useRef(null)
  const [form, setForm] = useState(() => buildInitialForm({}))
  const [docs, setDocs] = useState({})
  const [photo, setPhoto] = useState(null) // { dataUrl, name, type } | null
  const [useDefaultPhoto, setUseDefaultPhoto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [viewer, setViewer] = useState(null)

  useEffect(() => {
    if (!open) return
    setForm(buildInitialForm(item ? item.record || {} : {}))
    setDocs({})
    setPhoto(null)
    setUseDefaultPhoto(false)
    setNotice('')
  }, [open, item])

  useEffect(() => {
    const dlg = dialogRef.current
    if (!dlg) return
    if (open && !dlg.open) dlg.showModal()
    if (!open && dlg.open) dlg.close()
  }, [open])

  async function handlePhotoChange(e) {
    const file = e.target.files && e.target.files[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setNotice('Ukuran foto maksimal 5 MB.')
      return
    }
    const dataUrl = await fileToDataUrl(file)
    setPhoto({ dataUrl, name: file.name, type: file.type || '' })
    setUseDefaultPhoto(false)
  }

  function resetPhoto() {
    setPhoto(null)
    setUseDefaultPhoto(true)
  }

  async function handleDocPick(key, file) {
    const isImg = file.type.startsWith('image/')
    const isPdf = file.type === 'application/pdf' || isPdfName(file.name)
    if (!isImg && !isPdf) {
      setNotice('Hanya file gambar (JPG, PNG, WEBP, GIF) atau PDF yang diizinkan.')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setNotice('Ukuran file maksimal 20 MB.')
      return
    }
    const dataUrl = await fileToDataUrl(file)
    setDocs((prev) => ({ ...prev, [key]: { dataUrl, name: file.name } }))
  }

  function handleDocDelete(key) {
    setDocs((prev) => ({ ...prev, [key]: { delete: true } }))
  }

  function handleDocView(key) {
    const pending = docs[key]
    if (pending && !pending.delete && pending.dataUrl) {
      const pdf = /^data:application\/pdf/i.test(pending.dataUrl) || isPdfName(pending.name)
      setViewer({ src: pending.dataUrl, title: pending.name || 'File', isPdf: pdf })
      return
    }
    const url = form[`${key}_file`]
    if (!url) {
      setNotice('Belum ada file untuk dilihat.')
      return
    }
    setViewer({ src: resolveAssetUrl(url), title: String(url).split('/').pop(), isPdf: isPdfName(url) })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const record = { ...form }
    record.id = item ? item.id : ''

    for (const key of Object.keys(DATE_FIELD_LABELS)) {
      const dd = String(form[`${key}__d`] || '').trim()
      const mm = String(form[`${key}__m`] || '').trim()
      const yy = String(form[`${key}__y`] || '').trim()
      delete record[`${key}__d`]
      delete record[`${key}__m`]
      delete record[`${key}__y`]
      if (!dd && !mm && !yy) {
        record[key] = ''
        continue
      }
      if (!dd || !mm || !yy) {
        setNotice(`Lengkapi tanggal, bulan, dan tahun untuk "${DATE_FIELD_LABELS[key]}".`)
        return
      }
      const dNum = Number(dd)
      const mNum = Number(mm)
      const yNum = Number(yy)
      const check = new Date(yNum, mNum - 1, dNum)
      if (check.getFullYear() !== yNum || check.getMonth() !== mNum - 1 || check.getDate() !== dNum) {
        setNotice(`"${DATE_FIELD_LABELS[key]}" tidak valid (mis. tanggal 31 di bulan yang hanya 30 hari).`)
        return
      }
      record[key] = `${yy}-${String(mNum).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`
    }

    Object.keys(docs).forEach((key) => {
      if (docs[key].delete) {
        record[`${key}_file_delete`] = 'true'
      } else {
        record[`${key}_data_url`] = docs[key].dataUrl
        record[`${key}_file_name`] = docs[key].name
      }
    })
    if (photo) {
      record.photo_file_data_url = photo.dataUrl
      record.photo_file_name = photo.name
      record.photo_file_type = photo.type
    } else if (useDefaultPhoto) {
      record.use_default_photo = 'true'
    }

    setSaving(true)
    setNotice('Menyimpan data santri...')
    try {
      await api('santri.save', { record }, 'POST')
      onSaved()
    } catch (error) {
      setNotice(error.message || 'Gagal menyimpan santri.')
    } finally {
      setSaving(false)
    }
  }

  const photoSrc = photo ? photo.dataUrl : useDefaultPhoto ? '' : resolveAssetUrl(item && item.photoUrl)

  return (
    <>
      <dialog ref={dialogRef} className={styles.bigDialog} onClose={onClose}>
        <form onSubmit={handleSubmit}>
          <h2 className={styles.dialogTitle}>{item ? 'Edit santri' : 'Tambah santri'}</h2>
          {notice && <p className={styles.notice}>{notice}</p>}

          <div className={styles.avatarRow}>
            <div className={styles.avatar}>
              {photoSrc ? (
                <img src={photoSrc} alt={form.nama_lengkap_akte || 'Foto'} />
              ) : (
                getPhotoInitials(form.nama_lengkap_akte || form.nama_panggilan)
              )}
            </div>
            <div className={styles.avatarActions}>
              <input type="file" accept="image/*" onChange={handlePhotoChange} />
              <button type="button" className={styles.secondary} onClick={resetPhoto}>
                Pakai foto default
              </button>
            </div>
          </div>

          {SANTRI_SECTIONS.map((section) => (
            <details key={section.title} className={styles.section}>
              <summary>{section.title}</summary>
              <div className={styles.fieldGrid}>
                {section.fields.map((field) => (
                  <FieldInput
                    key={field.key}
                    field={field}
                    form={form}
                    setForm={setForm}
                    docs={docs}
                    onDocPick={handleDocPick}
                    onDocDelete={handleDocDelete}
                    onDocView={handleDocView}
                    isNewRecord={!item}
                    canToggleInactive={canManage}
                  />
                ))}
              </div>
            </details>
          ))}

          <div className={styles.dialogActions}>
            <button type="button" className={styles.secondary} onClick={onClose}>
              Batal
            </button>
            <button type="submit" className={styles.primary} disabled={saving || !canManage}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
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
