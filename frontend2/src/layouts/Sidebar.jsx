import { NavLink, useNavigate } from 'react-router-dom'
import { NAV_GROUPS } from '../nav/navGroups.js'
import { useSession } from '../access/SessionContext.jsx'
import { clearToken } from '../lib/api.js'
import styles from './Sidebar.module.css'

export default function Sidebar() {
  const { session } = useSession()
  const navigate = useNavigate()

  function handleLogout() {
    clearToken()
    navigate('/login', { replace: true })
  }

  return (
    <nav className={styles.sidebar} aria-label="Navigasi utama">
      <p className={styles.brand}>Pendataan Santri</p>
      <div className={styles.scroll}>
        {NAV_GROUPS.map((group) => (
          <div className={styles.group} key={group.title}>
            <p className={styles.groupTitle}>{group.title}</p>
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => (isActive ? `${styles.link} ${styles.linkActive}` : styles.link)}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <span className={styles.footerName}>{session ? session.name : ''}</span>
        <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
          Keluar
        </button>
      </div>
    </nav>
  )
}
