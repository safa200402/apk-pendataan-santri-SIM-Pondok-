import { NavLink } from 'react-router-dom'
import styles from './BottomTabbar.module.css'

// Subset ringkas buat layar sempit -- bukan duplikasi penuh Sidebar (biar nggak sesak).
const TABS = [
  { label: 'Beranda', path: '/beranda' },
  { label: 'Santri', path: '/daftarSantri' },
  { label: 'Tahun Ajaran', path: '/tahunAjaran' },
  { label: 'Akun', path: '/editAkun' }
]

export default function BottomTabbar() {
  return (
    <nav className={styles.tabbar} aria-label="Navigasi cepat">
      {TABS.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) => (isActive ? `${styles.link} ${styles.linkActive}` : styles.link)}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
