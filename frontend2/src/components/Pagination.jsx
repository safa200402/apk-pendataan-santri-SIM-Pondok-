import styles from './Pagination.module.css'

export default function Pagination({ page, totalPages, onChange }) {
  return (
    <div className={styles.bar}>
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Sebelumnya
      </button>
      <span>
        Halaman {page} dari {totalPages || 1}
      </span>
      <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Berikutnya
      </button>
    </div>
  )
}
