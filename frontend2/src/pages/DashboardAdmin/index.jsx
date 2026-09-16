import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useAccess } from '../../access/useAccess.js'
import styles from './DashboardAdmin.module.css'

const STAT_ITEMS = [
  { key: 'santriAktif', label: 'Santri Aktif' },
  { key: 'santriTidakAktif', label: 'Santri Tidak Aktif', muted: true },
  { key: 'santriDibekukan', label: 'Santri Dibekukan', muted: true },
  { key: 'pengurusAktif', label: 'Pengurus Aktif' },
  { key: 'pengurusTidakAktif', label: 'Pengurus Tdk Aktif', muted: true },
  { key: 'pengurusDibekukan', label: 'Pengurus Dibekukan', muted: true }
]

const SECTIONS = [
  {
    id: 'santriData',
    title: 'Kelengkapan Data Santri',
    hint: 'Santri aktif yang memiliki field data penting yang kosong (nama, NIS, tempat/tanggal lahir, jenis kelamin, alamat) ditampilkan di sini.',
    renderRow: (r) => ({
      name: r.name,
      detail: (
        <>
          {r.noInduk || '-'} &middot; <span className={styles.tagWarn}>Kosong: {(r.missingFields || []).join(', ')}</span>
        </>
      )
    })
  },
  {
    id: 'santriDibekukan',
    title: 'Santri Dibekukan',
    isInfo: true,
    hint: 'Catatan informatif. Santri dibekukan boleh belum masuk halaqoh, kelas, atau regu, tetapi tetap ditampilkan agar mudah dipantau.',
    renderRow: (r) => ({ name: r.name, detail: r.noInduk || '-' })
  },
  {
    id: 'santriHalaqoh',
    title: 'Santri Aktif Tidak Tepat Satu Halaqoh',
    hint: 'Setiap santri aktif wajib berada di tepat 1 halaqoh aktif pada tahun ajaran aktif. Audit yang sama juga ada di Dashboard Koordinator Halaqoh.',
    renderRow: (r) => ({
      name: r.name,
      detail: (
        <>
          {r.noInduk || '-'} &middot;{' '}
          <span className={styles.tagWarn}>
            {r.jumlahHalaqoh === 0 ? 'Tidak ada halaqoh' : `${r.jumlahHalaqoh} halaqoh: ${(r.halaqohNames || []).join(', ')}`}
          </span>
        </>
      )
    })
  },
  {
    id: 'santriKelas',
    title: 'Santri Aktif Tidak Tepat 3 Kelas',
    hint: 'Setiap santri aktif wajib terdaftar di tepat 3 kelas siang aktif pada tahun ajaran aktif. Audit yang sama juga ada di Dashboard Akademik.',
    renderRow: (r) => ({
      name: r.name,
      detail: (
        <>
          {r.noInduk || '-'} &middot;{' '}
          <span className={styles.tagWarn}>
            {r.jumlahKelas} kelas{(r.kelasNames || []).length ? `: ${r.kelasNames.join(', ')}` : ''}
          </span>
        </>
      )
    })
  },
  {
    id: 'santriRegu',
    title: 'Santri Aktif Tidak Tepat Satu Regu',
    hint: 'Setiap santri aktif wajib berada di tepat 1 regu aktif pada tahun ajaran aktif. Audit yang sama juga ada di Dashboard Kesantrian.',
    renderRow: (r) => ({
      name: r.name,
      detail: (
        <>
          {r.noInduk || '-'} &middot;{' '}
          <span className={styles.tagWarn}>
            {r.jumlahRegu === 0 ? 'Tidak ada regu' : `${r.jumlahRegu} regu: ${(r.reguNames || []).join(', ')}`}
          </span>
        </>
      )
    })
  },
  {
    id: 'kegiatanTanpaJabatan',
    title: 'Kegiatan Tanpa Jabatan Penanggung Jawab',
    hint: 'Kegiatan operasional aktif yang tidak memiliki satupun item SOP dengan penanggung jawab.',
    renderRow: (r) => ({ name: r.name, detail: <span className={styles.tagWarn}>Tidak ada PJ</span> })
  },
  {
    id: 'kegiatanTanpaJabatanUtama',
    title: 'Kegiatan Tanpa Jabatan PJ Utama',
    hint: 'Kegiatan operasional aktif yang tidak memiliki jabatan penanggung jawab utama.',
    renderRow: (r) => ({ name: r.name, detail: <span className={styles.tagWarn}>PJ Utama kosong</span> })
  },
  {
    id: 'kegiatanTanpaKategori',
    title: 'Kegiatan Tanpa Deskripsi/Kategori',
    hint: 'Kegiatan operasional aktif yang tidak memiliki deskripsi/konteks.',
    renderRow: (r) => ({ name: r.name, detail: <span className={styles.tagWarn}>Deskripsi kosong</span> })
  },
  {
    id: 'duplikatNik',
    title: 'NIK Santri Duplikat',
    hint: 'Ada santri dengan NIK yang sama. Rawan salah identitas.',
    renderRow: (r) => ({
      name: `NIK: ${r.value}`,
      detail: (
        <>
          <span className={styles.tagWarn}>{(r.items || []).length} santri</span>: {(r.items || []).map((i) => i.name).join(', ')}
        </>
      )
    })
  },
  {
    id: 'duplikatNoInduk',
    title: 'No Induk Santri Duplikat',
    hint: 'Ada santri dengan No Induk yang sama. Perlu diseragamkan.',
    renderRow: (r) => ({
      name: `No Induk: ${r.value}`,
      detail: (
        <>
          <span className={styles.tagWarn}>{(r.items || []).length} santri</span>: {(r.items || []).map((i) => i.name).join(', ')}
        </>
      )
    })
  }
]

