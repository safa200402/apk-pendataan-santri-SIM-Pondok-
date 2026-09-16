import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Satu-satunya jembatan tokens.json -> tokens.css. Jangan edit tokens.css manual,
// edit tokens.json lalu jalankan ulang (otomatis lewat predev/prebuild).
const __dirname = dirname(fileURLToPath(import.meta.url))
const tokensPath = join(__dirname, '../src/styles/tokens.json')
const outPath = join(__dirname, '../src/styles/tokens.css')

const tokens = JSON.parse(readFileSync(tokensPath, 'utf8'))

function kebab(str) {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

function flatten(obj, prefix = []) {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = [...prefix, key]
    if (value && typeof value === 'object') return flatten(value, path)
    return [`  --${path.map(kebab).join('-')}: ${value};`]
  })
}

const lines = flatten(tokens)
const css = `/* AUTO-GENERATED dari tokens.json oleh scripts/buildTokens.mjs -- jangan diedit manual. */\n:root {\n${lines.join('\n')}\n}\n`

writeFileSync(outPath, css)
console.log(`[tokens] tokens.css dibuat dari tokens.json (${lines.length} variabel).`)
