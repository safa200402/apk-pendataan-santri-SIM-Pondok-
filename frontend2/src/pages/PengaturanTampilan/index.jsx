import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { applyTheme, loadAndApplyTheme } from '../../lib/theme.js'
import { useAccess } from '../../access/useAccess.js'
import styles from './PengaturanTampilan.module.css'

const ACCENT_COLOR_FIELDS = [
  { key: 'primary', label: 'Warna utama' },
  { key: 'primaryStrong', label: 'Warna utama (tegas / hover tombol)' },
  { key: 'primarySoft', label: 'Warna utama (lembut)' },
  { key: 'danger', label: 'Bahaya / hapus' },
  { key: 'success', label: 'Sukses' },
  { key: 'warning', label: 'Peringatan' }
]

const BASE_COLOR_FIELDS = [
  { key: 'bg', label: 'Latar halaman' },
  { key: 'surface', label: 'Latar kartu/kotak' },
  { key: 'text', label: 'Teks utama' },
  { key: 'textMuted', label: 'Teks pudar/keterangan' },
  { key: 'border', label: 'Garis pembatas' }
]

const COLOR_FIELDS = ACCENT_COLOR_FIELDS.concat(BASE_COLOR_FIELDS)

const DEFAULT_THEME = {
  colors: {
    primary: '#c49a2c',
    primaryStrong: '#d8b34a',
    primarySoft: '#efd890',
    danger: '#c0392b',
    success: '#2e7d32',
    warning: '#e65100',
    bg: '#f7f5f0',
    surface: '#ffffff',
    text: '#333333',
    textMuted: '#6b6b6b',
    border: '#e2ddd0'
  },
  fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  uiScale: 1
}

