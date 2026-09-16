import Sidebar from './Sidebar.jsx'
import Header from './Header.jsx'
import BottomTabbar from './BottomTabbar.jsx'
import styles from './Shell.module.css'

// Sidebar/Header/BottomTabbar di-mount SEKALI di sini dan tetap hidup selama user pindah
// halaman -- hanya {children} (isi route aktif) yang berganti. Ini inti kenapa pindah
// halaman di frontend2 tidak reload/flash seperti frontend lama.
export default function Shell({ children }) {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.body}>
        <Header />
        <main className={styles.content}>{children}</main>
        <BottomTabbar />
      </div>
    </div>
  )
}
