import styles from './Placeholder.module.css'

// Dipakai halaman Tier 1 yang belum diimplementasi penuh -- tinggal ganti isi index.jsx
// masing-masing halaman dengan logic nyata (niru pola DaftarSantri) kapan pun siap.
export default function Placeholder({ title }) {
  return (
    <div className={styles.card}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.note}>Halaman ini belum diimplementasi di frontend2 (masih placeholder).</p>
    </div>
  )
}
