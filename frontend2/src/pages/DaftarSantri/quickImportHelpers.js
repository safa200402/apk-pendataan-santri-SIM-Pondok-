// Parsing "Tempel santri inti" dipindah apa adanya dari frontend lama supaya format LABEL:value
// yang sudah dipakai pengguna tetap kebaca sama persis (validasi/hitung entry.record tetap di
// server lewat santri.quickImportPreview, di sini cuma bikin drafts-nya).

export function cleanQuickImportText(value) {
  return String(value == null ? '' : value)
    .replace(/\r\n/g, '\n')
    .replace(/^\s*```(?:[\w-]+)?\s*$/gm, '')
    .trim()
}

export function createQuickImportDraft() {
  return {
    name: '',
    renamedName: '',
    nickname: '',
    noInduk: '',
    nik: '',
    gender: '',
    status: '',
    program: '',
    noHp: '',
    catatan: ''
  }
}

export function hasQuickImportDraftContent(draft) {
  return Object.values(draft || {}).some((value) => String(value == null ? '' : value).trim())
}

const FIELD_PATTERNS = [
  { key: 'name', pattern: /^(?:\W+\s*)?santri\s*:\s*(.*)$/i },
  { key: 'renamedName', pattern: /^(?:nama\s+ubah|nama\s+setelah\s+diubah)\s*:\s*(.*)$/i },
  { key: 'nickname', pattern: /^(?:panggilan|nama\s+panggilan)\s*:\s*(.*)$/i },
  { key: 'noInduk', pattern: /^(?:nis|no\s+induk|nomor\s+induk)\s*:\s*(.*)$/i },
  { key: 'nik', pattern: /^nik\s*:\s*(.*)$/i },
  { key: 'gender', pattern: /^(?:gender|jenis\s+kelamin)\s*:\s*(.*)$/i },
  { key: 'status', pattern: /^status\s*:\s*(.*)$/i },
  { key: 'noHp', pattern: /^(?:no\s*hp|hp|telepon|phone)\s*:\s*(.*)$/i },
  { key: 'catatan', pattern: /^(?:catatan|keterangan)\s*:\s*(.*)$/i }
]

export function detectQuickImportField(line) {
  return FIELD_PATTERNS.reduce((result, item) => {
    if (result) return result
    const match = line.match(item.pattern)
    return match ? { key: item.key, value: match[1] || '' } : null
  }, null)
}

export function appendQuickImportDraftValue(draft, key, line) {
  if (!draft || !key) return
  const value = String(line == null ? '' : line).replace(/\s+$/g, '')
  if (!value && key !== 'catatan') return
  draft[key] = draft[key] ? `${draft[key]}\n${value}` : value
}

export function parseQuickImportEntries(rawText) {
  const cleaned = cleanQuickImportText(rawText)
  if (!cleaned) return []

  const drafts = []
  let current = createQuickImportDraft()
  let currentField = ''

  cleaned.split('\n').forEach((line) => {
    const field = detectQuickImportField(line.trim())
    if (field) {
      if (field.key === 'name' && hasQuickImportDraftContent(current)) {
        drafts.push(current)
        current = createQuickImportDraft()
      }
      currentField = field.key
      appendQuickImportDraftValue(current, currentField, field.value)
      return
    }
    if (!currentField) return
    appendQuickImportDraftValue(current, currentField, line)
  })

  if (hasQuickImportDraftContent(current)) drafts.push(current)
  return drafts
}
