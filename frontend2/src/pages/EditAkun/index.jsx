import { useEffect, useRef, useState } from 'react'
import { api, clearToken } from '../../lib/api.js'
import { useAccess } from '../../access/useAccess.js'
import styles from './EditAkun.module.css'

const MAX_PHOTO_BYTES = 5 * 1024 * 1024

function resolveAssetUrl(url) {
  if (!url) return ''
  const s = String(url)
  if (s.startsWith('data:') || s.startsWith('http://') || s.startsWith('https://') || s.startsWith('/')) return s
  return '/' + s
}

function getInitials(name) {
  return (name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Gagal membaca file.'))
    reader.readAsDataURL(file)
  })
}

const EMPTY_FORM = { name: '', username: '', email: '', gender: '', no_hp: '', tanggal_lahir: '' }

export default function EditAkun() {
  useAccess('editAkun')
  const [account, setAccount] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [notice, setNotice] = useState('')
  const [noticeKind, setNoticeKind] = useState('info')
  const [saving, setSaving] = useState(false)
  const [photoDataUrl, setPhotoDataUrl] = useState('')
  const [useDefaultPhoto, setUseDefaultPhoto] = useState(false)
  const fileInputRef = useRef(null)

  async function loadAccount() {
    setNotice('Memuat profil akun...')
    setNoticeKind('info')
    try {
      const data = await api('account.self')
      const item = (data.account && data.account.item) || {}
      setAccount(item)
      setForm({
        name: item.name || '',
        username: item.username || '',
        email: item.email || '',
        gender: item.gender || '',
        no_hp: item.noHp || '',
        tanggal_lahir: item.tanggalLahir || ''
      })
      setPhotoDataUrl('')
      setUseDefaultPhoto(false)
      setNotice('')
    } catch (error) {
      setNotice(error.message || 'Gagal memuat profil akun.')
      setNoticeKind('error')
    }
  }

  useEffect(() => {
    loadAccount()
  }, [])

  async function handlePhotoChange(event) {
    const file = event.target.files && event.target.files[0]
    if (!file) return
    if (file.size > MAX_PHOTO_BYTES) {
      setNotice('Ukuran foto maksimal 5 MB.')
      setNoticeKind('error')
      event.target.value = ''
      return
    }
    try {
      const dataUrl = await fileToDataUrl(file)
      setPhotoDataUrl(dataUrl)
      setUseDefaultPhoto(false)
    } catch (error) {
      setNotice(error.message || 'Gagal membaca file foto.')
      setNoticeKind('error')
    }
  }

  function resetPhoto() {
    setPhotoDataUrl('')
    setUseDefaultPhoto(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSave(event) {
    event.preventDefault()
    setSaving(true)
    setNotice('Menyimpan profil akun...')
    setNoticeKind('info')
    try {
      const record = { ...form }
      if (photoDataUrl) record.photo_file_data_url = photoDataUrl
      if (useDefaultPhoto) record.use_default_photo = true
      const data = await api('account.profile.save', { record }, 'POST')
      const item = (data.account && data.account.item) || account
      setAccount(item)
      setPhotoDataUrl('')
      setUseDefaultPhoto(false)
      setNotice(data.message || 'Profil akun berhasil diperbarui.')
      setNoticeKind('success')
    } catch (error) {
      setNotice(error.message || 'Gagal menyimpan profil.')
      setNoticeKind('error')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogoutAllSessions() {
    if (!window.confirm('Keluar dari SEMUA perangkat yang sedang login? Kamu juga akan keluar dari sesi ini.')) return
    try {
      await api('account.logoutAllSessions', {}, 'POST')
    } catch (error) {
      // tetap lanjut logout lokal walau request gagal -- token di perangkat ini sudah tidak relevan
    }
    clearToken()
    window.location.href = '/v2/login'
  }

  const avatarSrc = photoDataUrl || resolveAssetUrl(account && account.photoUrl)

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Akun Saya</h1>

      {notice && (
        <p
          className={
            noticeKind === 'error'
              ? `${styles.notice} ${styles.noticeError}`
              : noticeKind === 'success'
                ? `${styles.notice} ${styles.noticeSuccess}`
                : styles.notice
          }
        >
          {notice}
        </p>
      )}

      <form className={styles.card} onSubmit={handleSave}>
        <div className={styles.avatarRow}>
          <div className={styles.avatar}>
            {avatarSrc ? <img src={avatarSrc} alt={form.name || 'Foto profil'} /> : getInitials(form.name)}
          </div>
          <div className={styles.avatarActions}>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} />
            <button type="button" className={styles.dangerBtn} onClick={resetPhoto}>
              Pakai foto default
            </button>
          </div>
        </div>

        <label className={styles.field}>
          <span>Nama Pengurus</span>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>

        <label className={styles.field}>
          <span>Username</span>
          <input
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            autoComplete="off"
            placeholder="Kosongkan jika tidak diubah"
          />
        </label>

        <label className={styles.field}>
          <span>Email</span>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>

        <label className={styles.field}>
          <span>Gender</span>
          <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option value="">-</option>
            <option value="male">male</option>
            <option value="female">female</option>
          </select>
        </label>

        <label className={styles.field}>
          <span>No HP</span>
          <input value={form.no_hp} onChange={(e) => setForm({ ...form, no_hp: e.target.value })} />
        </label>

        <label className={styles.field}>
          <span>Tanggal Lahir</span>
          <input
            type="date"
            value={form.tanggal_lahir}
            onChange={(e) => setForm({ ...form, tanggal_lahir: e.target.value })}
          />
        </label>

        <div className={styles.actionsRow}>
          <button type="button" className={styles.dangerBtn} onClick={handleLogoutAllSessions}>
            Keluar dari semua perangkat
          </button>
          <button type="submit" className={styles.saveBtn} disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  )
}
