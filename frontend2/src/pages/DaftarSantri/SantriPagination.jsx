import styles from './DaftarSantri.module.css'

function buildPaginationList(page, totalPages) {
  const maxNumbers = 10
  if (totalPages <= maxNumbers) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const middleSlots = maxNumbers - 2
  const pages = [1]
  let start = Math.max(2, page - Math.floor(middleSlots / 2))
  let end = start + middleSlots - 1
  if (end > totalPages - 1) {
    end = totalPages - 1
    start = end - middleSlots + 1
  }
  if (start > 2) pages.push('...')
  for (let v = start; v <= end; v += 1) pages.push(v)
  if (end < totalPages - 1) pages.push('...')
  pages.push(totalPages)
  return pages
}

export default function SantriPagination({ page, totalPages, total, onChange }) {
  if (!total) return null
  return (
    <div className={styles.paging}>
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Sebelumnya
      </button>
      <div className={styles.pageCenter}>
        <div className={styles.pageNumbers}>
          {buildPaginationList(page, totalPages).map((item, idx) =>
            item === '...' ? (
              <span key={`e${idx}`} className={styles.pageSummary}>
                ...
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className={item === page ? `${styles.pageBtn} ${styles.pageBtnActive}` : styles.pageBtn}
                onClick={() => onChange(item)}
              >
                {item}
              </button>
            )
          )}
        </div>
        <div className={styles.pageSummary}>
          Halaman {page} dari {totalPages} | total {total} data
        </div>
      </div>
      <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Berikutnya
      </button>
    </div>
  )
}
