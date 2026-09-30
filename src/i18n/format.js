/**
 * Inti teks antarmuka tanpa React, supaya bisa dipakai juga oleh skrip build (meta tag halaman statis, lihat
 * src/seo/pageMeta.js): mencari teks lewat kunci bertitik dan mengisi {nama} dengan nilai.
 *
 * Bentuk jamak (dipakai bahasa Inggris): {count|recipe|recipes} memilih kata pertama kalau nilai `count` = 1 dan kata
 * kedua untuk nilai lain, jadi "{count} {count|recipe|recipes}" → "1 recipe" / "12 recipes". Bahasa Indonesia dan Thai
 * tidak membedakan tunggal/jamak, jadi tidak memakainya.
 */
const PLACEHOLDER = /\{(\w+)(?:\|([^{}|]*)\|([^{}|]*))?\}/g

export function lookup(messages, key) {
  let node = messages
  for (const part of key.split('.')) {
    node = node?.[part]
    if (node === undefined) return undefined
  }
  return node
}

/** Potongan teks & nilai berurutan; nilainya bisa apa saja (angka, string, elemen React). Nilai yang tidak ada → "{nama}". */
export function formatParts(template, vars = {}) {
  const parts = []
  let last = 0
  for (const match of template.matchAll(PLACEHOLDER)) {
    const [whole, name, one, other] = match
    parts.push(template.slice(last, match.index))
    if (one !== undefined) parts.push(Number(vars[name]) === 1 ? one : other)
    else parts.push(vars[name] ?? whole)
    last = match.index + whole.length
  }
  parts.push(template.slice(last))
  return parts
}

/** Teks jadi (string) untuk nilai yang semuanya teks/angka. */
export function formatText(template, vars) {
  if (typeof template !== 'string') return template
  return vars ? formatParts(template, vars).join('') : template
}

/** Penerjemah tanpa React: `t(key, vars)` → string; kunci yang tidak ada di `messages` diambil dari `fallback`. */
export function createTextTranslator(messages, fallback = messages) {
  return (key, vars) => {
    const template = lookup(messages, key) ?? lookup(fallback, key)
    return template === undefined ? key : formatText(template, vars)
  }
}

const escapeRegExp = (text) => text.replace(/[.*+?^$()|[\]\\]/g, '\\$&')

/**
 * Teks data berbahasa Indonesia (mis. tempat membeli bahan: "Toko Massimo", "selama event X") → bahasa lain lewat tabel
 * `dataText` di messages. Kunci tabel boleh memuat {nama} sebagai bagian yang dibiarkan apa adanya. Tanpa tabel (bahasa
 * Indonesia) atau tanpa padanan, teksnya dikembalikan apa adanya; `onMissing(text)` dipanggil kalau padanannya tidak ada.
 */
export function translateDataText(text, table, onMissing) {
  if (text == null || !table) return text
  if (table[text]) return table[text]
  for (const [pattern, translation] of Object.entries(table)) {
    if (!pattern.includes('{')) continue
    const names = []
    const source = escapeRegExp(pattern).replace(/\{(\w+)\}/g, (_, name) => {
      names.push(name)
      return '(.+)'
    })
    const match = text.match(new RegExp(`^${source}$`))
    if (match) return formatText(translation, Object.fromEntries(names.map((name, i) => [name, match[i + 1]])))
  }
  onMissing?.(text)
  return text
}
