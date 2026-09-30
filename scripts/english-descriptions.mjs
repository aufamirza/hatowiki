#!/usr/bin/env node
/**
 * Teks tampilan bahasa Inggris (halaman /en) untuk deskripsi entri.
 *
 * Versi Inggris memakai teks asli heartodex (`descriptionOriginal` di file data), tapi salah ketik yang jelas berasal
 * dari sumber dibetulkan dulu: pola y→g ("easilg", "Widelg"), salah baca huruf/angka ("Mid-AIJtumn", "tupe"), huruf
 * besar di tengah kalimat, apostrof, dan tanda hubung yang seharusnya tanda pisah. Daftar pembetulannya ditulis tangan di
 * scripts/translations/english-corrections.json; skrip ini hanya menerapkannya, jadi tidak ada teks yang berubah tanpa
 * tercatat. `descriptionOriginal` sendiri tidak pernah diubah.
 *
 * Hasil (ditulis ulang seluruhnya setiap kali dijalankan):
 *   scripts/translations/<kind>.en.json        { "_meta": …, "<slug>": "teks tampilan" }, dimuat situs hanya di /en
 *   scripts/translations/review-<kind>.en.md   semua pembetulan, berdampingan dengan teks sumbernya
 *
 * Aturan:
 * - Entri yang deskripsinya disembunyikan di versi Indonesia (`description: null`, salah salin di sumber) atau yang tidak
 *   punya teks di sumber tidak ditulis, jadi di versi Inggris juga tampil "No description available yet.".
 * - Deskripsi yang di sumber bukan bahasa Inggris (`descriptionSourceLang`, mis. Violet Roll Cake berbahasa Spanyol)
 *   memakai terjemahan Inggris dari `translations` di english-corrections.json dan ditandai di `_meta.translated`.
 * - Tiap pembetulan harus cocok tepat satu kali; pembetulan untuk slug yang tidak ada, atau yang teksnya sudah berubah
 *   di sumber, menghentikan skrip supaya daftar pembetulan tidak diam-diam kedaluwarsa.
 *
 * Pemakaian:
 *   node scripts/english-descriptions.mjs          tulis ulang semua berkas
 *   node scripts/english-descriptions.mjs --check  hanya periksa (keluar dengan kode 1 kalau berkas perlu ditulis ulang)
 */
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { ROOT, loadCatalogs, withAppModules } from './lib/app-modules.mjs'

const TRANSLATIONS_DIR = path.join(ROOT, 'scripts/translations')
const CORRECTIONS_FILE = path.join(TRANSLATIONS_DIR, 'english-corrections.json')
const CHECK_ONLY = process.argv.includes('--check')
const LABELS = {
  fish: 'ikan',
  bugs: 'serangga',
  birds: 'burung',
  animals: 'hewan',
  recipes: 'resep',
  crops: 'tanaman',
  collectibles: 'bahan alam (collectibles)',
  ingredients: 'bahan masak (ingredients)',
}
const LANGUAGE_NAMES = { es: 'Spanyol' }

const cell = (text) => String(text).replace(/\|/g, '\\|').replace(/\n/g, ' ')
const countOf = (text, part) => text.split(part).length - 1

function applyFixes(kind, entry, fixes) {
  let text = entry.descriptionOriginal
  for (const [from, to, type] of fixes) {
    const count = countOf(text, from)
    if (count !== 1) throw new Error(`${kind}/${entry.slug}: "${from}" muncul ${count} kali di teks sumber (harus tepat 1). Periksa english-corrections.json.`)
    if (!type) throw new Error(`${kind}/${entry.slug}: pembetulan "${from}" belum diberi jenis.`)
    text = text.replace(from, to)
  }
  return text
}

