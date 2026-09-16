import { Link } from 'react-router-dom'
import { useAccess } from '../../access/useAccess.js'
import { NAV_GROUPS } from '../../nav/navGroups.js'
import styles from './Beranda.module.css'

// Beranda versi frontend2 sengaja jadi menu/launcher sederhana dulu -- carousel jadwal
// ibadah, popup pengumuman wajib-respon, dan sistem audit nagging di halaman lama itu
// fitur level-shell yang belum ada padanannya di sini, jadi belum diport supaya tidak
// setengah-setengah.
export default function Beranda() {
  const { session } = useAccess('beranda')

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.welcome}>
          Selamat datang, <span className={styles.welcomeName}>{session ? session.name : ''}</span>
        </h1>
        <p className={styles.note}>
          Jadwal ibadah, pengumuman, dan audit belum ada di frontend2 -- cek lewat frontend lama kalau perlu.
        </p>
      </div>

      {NAV_GROUPS.map((group) => (
        <div className={styles.group} key={group.title}>
          <p className={styles.groupTitle}>{group.title}</p>
          <div className={styles.cards}>
            {group.items.map((item) => (
              <Link key={item.path} to={item.path} className={styles.card}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
