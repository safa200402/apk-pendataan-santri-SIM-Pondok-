import { api } from './api.js'

// Nama token warna (key di appTheme.colors) -> nama CSS custom property di tokens.css.
const COLOR_VAR_MAP = {
  primary: '--color-primary',
  primaryStrong: '--color-primary-strong',
  primarySoft: '--color-primary-soft',
  danger: '--color-danger',
  success: '--color-success',
  warning: '--color-warning',
  bg: '--color-bg',
  surface: '--color-surface',
  text: '--color-text',
  textMuted: '--color-text-muted',
  border: '--color-border'
}

// Terapkan appTheme (dari appTheme.get/appTheme.set) ke seluruh app lewat CSS custom
// properties di :root -- ini yang bikin ganti warna/font/ukuran langsung kelihatan tanpa
// reload, karena semua *.module.css sudah pakai var(--color-primary) dkk, bukan hex literal.
export function applyTheme(theme) {
  if (!theme) return
  const root = document.documentElement
  const colors = theme.colors || {}
  Object.keys(COLOR_VAR_MAP).forEach((key) => {
    if (colors[key]) root.style.setProperty(COLOR_VAR_MAP[key], colors[key])
  })
  if (theme.fontFamily) root.style.setProperty('--app-font-family', theme.fontFamily)
  if (theme.uiScale) root.style.setProperty('--app-ui-scale', String(theme.uiScale))
}

export async function loadAndApplyTheme() {
  try {
    const theme = await api('appTheme.get')
    applyTheme(theme)
    return theme
  } catch (error) {
    return null
  }
}