function buildKind(catalog, corrections) {
  const fixes = corrections.fixes[catalog.slug] ?? {}
  const translations = corrections.translations[catalog.slug] ?? {}
  const known = new Set(catalog.entries.map((entry) => entry.slug))
  for (const slug of [...Object.keys(fixes), ...Object.keys(translations)]) {
    if (!known.has(slug)) throw new Error(`${catalog.slug}/${slug}: ada di english-corrections.json tapi tidak ada di data.`)
  }

  const texts = {}
  const corrected = []
  const translated = []
  const hidden = []
  const missing = []
  for (const entry of catalog.entries) {
    if (!entry.descriptionOriginal) {
      missing.push(entry)
      continue
    }
    if (!entry.description) {
      hidden.push(entry)
      if (fixes[entry.slug] || translations[entry.slug]) throw new Error(`${catalog.slug}/${entry.slug}: deskripsinya disembunyikan, pembetulannya tidak dipakai.`)
      continue
    }
    if (entry.descriptionSourceLang) {
      const text = translations[entry.slug]
      if (!text) throw new Error(`${catalog.slug}/${entry.slug}: teks sumber berbahasa "${entry.descriptionSourceLang}", terjemahan Inggrisnya belum ada di english-corrections.json.`)
      texts[entry.slug] = text
      translated.push({ entry, text })
      continue
    }
    const entryFixes = fixes[entry.slug] ?? []
    texts[entry.slug] = applyFixes(catalog.slug, entry, entryFixes)
    if (entryFixes.length) corrected.push({ entry, text: texts[entry.slug], fixes: entryFixes })
  }
  return { texts, corrected, translated, hidden, missing }
}

function metaOf(catalog, result) {
  const fixCount = result.corrected.reduce((sum, row) => sum + row.fixes.length, 0)
  return {
    language: 'en',
    source: 'Teks asli heartodex (descriptionOriginal di file data) dengan salah ketik yang jelas dibetulkan. descriptionOriginal tetap apa adanya.',
    generatedBy: 'scripts/english-descriptions.mjs (dari scripts/translations/english-corrections.json); jangan diedit langsung',
    corrections: fixCount,
    correctedEntries: result.corrected.length,
    ...(result.translated.length
      ? {
          translated: Object.fromEntries(result.translated.map(({ entry }) => [entry.slug, entry.descriptionSourceLang])),
          translatedNote: 'Teks sumber entri ini bukan bahasa Inggris; yang ditampilkan adalah terjemahan Inggris buatan AI yang belum ditinjau.',
        }
      : {}),
    review: `scripts/translations/review-${catalog.slug}.en.md`,
  }
}

function reviewOf(catalog, result, types) {
  const label = LABELS[catalog.slug] ?? catalog.slug
  const fixCount = result.corrected.reduce((sum, row) => sum + row.fixes.length, 0)
  const byType = {}
  for (const row of result.corrected) for (const [, , type] of row.fixes) byType[type] = (byType[type] ?? 0) + 1
  const names = (rows) => rows.map((entry) => `${entry.name} (\`${entry.slug}\`)`).join(', ')
  const lines = [
    `# Review teks Inggris: ${label}`,
    '',
    `Teks tampilan versi Inggris (/en) untuk ${Object.keys(result.texts).length} ${label}, dibuat \`scripts/english-descriptions.mjs\` dari teks asli`,
    'heartodex (`descriptionOriginal`). Yang diubah hanya salah ketik yang jelas berasal dari sumber; `descriptionOriginal` di',
    'file data tetap apa adanya. Daftar pembetulannya ada di `scripts/translations/english-corrections.json`.',
    '',
    `- Pembetulan: ${fixCount} di ${result.corrected.length} entri${fixCount ? ` (${Object.entries(byType).map(([type, count]) => `${type}: ${count}`).join(', ')})` : ''}.`,
  ]
  if (result.translated.length) {
    lines.push(`- Diterjemahkan ke bahasa Inggris karena teks sumbernya berbahasa lain (terjemahan AI, belum ditinjau): ${names(result.translated.map((row) => row.entry))}.`)
  }
  if (result.hidden.length) {
    lines.push(`- Tidak ditampilkan karena disembunyikan di versi Indonesia (salah salin di sumber): ${names(result.hidden)}. Di versi Inggris juga tampil "No description available yet.".`)
  }
  if (result.missing.length) lines.push(`- Tidak ada teks di sumber (${result.missing.length} entri): ${result.missing.map((entry) => entry.name).join(', ')}.`)
  lines.push('- Entri lain memakai teks sumber tanpa perubahan, jadi tidak dicantumkan di tabel.')

  if (result.corrected.length) {
    lines.push('', '## Pembetulan salah ketik', '', '| Entri | Teks di sumber | Teks tampilan (EN) | Pembetulan |', '| --- | --- | --- | --- |')
    for (const { entry, text, fixes } of result.corrected) {
      const notes = fixes.map(([from, to, type]) => `"${from}" → "${to}" (${type})`).join('; ')
      lines.push(`| ${entry.name} (\`${entry.slug}\`) | ${cell(entry.descriptionOriginal)} | ${cell(text)} | ${cell(notes)} |`)
    }
    lines.push('', 'Jenis pembetulan:', '', ...Object.keys(byType).map((type) => `- **${type}**: ${types[type] ?? ''}`))
  }
  if (result.translated.length) {
    lines.push('', '## Terjemahan dari bahasa lain', '', '| Entri | Teks di sumber | Teks tampilan (EN) | Catatan |', '| --- | --- | --- | --- |')
    for (const { entry, text } of result.translated) {
      const language = LANGUAGE_NAMES[entry.descriptionSourceLang] ?? entry.descriptionSourceLang
      lines.push(`| ${entry.name} (\`${entry.slug}\`) | ${cell(entry.descriptionOriginal)} | ${cell(text)} | teks sumber berbahasa ${language}; diterjemahkan langsung ke bahasa Inggris |`)
    }
  }
  return `${lines.join('\n')}\n`
}

