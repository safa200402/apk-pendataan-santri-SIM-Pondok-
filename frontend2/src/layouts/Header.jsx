import { useEffect, useRef, useState } from 'react'
import { useSession } from '../access/SessionContext.jsx'
import styles from './Header.module.css'

// Padanan header-right + role-scope-menu di frontend lama: chip jabatan di kanan, diklik utk
// buka daftar jabatan/scope lain yang dipunyai pengurus ini (session.roleScopeOptions), dengan
// input pencarian karena daftarnya bisa panjang utk pengurus multi-jabatan. Murni penyaring
// tampilan client-side -- lihat access/roleScope.js.
export default function Header() {
  const { session, scopeOptions, activeScopeLabel, selectScope } = useSession()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const wrapRef = useRef(null)
  const searchRef = useRef(null)

  const jabatanText =
    (session && (session.scopeLabel || session.primaryJabatanLabel)) ||
    (session && session.jabatanLabels && session.jabatanLabels.join(', ')) ||
    'Pengurus'

  useEffect(() => {
    if (!open) return
    setQ('')
    searchRef.current && searchRef.current.focus()
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const filtered = scopeOptions.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()))

  function handlePick(label) {
    selectScope(label)
    setOpen(false)
  }

  const hasMultipleScopes = scopeOptions.length > 1

  return (
    <header className={styles.header}>
      <p className={styles.title}>Pendataan Santri (v2)</p>
      <div className={styles.chipWrap} ref={wrapRef}>
        <button
          type="button"
          className={styles.chip}
          onClick={() => hasMultipleScopes && setOpen((v) => !v)}
          aria-haspopup={hasMultipleScopes || undefined}
          aria-expanded={hasMultipleScopes ? open : undefined}
        >
          {jabatanText}
          {hasMultipleScopes && <span className={styles.chevron}>{'▾'}</span>}
        </button>

        {open && hasMultipleScopes && (
          <div className={styles.menu} role="menu">
            <input
              ref={searchRef}
              type="search"
              className={styles.menuSearch}
              placeholder="Cari jabatan..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className={styles.menuList}>
              {filtered.length === 0 && <p className={styles.menuEmpty}>Tidak ada jabatan yang cocok.</p>}
              {filtered.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  role="menuitemradio"
                  aria-checked={normalizeCompare(option.label) === normalizeCompare(activeScopeLabel)}
                  className={
                    normalizeCompare(option.label) === normalizeCompare(activeScopeLabel)
                      ? `${styles.menuItem} ${styles.menuItemActive}`
                      : styles.menuItem
                  }
                  onClick={() => handlePick(option.label)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

function normalizeCompare(text) {
  return String(text || '').trim().toLowerCase()
}
