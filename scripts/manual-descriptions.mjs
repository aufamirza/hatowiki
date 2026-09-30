#!/usr/bin/env node
/**
 * Berkas isian manual deskripsi: data/manual/descriptions.json.
 *
 * Berisi semua entri (semua kategori) yang tidak punya deskripsi di situs, masing-masing dengan kolom kosong `en` untuk
 * teks bahasa Inggris yang dilihat langsung di game, plus `id` dan `th` untuk terjemahannya. Entri tanpa deskripsi =
 * `description` kosong di file data, karena teksnya tidak ada di heartodex atau disembunyikan (salah salin di sumber);
 * alasannya disalin dari komentar TODO di file data ke kolom `reason`.
 *
 * Kolom `en` yang terisi dipakai situs sebagai deskripsi asli dengan sumber "in-game" (src/data/manualDescriptions.js).
 * Skrip sinkronisasi (heartodex-sync.mjs) tidak pernah menulis ke berkas ini, dan skrip ini tidak pernah menghapus atau
 * mengubah kolom yang sudah terisi.
 *
 * Yang dilakukan skrip ini:
 * - Menambahkan entri baru yang tidak punya deskripsi (mis. setelah sinkronisasi) dengan kolom kosong.
 * - Membuang baris yang masih kosong kalau entrinya sekarang sudah punya deskripsi dari sumber atau sudah tidak ada.
 * - Melaporkan entri yang `en`-nya sudah diisi tapi terjemahan `id` / `th`-nya belum ada. Terjemahannya tidak dibuat
 *   skrip ini: minta agent menerjemahkannya dari teks `en` (lihat README), lalu jalankan lagi untuk memeriksa.
 *
 * Pemakaian:
 *   node scripts/manual-descriptions.mjs          perbarui daftar & laporkan
 *   node scripts/manual-descriptions.mjs --check  laporkan saja (kode keluar 1 kalau ada terjemahan yang belum dibuat
 *                                                 atau daftar perlu diperbarui)
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { DATA_FILES, ROOT, loadCatalogs, withAppModules } from './lib/app-modules.mjs'

const MANUAL_FILE = path.join(ROOT, 'data/manual/descriptions.json')
const CHECK_ONLY = process.argv.includes('--check')
const TRANSLATED_LANGUAGES = ['id', 'th']
const META = {
  petunjuk:
    'Isi kolom "en" dengan teks deskripsi bahasa Inggris yang terlihat langsung di game (apa adanya, tanpa tanda kutip pembuka/penutup). Setelah itu jalankan "node scripts/manual-descriptions.mjs" dan minta agent mengisi "id" dan "th". Cara lengkapnya ada di README, bagian "Deskripsi isian manual".',
  source: 'in-game',
  columns: {
    name: 'Nama entri (hanya untuk memudahkan mencari; diisi skrip).',
    reason: 'Kenapa entri ini tidak punya deskripsi (dari komentar TODO di file data; diisi skrip).',
    en: 'Teks bahasa Inggris dari game. Kosong = belum diisi. Kalau diisi, situs memakainya sebagai deskripsi asli (sumber "in-game").',
    id: 'Terjemahan Indonesia dari teks "en". Kosong = versi Indonesia masih menampilkan "Deskripsi belum tersedia.".',
    th: 'Terjemahan Thai dari teks "en". Kosong = versi Thai masih menampilkan "ยังไม่มีคำอธิบาย".',
  },
}

const filled = (text) => typeof text === 'string' && text.trim() !== ''

// Komentar TODO di baris `description: null` / `descriptionOriginal: null` entri `slug` di file data.
function reasonOf(source, slug, hasOriginal) {
  const start = source.indexOf(`slug: '${slug}',`)
  const block = start < 0 ? '' : source.slice(start, source.indexOf('\n  },', start))
  const field = hasOriginal ? 'description' : 'descriptionOriginal'
  const comment = new RegExp(`\\b${field}: null, // TODO: (.*)`).exec(block)?.[1]?.trim()
  return comment ?? (hasOriginal ? 'deskripsi disembunyikan di situs' : 'deskripsi tidak ada di sumber')
}

async function main() {
  const catalogs = await withAppModules(loadCatalogs)
  const current = existsSync(MANUAL_FILE) ? JSON.parse(await readFile(MANUAL_FILE, 'utf8')) : {}
  const next = { _meta: META }
  const report = []

  for (const catalog of catalogs) {
    const source = await readFile(path.join(ROOT, DATA_FILES[catalog.slug]), 'utf8')
    const rows = {}
    const old = current[catalog.slug] ?? {}
    for (const entry of catalog.entries) {
      const previous = old[entry.slug]
      if (entry.description && !filled(previous?.en)) continue
      rows[entry.slug] = {
        name: entry.name,
        reason: entry.description ? previous.reason : reasonOf(source, entry.slug, Boolean(entry.descriptionOriginal)),
        en: previous?.en ?? '',
        id: previous?.id ?? '',
        th: previous?.th ?? '',
      }
    }
    // Isian untuk entri yang sudah tidak ada di data tidak dibuang diam-diam.
    for (const [slug, row] of Object.entries(old)) {
      if (!rows[slug] && filled(row.en)) rows[slug] = { ...row, reason: `${row.reason} (entri sudah tidak ada di data)` }
    }
    next[catalog.slug] = rows

    const list = Object.entries(rows)
    const done = list.filter(([, row]) => filled(row.en))
    const untranslated = done.filter(([, row]) => TRANSLATED_LANGUAGES.some((language) => !filled(row[language])))
    report.push({ catalog, total: list.length, done: done.length, untranslated })
  }

  const content = `${JSON.stringify(next, null, 2)}\n`
  const changed = !existsSync(MANUAL_FILE) || (await readFile(MANUAL_FILE, 'utf8')).replace(/\r\n/g, '\n') !== content
  if (changed && !CHECK_ONLY) {
    await mkdir(path.dirname(MANUAL_FILE), { recursive: true })
    await writeFile(MANUAL_FILE, content)
  }

  console.log('Entri tanpa deskripsi (data/manual/descriptions.json):')
  for (const { catalog, total, done } of report) {
    console.log(`  ${catalog.name.padEnd(13)} ${String(total).padStart(3)} entri${done ? ` · ${done} sudah diisi dari game` : ''}`)
  }
  console.log(`  Total         ${String(report.reduce((sum, row) => sum + row.total, 0)).padStart(3)} entri`)
  const pending = report.flatMap(({ catalog, untranslated }) => untranslated.map(([slug, row]) => ({ catalog, slug, row })))
  if (pending.length) {
    console.log('\nSudah diisi dari game tapi terjemahannya belum lengkap:')
    for (const { catalog, slug, row } of pending) {
      const missing = TRANSLATED_LANGUAGES.filter((language) => !filled(row[language]))
      console.log(`  ${catalog.slug}/${slug} (${row.name}): belum ada ${missing.join(' & ')}`)
    }
    console.log('Minta agent menerjemahkan kolom "en" entri di atas ke kolom "id" dan "th" di data/manual/descriptions.json.')
  }
  if (CHECK_ONLY) {
    if (changed) console.log('\nDaftar perlu diperbarui: jalankan "node scripts/manual-descriptions.mjs".')
    if (changed || pending.length) process.exitCode = 1
  } else console.log(changed ? '\nBerkas diperbarui.' : '\nBerkas sudah sesuai.')
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