async function main() {
  const corrections = JSON.parse(await readFile(CORRECTIONS_FILE, 'utf8'))
  const catalogs = await withAppModules(loadCatalogs)
  const unknownKinds = [...Object.keys(corrections.fixes), ...Object.keys(corrections.translations)].filter((slug) => !catalogs.some((catalog) => catalog.slug === slug))
  if (unknownKinds.length) throw new Error(`Jenis tidak dikenal di english-corrections.json: ${unknownKinds.join(', ')}`)

  let stale = 0
  const totals = { texts: 0, fixes: 0, entries: 0, translated: 0 }
  for (const catalog of catalogs) {
    const result = buildKind(catalog, corrections)
    const meta = metaOf(catalog, result)
    const files = {
      [`${catalog.slug}.en.json`]: `${JSON.stringify({ _meta: meta, ...result.texts }, null, 2)}\n`,
      [`review-${catalog.slug}.en.md`]: reviewOf(catalog, result, corrections._meta.types),
    }
    for (const [name, content] of Object.entries(files)) {
      const file = path.join(TRANSLATIONS_DIR, name)
      const current = existsSync(file) ? (await readFile(file, 'utf8')).replace(/\r\n/g, '\n') : null
      if (current === content) continue
      stale++
      if (!CHECK_ONLY) await writeFile(file, content)
    }
    totals.texts += Object.keys(result.texts).length
    totals.fixes += meta.corrections
    totals.entries += meta.correctedEntries
    totals.translated += result.translated.length
    console.log(
      `${catalog.slug.padEnd(13)} ${String(Object.keys(result.texts).length).padStart(3)} teks · ${String(meta.corrections).padStart(2)} pembetulan di ${String(meta.correctedEntries).padStart(2)} entri` +
        `${result.translated.length ? ` · ${result.translated.length} diterjemahkan` : ''}${result.hidden.length ? ` · ${result.hidden.length} disembunyikan` : ''}${result.missing.length ? ` · ${result.missing.length} tanpa teks sumber` : ''}`,
    )
  }
  console.log(`Total: ${totals.texts} teks, ${totals.fixes} pembetulan di ${totals.entries} entri, ${totals.translated} terjemahan dari bahasa lain.`)
  if (CHECK_ONLY && stale) {
    console.error(`${stale} berkas perlu ditulis ulang: jalankan "node scripts/english-descriptions.mjs".`)
    process.exitCode = 1
  } else if (!CHECK_ONLY) console.log(stale ? `${stale} berkas ditulis.` : 'Semua berkas sudah sesuai.')
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