export default function PengaturanTampilan() {
  const { session, loading: accessLoading } = useAccess('pengaturanTampilan')
  const [form, setForm] = useState(DEFAULT_THEME)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [noticeKind, setNoticeKind] = useState('info')
  const [meta, setMeta] = useState(null)

  const permissions = (session && session.permissions) || {}
  const canManage = !!(permissions.isAdmin || permissions.isSuperAdmin)

  useEffect(() => {
    if (accessLoading) return
    api('appTheme.get')
      .then((data) => {
        setForm({
          colors: { ...DEFAULT_THEME.colors, ...(data.colors || {}) },
          fontFamily: data.fontFamily || DEFAULT_THEME.fontFamily,
          uiScale: data.uiScale || DEFAULT_THEME.uiScale
        })
        setMeta({ setBy: data.setBy, setAt: data.setAt })
      })
      .catch((error) => {
        setNotice(error.message || 'Gagal memuat pengaturan tampilan.')
        setNoticeKind('error')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessLoading])

  function updateColor(key, value) {
    setForm((prev) => {
      const next = { ...prev, colors: { ...prev.colors, [key]: value } }
      applyTheme(next)
      return next
    })
  }

  function updateFontFamily(value) {
    setForm((prev) => {
      const next = { ...prev, fontFamily: value }
      applyTheme(next)
      return next
    })
  }

  function updateScalePercent(percent) {
    const clamped = Math.min(200, Math.max(50, percent))
    setForm((prev) => {
      const next = { ...prev, uiScale: clamped / 100 }
      applyTheme(next)
      return next
    })
  }

  function handleReset() {
    setForm(DEFAULT_THEME)
    applyTheme(DEFAULT_THEME)
  }

  function handleCancel() {
    loadAndApplyTheme().then((data) => {
      if (data) {
        setForm({
          colors: { ...DEFAULT_THEME.colors, ...(data.colors || {}) },
          fontFamily: data.fontFamily || DEFAULT_THEME.fontFamily,
          uiScale: data.uiScale || DEFAULT_THEME.uiScale
        })
      }
    })
    setNotice('Perubahan yang belum disimpan dibatalkan.')
    setNoticeKind('info')
  }

  async function handleSave(event) {
    event.preventDefault()
    setSaving(true)
    setNotice('Menyimpan pengaturan tampilan...')
    setNoticeKind('info')
    try {
      const data = await api(
        'appTheme.set',
        { colors: JSON.stringify(form.colors), font_family: form.fontFamily, ui_scale: form.uiScale },
        'POST'
      )
      applyTheme(data)
      setMeta({ setBy: data.setBy, setAt: data.setAt })
      setNotice('Pengaturan tampilan berhasil disimpan untuk semua pengguna.')
      setNoticeKind('success')
    } catch (error) {
      setNotice(error.message || 'Gagal menyimpan pengaturan tampilan.')
      setNoticeKind('error')
    } finally {
      setSaving(false)
    }
  }

  const scalePercent = Math.round((form.uiScale || 1) * 100)

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Pengaturan Tampilan</h1>
      <p className={styles.notice}>
        Warna, font, dan ukuran tampilan di sini berlaku untuk SEMUA pengguna yang login (bukan cuma browser kamu),
        persis seperti pengaturan branding portal lainnya. Perubahan langsung kelihatan begitu diketik/dipilih --
        klik Simpan untuk membuatnya permanen.
      </p>

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
        <div className={styles.section}>
          <p className={styles.sectionTitle}>Warna aksen</p>
          <div className={styles.colorGrid}>
            {ACCENT_COLOR_FIELDS.map((field) => (
              <label key={field.key} className={styles.colorField}>
                <input
                  type="color"
                  value={form.colors[field.key]}
                  disabled={!canManage}
                  onChange={(e) => updateColor(field.key, e.target.value)}
                />
                {field.label}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <p className={styles.sectionTitle}>Warna dasar tampilan</p>
          <div className={styles.colorGrid}>
            {BASE_COLOR_FIELDS.map((field) => (
              <label key={field.key} className={styles.colorField}>
                <input
                  type="color"
                  value={form.colors[field.key]}
                  disabled={!canManage}
                  onChange={(e) => updateColor(field.key, e.target.value)}
                />
                {field.label}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <p className={styles.sectionTitle}>Font</p>
          <label className={styles.field}>
            <span>Nama font (CSS font-family)</span>
            <input
              value={form.fontFamily}
              disabled={!canManage}
              onChange={(e) => updateFontFamily(e.target.value)}
              placeholder="mis. Georgia, 'Times New Roman', serif"
            />
          </label>
        </div>

        <div className={styles.section}>
          <p className={styles.sectionTitle}>Ukuran tampilan (font ikut membesar/mengecil)</p>
          <div className={styles.scaleRow}>
            <button type="button" disabled={!canManage} onClick={() => updateScalePercent(scalePercent - 20)}>
              -20%
            </button>
            <input
              type="number"
              min={50}
              max={200}
              value={scalePercent}
              disabled={!canManage}
              onChange={(e) => updateScalePercent(Number(e.target.value) || 100)}
            />
            <span>%</span>
            <button type="button" disabled={!canManage} onClick={() => updateScalePercent(scalePercent + 20)}>
              +20%
            </button>
            <button type="button" disabled={!canManage} onClick={() => updateScalePercent(100)}>
              Normal (100%)
            </button>
          </div>
        </div>

        {canManage && (
          <div className={styles.actionsRow}>
            <div>
              <button type="button" className={styles.resetBtn} onClick={handleReset}>
                Kembalikan default
              </button>
              <button type="button" className={styles.resetBtn} onClick={handleCancel} style={{ marginLeft: 8 }}>
                Batalkan perubahan
              </button>
            </div>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan untuk semua pengguna'}
            </button>
          </div>
        )}

        {!canManage && <p className={styles.notice}>Hanya Admin/Super Admin yang bisa mengubah pengaturan ini.</p>}

        {meta && meta.setBy && (
          <p className={styles.meta}>
            Terakhir diubah oleh {meta.setBy}
            {meta.setAt ? ` · ${meta.setAt}` : ''}
          </p>
        )}
      </form>
    </div>
  )
}
