// Import Excel santri -- dipindah dari mesin generik frontend/shared-excel.js (importDataset +
// resolveImportJobs + runImportJobs), dipersempit khusus dataset 'santri' saja (bukan seluruh
// sheetKey yang didukung shared-excel.js). Alurnya: parse file -> import.preview (server cari
// baris yang namanya mirip data existing) -> kalau ada konflik, user putuskan per baris
// (skip/ganti/lanjutkan) -> batch.save per 50 baris.
import * as XLSX from 'xlsx'
import { api } from '../../lib/api.js'
import { SANTRI_EXCEL_SCHEMA } from './santriExcelSchema.js'

const SHEET_KEY = 'santri'

function normalizeImportFieldKey(field) {
  return String(field || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

const SCHEMA_FIELD_LOOKUP = (() => {
  const lookup = {}
  SANTRI_EXCEL_SCHEMA.forEach(([field]) => {
    const normalized = normalizeImportFieldKey(field)
    if (field && normalized && !lookup[normalized]) lookup[normalized] = field
  })
  return lookup
})()

function sanitizeImportRow(row) {
  const cleaned = {}
  Object.keys(row || {}).forEach((field) => {
    const rawField = String(field || '').trim()
    const normalized = normalizeImportFieldKey(rawField)
    if (!normalized) return
    // id/token/created_at/updated_at sengaja dibuang -- pencocokan baris ke data existing
    // ditentukan server lewat import.preview (nama/NIK/dll), bukan ID mentah dari file.
    if (['id', 'token', 'created_at', 'updated_at'].includes(normalized)) return
    cleaned[SCHEMA_FIELD_LOOKUP[normalized] || rawField] = row[field]
  })
  delete cleaned.token
  return cleaned
}

function stripEmptyRows(rows) {
  return rows.filter((row) =>
    Object.keys(row || {}).some((key) => String(row[key] === undefined || row[key] === null ? '' : row[key]).trim() !== '')
  )
}

export async function parseSantriImportFile(file) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const rawRows = stripEmptyRows(XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false }))
  const rows = rawRows.map(sanitizeImportRow).filter((row) => stripEmptyRows([row]).length > 0)
  if (!rows.length) throw new Error('File Excel tidak berisi baris data.')
  return rows
}

export async function previewImportConflicts(rows) {
  const data = await api('import.preview', { sheetKey: SHEET_KEY, records: rows }, 'POST')
  return Array.isArray(data.conflicts) ? data.conflicts : []
}

// Item dialog konflik: 1 per baris bentrok, dengan keputusan default dari rekomendasi server.
export function buildConflictItems(conflicts) {
  return conflicts.map((conflict) => ({
    key: `row-${conflict.rowIndex}`,
    rowIndex: conflict.rowIndex,
    rowNumber: conflict.rowNumber || conflict.rowIndex + 2,
    name: conflict.name || '',
    matchCount: Number(conflict.matchCount || (conflict.existingMatches || []).length || 0),
    existingMatches: Array.isArray(conflict.existingMatches) ? conflict.existingMatches : [],
    canReplace: !!conflict.canReplace,
    replaceTargetId: conflict.replaceTargetId || '',
    decision: conflict.recommendedAction || (conflict.canReplace ? 'replace' : 'skip')
  }))
}

// Terapkan keputusan per baris (dari dialog konflik) ke rows asli -- skip dibuang, replace
// ditandai __importAction/__importExistingId (dibaca backend batch.save untuk update bukan
// create baru), lanjutkan/tanpa konflik dikirim apa adanya (create baru).
export function applyConflictDecisions(rows, conflictItems) {
  const decisionByRowIndex = {}
  conflictItems.forEach((item) => {
    decisionByRowIndex[item.rowIndex] = item
  })
  const result = []
  rows.forEach((row, rowIndex) => {
    const conflictItem = decisionByRowIndex[rowIndex]
    if (!conflictItem) {
      result.push(row)
      return
    }
    if (conflictItem.decision === 'skip') return
    const nextRow = { ...row }
    if (conflictItem.decision === 'replace' && conflictItem.canReplace && conflictItem.replaceTargetId) {
      nextRow.__importAction = 'replace'
      nextRow.__importExistingId = conflictItem.replaceTargetId
    }
    result.push(nextRow)
  })
  return result
}

function buildChunks(rows, size) {
  const chunks = []
  for (let i = 0; i < rows.length; i += size) chunks.push(rows.slice(i, i + size))
  return chunks
}

export async function batchSaveSantri(rows, onProgress) {
  const chunks = buildChunks(rows, 50)
  let completed = 0
  for (const chunk of chunks) {
    await api('batch.save', { sheetKey: SHEET_KEY, records: chunk }, 'POST')
    completed += chunk.length
    if (onProgress) onProgress(completed, rows.length)
  }
  return { count: rows.length }
}
