import * as XLSX from 'xlsx'
import { api } from '../../lib/api.js'
import { SANTRI_EXCEL_SCHEMA } from './santriExcelSchema.js'

const SHEET_KEY = 'santri'

function makeSheetName(name) {
  return String(name || 'Sheet').replace(/[\\/?*:[\]]/g, ' ').slice(0, 31) || 'Sheet'
}

function referenceSheets(refs) {
  const result = []
  if (!refs) return result
  if (Array.isArray(refs.pengurus)) {
    result.push(['Referensi Pengurus', refs.pengurus.map((item) => ({ id: item.id, name: item.name }))])
  }
  if (Array.isArray(refs.halaqoh)) {
    result.push(['Referensi Halaqoh', refs.halaqoh.map((item) => ({ id: item.id, name: item.name }))])
  }
  if (Array.isArray(refs.kelas)) {
    result.push(['Referensi Kelas', refs.kelas.map((item) => ({ id: item.id, name: item.name, jam: item.jam || '' }))])
  }
  if (Array.isArray(refs.regu)) {
    result.push(['Referensi Regu', refs.regu.map((item) => ({ id: item.id, name: item.name }))])
  }
  return result
}

export async function downloadSantriTemplate() {
  const refs = await api('excel.template', { sheetKey: SHEET_KEY })
  const keys = SANTRI_EXCEL_SCHEMA.map((item) => item[0])
  const guideRows = SANTRI_EXCEL_SCHEMA.map((item) => ({ key: item[0], keterangan: item[1] }))

  const workbook = XLSX.utils.book_new()
  const templateRows = [Object.fromEntries(keys.map((key) => [key, '']))]
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(templateRows, { header: keys }), makeSheetName('Santri Template'))
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(guideRows, { header: ['key', 'keterangan'] }), 'Petunjuk')
  referenceSheets(refs).forEach(([title, rows]) => {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), makeSheetName(title))
  })
  XLSX.writeFile(workbook, 'template-santri.xlsx')
}

export async function exportSantriExcel() {
  const data = await api('export.data', { sheetKeys: SHEET_KEY })
  const workbook = XLSX.utils.book_new()
  const datasets = data.datasets || {}
  Object.keys(datasets).forEach((key) => {
    const dataset = datasets[key]
    const rows = dataset.rows || []
    const headers = (dataset.columns || []).map((c) => c.key)
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers })
    XLSX.utils.book_append_sheet(workbook, worksheet, makeSheetName(dataset.sheetName || key))
  })
  XLSX.writeFile(workbook, 'export-santri.xlsx')
}