export default function DashboardAdmin() {
  const { loading: accessLoading } = useAccess('dashboardAdmin')
  const [stats, setStats] = useState(null)
  const [counts, setCounts] = useState({})
  const [expanded, setExpanded] = useState({})
  const [sectionData, setSectionData] = useState({})
  const [notice, setNotice] = useState('')
  const [noticeIsError, setNoticeIsError] = useState(false)

  async function loadSummary() {
    setNotice('Memuat data...')
    setNoticeIsError(false)
    try {
      const d = await api('dashboard.admin.audit')
      setStats(d.stats || null)
      setCounts(d.counts || {})
      setNotice('')
    } catch (error) {
      setNotice(error.message || 'Gagal memuat data.')
      setNoticeIsError(true)
    }
  }

  useEffect(() => {
    if (accessLoading) return
    loadSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessLoading])

  async function loadSection(sectionId, page) {
    setSectionData((prev) => ({ ...prev, [sectionId]: { ...(prev[sectionId] || {}), loading: true } }))
    try {
      const d = await api('dashboard.admin.audit', { section: sectionId, page })
      setSectionData((prev) => ({ ...prev, [sectionId]: { ...d, page, loading: false, error: '' } }))
      setCounts((prev) => ({ ...prev, [sectionId]: d.total }))
    } catch (error) {
      setSectionData((prev) => ({
        ...prev,
        [sectionId]: { ...(prev[sectionId] || {}), loading: false, error: error.message || 'Gagal memuat.' }
      }))
    }
  }

  function toggleSection(sectionId) {
    const willOpen = !expanded[sectionId]
    setExpanded((prev) => ({ ...prev, [sectionId]: willOpen }))
    if (willOpen && !sectionData[sectionId]) loadSection(sectionId, 1)
  }

  function renderPagination(section, data) {
    const total = data.total || 0
    const limit = data.limit || 20
    const pages = Math.ceil(total / limit)
    if (pages <= 1) return null
    const page = data.page || 1
    const maxBtn = 10
    let start = Math.max(1, page - Math.floor(maxBtn / 2))
    let end = Math.min(pages, start + maxBtn - 1)
    if (end - start < maxBtn - 1) start = Math.max(1, end - maxBtn + 1)
    const nums = []
    for (let i = start; i <= end; i++) nums.push(i)
    return (
      <div className={styles.pagination}>
        <button type="button" disabled={page <= 1} onClick={() => loadSection(section.id, page - 1)}>
          &laquo;
        </button>
        {nums.map((n) => (
          <button
            key={n}
            type="button"
            className={n === page ? styles.pageActive : ''}
            onClick={() => loadSection(section.id, n)}
          >
            {n}
          </button>
        ))}
        <button type="button" disabled={page >= pages} onClick={() => loadSection(section.id, page + 1)}>
          &raquo;
        </button>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Dashboard Admin</h1>
      {notice && <p className={noticeIsError ? `${styles.notice} ${styles.noticeError}` : styles.notice}>{notice}</p>}

      {stats && (
        <div className={styles.statsGrid}>
          {STAT_ITEMS.map((item) => (
            <div key={item.key} className={item.muted ? `${styles.statCard} ${styles.statCardMuted}` : styles.statCard}>
              <span className={styles.statNum}>{stats[item.key] ?? '-'}</span>
              <span className={styles.statLabel}>{item.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.sections}>
        {SECTIONS.map((section) => {
          const count = counts[section.id] ?? 0
          const data = sectionData[section.id]
          const isOpen = !!expanded[section.id]
          const badgeClass = section.isInfo ? styles.badgeInfo : count === 0 ? styles.badgeOk : styles.badgeWarn
          return (
            <div key={section.id} className={styles.section}>
              <button type="button" className={styles.sectionHeader} onClick={() => toggleSection(section.id)}>
                <span className={styles.sectionTitle}>{section.title}</span>
                <span className={`${styles.badge} ${badgeClass}`}>{section.isInfo ? count : count === 0 ? 'OK' : count}</span>
              </button>
              {isOpen && (
                <div className={styles.sectionBody}>
                  <p className={styles.hint}>{section.hint}</p>
                  {!data || data.loading ? (
                    <p className={styles.notice}>Memuat...</p>
                  ) : data.error ? (
                    <p className={`${styles.notice} ${styles.noticeError}`}>{data.error}</p>
                  ) : !data.items || data.items.length === 0 ? (
                    <p className={styles.emptyOk}>
                      {section.isInfo ? 'Tidak ada santri dibekukan saat ini.' : 'Semua OK — tidak ada masalah.'}
                    </p>
                  ) : (
                    <>
                      {data.items.map((r, idx) => {
                        const row = section.renderRow(r)
                        return (
                          <div key={idx} className={styles.issueRow}>
                            <span className={styles.issueName}>{row.name}</span>
                            <span className={styles.issueDetail}>{row.detail}</span>
                          </div>
                        )
                      })}
                      {renderPagination(section, data)}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
