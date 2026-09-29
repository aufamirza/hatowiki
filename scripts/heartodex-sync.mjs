#!/usr/bin/env node
/**
 * Sinkronisasi data dari Heartodex: wildlife ke src/data/wildlife/<kind>.js (Fish, Bugs, Birds, Animals), resep ke
 * src/data/recipes/recipes.js, tanaman ke src/data/crops/crops.js, collectible ke src/data/collectibles/collectibles.js,
 * dan bahan masak ke src/data/ingredients/ingredients.js. Bahan resep dan makanan favorit hewan yang bukan
 * Crop/Collectible/Ingredient disimpan sebagai data bersama di src/data/items.js (gambarnya di public/images/items/);
 * Crop, Collectible, dan Ingredient hanya punya satu sumber data, yaitu file datanya sendiri.
 *
 * Pemakaian:
 *   node scripts/heartodex-sync.mjs --kind bugs --section "Base Game" --level 1           dry run: ambil, validasi, laporkan
 *   node scripts/heartodex-sync.mjs --kind bugs --section "Base Game" --level 1 --write   tulis data, zona, dan gambar
 *   node scripts/heartodex-sync.mjs --kind fish --slug barbel --slug tench [--write]      pilih entri tertentu
 *   node scripts/heartodex-sync.mjs --kind animals --section "Base Game" [--write]        hewan (tanpa level)
 *   node scripts/heartodex-sync.mjs --kind recipes --section "Base Game" --level 7 [--write]
 *   node scripts/heartodex-sync.mjs --kind crops --section "Echo of Ancients" [--write]
 *   node scripts/heartodex-sync.mjs --kind collectibles --section "Base Game" [--write]  (tanpa level)
 *   node scripts/heartodex-sync.mjs --kind ingredients --section "Base Game" [--write]   (tanpa level & lokasi)
 *
 * Setiap entri menyimpan `section`: nama section tempat entri itu berada di halaman daftar Heartodex ('Base Game' atau
 * nama event), bukan kategorinya. --section memakai nama yang sama.
 *
 * Aturan yang dijaga skrip ini:
 * - Jeda minimal REQUEST_GAP_MS antar request ke heartodex. Setiap halaman/gambar disimpan di
 *   scripts/.cache/heartodex dan tidak pernah diambil ulang (hapus file cache-nya untuk memaksa ambil ulang).
 * - Entri yang slug-nya sudah ada di file data dilewati dan teksnya tidak disentuh. Gambar yang sudah ada
 *   tidak ditimpa. Setelah menulis, data & zona lama dicek ulang dan file dikembalikan kalau ada yang berubah.
 * - Hasil divalidasi dengan validator yang sama dengan aplikasi (src/data/wildlife/validateWildlife.js).
 * - Deskripsi Indonesia diambil dari scripts/translations/<kind>.id.json. Yang belum diterjemahkan diisi null
 *   dengan komentar TODO. Data yang tidak ketemu di sumber juga null + TODO, tidak pernah ditebak.
 * - Bugs & Birds: harga jual harus bilangan bulat. Harga desimal di sumber diisi null + TODO berisi nilai
 *   aslinya (tampil "Belum pasti"), tidak dibulatkan.
 * - Resep: energi dan harga jual harus bilangan bulat. Nilai "---" atau bintang yang tidak ada di sumber diisi
 *   null + TODO (tampil "—"); nilai desimal diisi null + TODO berisi nilai aslinya dan dicatat di `uncertain`
 *   (tampil "Belum pasti"), tidak dibulatkan.
 * - Animals: lokasi dari daftar "Location", titik tempat makan dari pin di peta halaman detail (dicek silang
 *   dengan marker `flymark` di skrip peta), makanan favorit dari bagian "Favorite Food".
 * - Benda (bahan & makanan) yang belum ada di items.js diambil dari halaman benda itu sendiri (nama + gambar
 *   utama). Jenisnya diambil dari bagian URL (crops → Crop, …), bukan dari label Spanyol di halaman hewan.
 * - Crops: level dari halaman daftar; harga benih (Buy Price), waktu tumbuh (Growth Time), dan semua deret angka per
 *   bintang (Market Value, Event Tokens, …) beserta label aslinya. Farming Mastery tidak diambil.
 * - Collectibles: nilai jual (Sell Value), energi (Energy Boost, kalau ada), dan lokasi dengan zona peta seperti serangga.
 * - Ingredients: harga beli (Buy Price) dan harga jual (Sell Price) dari kotak Market Value, dan info asal ("Origin: …")
 *   kalau ada. Yang tidak dicantumkan sumber diisi null + TODO. Tanda "Work in Progress" di halaman dilaporkan.
 * - Urutan array mengikuti heartodex: section (Base Game, lalu event terbaru → terlama, lihat src/data/events.js),
 *   level, lalu urutan di halaman daftar (benda: urut id).
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE_URL = 'https://www.heartodex.com'
const CACHE_DIR = path.join(ROOT, 'scripts/.cache/heartodex')
const ZONES_FILE = path.join(ROOT, 'src/data/wildlife/locationZones.js')
const MAP_IMAGE_PATH = '/images/maps/heartopia-map.webp'
// Peta dasar di heartodex (nama file di /_astro/) → gambar peta lokal di public/. Peta utama pulau, dan peta bawah laut
// Whalefall Canyon (flymap=2, dipakai konten Call of Whales). Poligon zona & pin memakai koordinat 1000×1000 petanya
// sendiri. Kalau heartodex mengganti petanya (nama file berubah), poligon tidak dipakai sampai peta lokal diperbarui.
// Peta lokal yang belum ada diunduh sekali saat --write.
const BASE_MAPS = {
  'map_eA0M2.webp': MAP_IMAGE_PATH,
  '1783816791663-whalecanyon_2gPWn0.webp': '/images/maps/whalefall-canyon.webp',
}
const REQUEST_GAP_MS = 2000
const USER_AGENT = 'Mozilla/5.0 (compatible; hatowiki-sync/1.0; +fan-wiki)'
// Tanggal lokal (YYYY-MM-DD) untuk komentar "diperiksa …".
const TODAY = new Date().toLocaleDateString('sv')

/**
 * Konfigurasi per kategori wildlife. `segment` = bagian URL di heartodex, `slug` = kunci di
 * WILDLIFE_CATEGORIES (src/data/wildlife/categories.js) yang memuat skema (shadow, lokasi jamak, harga bulat).
 */
const KINDS = {
  fish: {
    slug: 'fish',
    segment: 'fish',
    dataFile: 'src/data/wildlife/fish.js',
    exportName: 'fish',
    translationsFile: 'scripts/translations/fish.id.json',
    imageDir: 'public/images/fish',
    imageUrl: '/images/fish',
    fieldOrder: [
      'slug', 'name', 'category', 'section', 'description', 'descriptionOriginal', 'level', 'shadow', 'marketValue', 'marketValueMissing',
      'schedule', 'weather', 'location', 'locationZone', 'locations', 'image', 'locationImage', 'source',
    ],
  },
  bugs: {
    slug: 'bugs',
    segment: 'insects',
    dataFile: 'src/data/wildlife/bugs.js',
    exportName: 'bugs',
    translationsFile: 'scripts/translations/bugs.id.json',
    imageDir: 'public/images/bugs',
    imageUrl: '/images/bugs',
    // Gambar serangga tidak persegi (mis. 400×286), jadi ukuran aslinya disimpan untuk width/height <img>.
    storeImageSize: true,
    fieldOrder: [
      'slug', 'name', 'category', 'section', 'description', 'descriptionOriginal', 'level', 'marketValue', 'marketValueMissing',
      'schedule', 'weather', 'locations', 'image', 'imageSize', 'locationImage', 'source',
    ],
  },
  birds: {
    slug: 'birds',
    segment: 'birds',
    dataFile: 'src/data/wildlife/birds.js',
    exportName: 'birds',
    translationsFile: 'scripts/translations/birds.id.json',
    imageDir: 'public/images/birds',
    imageUrl: '/images/birds',
    storeImageSize: true,
    fieldOrder: [
      'slug', 'name', 'category', 'section', 'description', 'descriptionOriginal', 'level', 'marketValue', 'marketValueMissing',
      'schedule', 'weather', 'locations', 'image', 'imageSize', 'locationImage', 'source',
    ],
  },
  animals: {
    slug: 'animals',
    segment: 'wild-animals',
    dataFile: 'src/data/wildlife/animals.js',
    exportName: 'animals',
    translationsFile: 'scripts/translations/animals.id.json',
    imageDir: 'public/images/animals',
    imageUrl: '/images/animals',
    storeImageSize: true,
    // Halaman daftar hewan tidak punya judul "Base Game": hewan Common tampil paling atas sebelum bagian event.
    untitledSection: 'Base Game',
    fieldOrder: [
      'slug', 'name', 'category', 'section', 'description', 'descriptionOriginal', 'weather', 'locations', 'feedingSpot',
      'favoriteFood', 'image', 'imageSize', 'locationImage', 'source',
    ],
  },
  // Resep bukan wildlife: skema, file data, dan alur sinkronisasinya sendiri (lihat syncRecipes).
  recipes: {
    slug: 'recipes',
    family: 'recipes',
    segment: 'recipes',
    dataFile: 'src/data/recipes/recipes.js',
    exportName: 'recipes',
    translationsFile: 'scripts/translations/recipes.id.json',
    imageDir: 'public/images/recipes',
    imageUrl: '/images/recipes',
    storeImageSize: true,
    fieldOrder: [
      'slug', 'name', 'category', 'section', 'family', 'familyBase', 'familyOrder', 'description', 'descriptionOriginal', 'descriptionSourceLang', 'level', 'energy',
      'buffs', 'marketValue', 'uncertain', 'ingredients', 'image', 'imageSize', 'source',
    ],
  },
  // Tanaman & collectible: benda yang juga dipakai resep dan hewan (id benda 'crops/<slug>' / 'collectibles/<slug>').
  // Gambarnya dipakai bersama; gambar lama di public/images/items/ sudah dipindah, jadi tidak diunduh ulang.
  crops: {
    slug: 'crops',
    family: 'goods',
    segment: 'crops',
    dataFile: 'src/data/crops/crops.js',
    exportName: 'crops',
    translationsFile: 'scripts/translations/crops.id.json',
    imageDir: 'public/images/crops',
    imageUrl: '/images/crops',
    storeImageSize: true,
    fieldOrder: [
      'slug', 'name', 'category', 'section', 'description', 'descriptionOriginal', 'descriptionSourceLang', 'level', 'seedPrice',
      'growthTime', 'starValues', 'uncertain', 'image', 'imageSize', 'source',
    ],
  },
  collectibles: {
    slug: 'collectibles',
    family: 'goods',
    segment: 'collectibles',
    dataFile: 'src/data/collectibles/collectibles.js',
    exportName: 'collectibles',
    translationsFile: 'scripts/translations/collectibles.id.json',
    imageDir: 'public/images/collectibles',
    imageUrl: '/images/collectibles',
    storeImageSize: true,
    // Halaman daftar collectible tidak punya judul "Base Game": benda Base Game tampil paling atas sebelum bagian event.
    untitledSection: 'Base Game',
    fieldOrder: [
      'slug', 'name', 'category', 'section', 'description', 'descriptionOriginal', 'descriptionSourceLang', 'sellValue', 'energy',
      'uncertain', 'locations', 'image', 'imageSize', 'locationImage', 'source',
    ],
  },
  // Bahan masak: benda yang dipakai resep dan hewan (id benda 'ingredients/<slug>'). Tanpa level, lokasi, dan peta.
  // Gambar lama di public/images/items/ingredients-<slug>.webp sudah dipindah ke public/images/ingredients/, jadi tidak
  // diunduh ulang.
  ingredients: {
    slug: 'ingredients',
    family: 'goods',
    segment: 'ingredients',
    dataFile: 'src/data/ingredients/ingredients.js',
    exportName: 'ingredients',
    translationsFile: 'scripts/translations/ingredients.id.json',
    imageDir: 'public/images/ingredients',
    imageUrl: '/images/ingredients',
    storeImageSize: true,
    fieldOrder: [
      'slug', 'name', 'category', 'section', 'description', 'descriptionOriginal', 'descriptionSourceLang', 'buyPrice', 'sellPrice',
      'origin', 'uncertain', 'image', 'imageSize', 'source',
    ],
  },
}

// Data bersama benda (bahan resep, makanan hewan).
const ITEMS = {
  dataFile: 'src/data/items.js',
  exportName: 'items',
  imageDir: 'public/images/items',
  imageUrl: '/images/items',
  fieldOrder: ['id', 'name', 'type', 'image', 'imageSize', 'source'],
}
// Label lokasi berbahasa Spanyol di situs EN heartodex yang tidak punya versi Inggris (di halaman daftar, halaman detail,
// maupun tabel lokasi peta): diterjemahkan mengikuti pola nama lokasi sejenis yang sudah berbahasa Inggris, lalu ditandai TODO.
const SPANISH_LOCATION_LABELS = {
  'EVENTO ESPECIAL DE AVES DE BLOQUES': {
    original: 'Evento especial de aves de bloques',
    label: 'Special Brick Bird Event',
    pattern: '"Special Brick Fish Event" (peces) dan "Special Brick Insect Event" (bichos)',
  },
}
// Label jenis makanan di halaman hewan (Heartodex versi Inggris menulisnya dalam bahasa Spanyol) → bagian URL.
const SPANISH_TYPE_SEGMENTS = { cultivo: 'crops', recolectable: 'collectibles', ingrediente: 'ingredients', pez: 'fish', receta: 'recipes' }

// ---------- argumen ----------
function parseArgs(argv) {
  const args = { kind: null, slugs: [], section: null, level: null, write: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--write') args.write = true
    else if (arg === '--kind') args.kind = argv[++i]
    else if (arg === '--slug') args.slugs.push(argv[++i])
    else if (arg === '--section') args.section = argv[++i]
    else if (arg === '--level') args.level = Number(argv[++i])
    else throw new Error(`Argumen tidak dikenal: ${arg}`)
  }
  if (!KINDS[args.kind]) throw new Error(`Tentukan --kind: ${Object.keys(KINDS).join(' | ')}.`)
  if (!args.slugs.length && !args.section && args.level == null) {
    throw new Error('Tentukan --slug, atau --section dan/atau --level.')
  }
  return args
}

// ---------- ambil dengan jeda + cache ----------
const stats = { network: 0, cache: 0 }
let lastRequestAt = 0
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function cacheFile(url) {
  const { pathname } = new URL(url)
  const name = pathname.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9._-]+/g, '__') || 'index'
  return path.join(CACHE_DIR, /\.[a-z0-9]+$/i.test(name) ? name : `${name}.html`)
}

async function politeFetch(url) {
  const wait = lastRequestAt + REQUEST_GAP_MS - Date.now()
  if (wait > 0) await sleep(wait)
  lastRequestAt = Date.now()
  stats.network++
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!response.ok) throw new Error(`HTTP ${response.status} untuk ${url}`)
  return response
}

async function getCached(url, { binary = false } = {}) {
  const file = cacheFile(url)
  if (existsSync(file)) {
    stats.cache++
    return binary ? readFile(file) : readFile(file, 'utf8')
  }
  const response = await politeFetch(url)
  const data = binary ? Buffer.from(await response.arrayBuffer()) : await response.text()
  await mkdir(CACHE_DIR, { recursive: true })
  await writeFile(file, data)
  console.log(`  ambil ${url}`)
  return data
}

// ---------- parser HTML ----------
function decode(text) {
  return text
    .replace(/&(amp|#38);/g, '&')
    .replace(/&(#39|#x27|apos);/g, "'")
    .replace(/&(quot|#34);/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

const stripTags = (html) => decode(html.replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' '))
const attr = (attrs, name) => decode(new RegExp(`${name}="([^"]*)"`).exec(attrs)?.[1] ?? '')
const splitList = (value) => value.split(',').map((item) => item.trim()).filter(Boolean)

// Judul section di pemisah halaman daftar. Base Game: "🎮" + "Base Game"; event: "🦖 Echo of Ancients" + label status
// ("● Active Event" / "○ Finished Event"). Status tidak diambil; emoji di depan nama dibuang.
function parseSectionLabel(separatorHtml) {
  const texts = [...separatorHtml.matchAll(/<span[^>]*>([^<]*)<\/span>/g)]
    .map((match) => decode(match[1].replace(/&#\d+;/g, '')))
    .filter((text) => text && !/\bEvent$/i.test(text))
  return texts.join(' ').replace(/^[\p{Extended_Pictographic}️‍\s]+/u, '').trim() || null
}

// Halaman daftar: urutan entri dan section (Base Game / event) tempat entri itu berada.
// `untitledSection` = nama section untuk entri sebelum judul section pertama (halaman hewan dan collectible tidak punya
// judul "Base Game").
function parseList(html, segment = 'fish', untitledSection = null) {
  const tokens = []
  for (const match of html.matchAll(/<div class="event-separator/g)) {
    const end = html.indexOf('<a href=', match.index)
    tokens.push({ index: match.index, section: parseSectionLabel(html.slice(match.index, end < 0 ? undefined : end)) })
  }
  for (const match of html.matchAll(new RegExp(`<a href="/en/${segment}/([^"/]+)"([^>]*)>`, 'g'))) {
    const attrs = match[2]
    if (!attrs.includes('data-level=')) continue
    tokens.push({
      index: match.index,
      slug: match[1],
      level: Number(attr(attrs, 'data-level')),
      location: attr(attrs, 'data-location'),
      schedule: splitList(attr(attrs, 'data-schedule')),
      weather: splitList(attr(attrs, 'data-weather')),
    })
  }
  tokens.sort((a, b) => a.index - b.index)

  let section = untitledSection
  const entries = []
  for (const token of tokens) {
    if (token.section) section = token.section
    else entries.push({ ...token, section, order: entries.length })
  }
  return entries
}

function between(html, startMarker, endMarker) {
  const start = html.indexOf(startMarker)
  if (start < 0) return null
  const end = html.indexOf(endMarker, start + startMarker.length)
  return html.slice(start + startMarker.length, end < 0 ? undefined : end)
}

const roundPoints = (points) =>
  points
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map((n) => Number(n).toFixed(1)).join(','))
    .join(' ')

function parseDetail(html, { periodIds, weatherIds }) {
  const h1Index = html.indexOf('<h1')
  const name = decode(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1]?.replace(/<[^>]+>/g, '') ?? '')
  const categoryChips = [...html.slice(Math.max(0, h1Index - 3000), h1Index).matchAll(
    /brightness-110">\s*([^<]*?)\s*<\/span>\s*<span>([^<]+)<\/span>/g,
  )].map((match) => ({ emoji: match[1].trim(), label: decode(match[2]) }))

  const main = between(html, '<main', '</main>') ?? html
  const text = stripTags(main)
  // Ikan: "Level 3 Shadow …"; serangga (tanpa shadow): "Level 3 Market Value …".
  const level = /\bLevel (\d+) (?:Shadow|Market Value)\b/.exec(text)?.[1]
  const shadow = /\bShadow (\S+) Market Value\b/.exec(text)?.[1] ?? null
  // Harga jual per kualitas: setiap sel = ikon bintang ×N + angka (format sumber: titik = pemisah ribuan, koma = desimal,
  // mis. "1.240", "232,5"). Sumber kadang hanya mencantumkan sebagian kualitas (mis. burung event: 1★–2★ saja); kualitas
  // yang tidak ada → null. Blok kosong (tanpa angka sama sekali) → marketRaw null.
  const marketHtml = /Market Value\s*<\/h2>([\s\S]*?)Make a suggestion/.exec(main)?.[1] ?? ''
  const marketCells = starCells(marketHtml)
  const marketByStar = new Map(marketCells.map((cell) => [cell.stars, cell.raw]))
  const marketCellsOk = marketByStar.size === marketCells.length && marketCells.every((cell) => cell.stars >= 1 && cell.stars <= 5)
  const marketRaw = marketCells.length && marketCellsOk ? [1, 2, 3, 4, 5].map((star) => marketByStar.get(star) ?? null) : null
  const marketValue = marketRaw ? marketRaw.map((raw) => (raw == null ? null : sourceNumber(raw))) : null
  // Pembanding: teks "Market Value a b c d e Make a suggestion" (5 angka lengkap) harus sama dengan hasil per bintang.
  const marketText = /\bMarket Value ((?:[\d.,]+ ){5})Make a suggestion\b/.exec(text)?.[1]?.trim().split(' ') ?? null

  // Beberapa burung punya kotak "Expert Tip" (petunjuk lokasi dari heartodex) sebelum deskripsi:
  // di JSON-LD berupa <tip>…</tip>, di bagian About berupa div.tip-callout. Tip bukan deskripsi, jadi dipisah.
  let ldDescription = null
  let ldTip = null
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const data = JSON.parse(match[1])
      if (data['@type'] === 'Article' && data.description) {
        ldTip = /<tip>([\s\S]*?)(?:<\/tip>|$)/.exec(data.description)?.[1]?.replace(/\s+/g, ' ').trim() || null
        // Baris baru di tengah kalimat adalah format tampilan (whitespace-pre-line), jadi dinormalisasi jadi spasi.
        // JSON-LD dipotong di 160 karakter, jadi <tip> bisa tanpa penutup: dibuang sampai akhir teks.
        ldDescription = data.description.replace(/<tip>[\s\S]*?(?:<\/tip>|$)/g, ' ').replace(/\s+/g, ' ').trim() || null
      }
    } catch {
      // blok JSON-LD lain yang tidak valid diabaikan
    }
  }
  // Dicari hanya di dalam blok About (sampai Server Time), supaya About yang kosong tidak mengambil teks lain.
  const aboutHtml = between(main, 'About </h2>', 'Server Time') ?? ''
  const tipMatch = /<div class="tip-callout">[\s\S]*?<span class="tip-callout-content">([\s\S]*?)<\/span>\s*<\/div>/.exec(aboutHtml)
  const aboutBlock = tipMatch ? aboutHtml.replace(tipMatch[0], '') : aboutHtml
  const aboutMatch = /whitespace-pre-line[^>]*>([\s\S]*?)<\/div>/.exec(aboutBlock)
  const aboutDescription = aboutMatch ? decode(aboutMatch[1].replace(/<[^>]+>/g, ' ')) || null : null
  const tip = tipMatch ? decode(tipMatch[1].replace(/<[^>]+>/g, ' ')) || null : ldTip

  const scheduleHtml = between(html, '>Schedule</h2>', '>Weather</h2>') ?? ''
  const weatherHtml = between(html, '>Weather</h2>', 'Location on Map') ?? ''
  const pickWords = (fragment, allowed) => stripTags(fragment).split(' ').filter((word) => allowed.includes(word))

  const locationLabel = /Central Label Layer -->\s*<div[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>/.exec(html)?.[1]
  const flyzone = /href="\/en\/map\?[^"]*?flyzone=(\d+)/.exec(html)?.[1] ?? null
  const mapBlock = /<svg[^>]*viewBox="([^"]+)"[^>]*>\s*<image href="\/_astro\/([^"/]+?\.webp)"/.exec(html)
  const maskMatch = /<mask id="(zm-[^"]+)">([\s\S]*?)<\/mask>/.exec(html)
  const polygons = maskMatch ? [...maskMatch[2].matchAll(/points="([^"]+)"/g)].map((match) => roundPoints(match[1])) : []
  const imageSrc = /<img src="(\/_astro\/[^"]+)"[^>]*class="[^"]*detail-image/.exec(html)?.[1] ?? null

  return {
    name,
    categoryChips,
    level: level ? Number(level) : null,
    shadow,
    marketValue,
    marketRaw,
    marketText,
    marketCellsOk: marketCells.length === 0 || marketCellsOk,
    ldDescription,
    aboutDescription,
    tip,
    schedule: pickWords(scheduleHtml, periodIds),
    weather: pickWords(weatherHtml, weatherIds),
    locationLabel: locationLabel ? decode(locationLabel) : null,
    flyzone,
    zone: mapBlock && polygons.length
      ? {
          sourceId: maskMatch[1],
          baseMap: mapBlock[2],
          viewBox: mapBlock[1].split(' ').map((n) => Number(Number(n).toFixed(1))).join(' '),
          polygons,
        }
      : null,
    imageSrc,
  }
}

// Tabel lokasi {id, nombre_en} dari skrip peta heartodex: sumber huruf besar-kecil nama lokasi,
// karena label di halaman detail hanya tersedia dalam huruf kapital.
function parseMapLocations(script) {
  const byId = new Map()
  for (const match of script.matchAll(/\{id:(\d+),nombre:"[^"]*",nombre_en:"([^"]*)",nombre_pt:"[^"]*",emoji:"[^"]*"\}/g)) {
    byId.set(match[1], match[2].trim())
  }
  return byId
}

// Poligon zona per lokasi (ubicacion_id) dari skrip peta yang sama. Dipakai untuk memisahkan poligon
// gabungan di halaman detail (serangga dengan beberapa lokasi) menjadi zona per lokasi.
// Koordinat peta: x = lng, y = 1000 − lat (sama dengan poligon di halaman detail).
function parseMapZones(script) {
  const zones = []
  const pattern = /\{"id":(\d+),"map_id":\d+,"type":"zone"[\s\S]*?"data":"(\{\\\\"type\\\\":\\\\"polygon[\s\S]*?\})","rotacion"/g
  for (const match of script.matchAll(pattern)) {
    let data
    try {
      data = JSON.parse(match[2].replace(/\\\\"/g, '"'))
    } catch {
      continue
    }
    const rings = Array.isArray(data.latlngs?.[0]) ? data.latlngs : [data.latlngs]
    for (const ring of rings) {
      zones.push({
        recordId: match[1],
        locationId: String(data.ubicacion_id),
        points: ring.map(({ lat, lng }) => [lng, 1000 - lat]),
      })
    }
  }
  return zones
}

// Marker titik di skrip peta (mis. tempat makan hewan, type "animal_salvaje"). Koordinat peta: x = x, y = 1000 − y.
function parseMapMarkers(script) {
  const markers = new Map()
  const pattern = /\{"id":(\d+),"map_id":\d+,"type":"([a-z_]+)","subtype":[^,]*,"name":"([^"]*)"[^{}]*?"x":(-?[\d.]+),"y":(-?[\d.]+)/g
  for (const match of script.matchAll(pattern)) {
    markers.set(match[1], { type: match[2], name: match[3], x: Number(match[4]), y: 1000 - Number(match[5]) })
  }
  return markers
}

const round1 = (value) => Math.round(value * 10) / 10

// Deskripsi dari JSON-LD Article (dipotong heartodex di 160 karakter) dan dari blok teks di halaman.
function parseLdDescription(html) {
  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const data = JSON.parse(match[1])
      if (data['@type'] === 'Article' && data.description) return data.description.replace(/\s+/g, ' ').trim() || null
    } catch {
      // blok JSON-LD lain yang tidak valid diabaikan
    }
  }
  return null
}

// Tautan benda (makanan hewan / bahan resep): /en/<bagian>/<slug>, atau "javascript:void(0)" untuk bahan generik
// tanpa halaman (mis. "Any Fish"). `name` dari teks tautan, `thumb` gambar kecilnya.
function parseItemLink(anchorAttrs, inner) {
  const href = attr(anchorAttrs, 'href')
  const pathMatch = /^\/en\/([a-z-]+)\/([^/?#]+)$/.exec(href)
  const texts = [...inner.replace(/<svg[\s\S]*?<\/svg>/g, '').matchAll(/<(h4|span)[^>]*>([^<]*)<\/\1>/g)].map((match) => decode(match[2])).filter(Boolean)
  return {
    segment: pathMatch?.[1] ?? null,
    slug: pathMatch?.[2] ?? null,
    name: texts[0] ?? decode(/alt="([^"]*)"/.exec(inner)?.[1] ?? ''),
    extra: texts.slice(1),
    thumb: /<img src="([^"]+)"/.exec(inner)?.[1] ?? null,
  }
}

// Halaman detail hewan: kategori, nama, deskripsi, lokasi, cuaca favorit, peta (zona + pin), makanan favorit.
function parseAnimalDetail(html, { weatherIds }) {
  const h1Index = html.indexOf('<h1')
  const name = decode(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1]?.replace(/<[^>]+>/g, '') ?? '')
  const categoryChips = [...html.slice(Math.max(0, h1Index - 3000), h1Index).matchAll(
    /brightness-110">\s*([^<]*?)\s*<\/span>\s*<span>([^<]+)<\/span>/g,
  )].map((match) => ({ emoji: match[1].trim(), label: decode(match[2]) }))
  const main = between(html, '<main', '</main>') ?? html
  const afterH1 = main.slice(main.indexOf('</h1>'))
  const textMatch = /whitespace-pre-line[^>]*>([\s\S]*?)<\/div>/.exec(afterH1.slice(0, afterH1.indexOf('Make a suggestion')))
  const pageDescription = textMatch ? decode(textMatch[1].replace(/<[^>]+>/g, ' ')) || null : null

  const locationHtml = between(main, 'Location</h2>', 'Favorite Weather</h2>') ?? ''
  const locations = [...locationHtml.matchAll(/<span[^>]*>([^<]+)<\/span>/g)].map((match) => decode(match[1])).filter(Boolean)
  const weatherHtml = between(main, 'Favorite Weather</h2>', 'Location on Map') ?? ''
  const weatherWords = stripTags(weatherHtml).split(' ')
  const weather = weatherWords.filter((word) => weatherIds.includes(word))

  const mapLink = /href="\/en\/map\?([^"]+)"/.exec(html)?.[1]
  const mapParams = mapLink ? new URLSearchParams(decode(mapLink)) : null
  const locationLabel = /Central Label Layer -->\s*<div[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>/.exec(html)?.[1]
  const mapHtml = between(html, '<!-- Map Background -->', '<!-- Central Label Layer -->') ?? ''
  const mapBlock = /<svg[^>]*viewBox="([^"]+)"[^>]*>\s*<image href="\/_astro\/([^"/]+?\.webp)"/.exec(mapHtml)
  const maskMatch = /<mask id="(zm-[^"]+)">([\s\S]*?)<\/mask>/.exec(mapHtml)
  const polygons = maskMatch ? [...maskMatch[2].matchAll(/points="([^"]+)"/g)].map((match) => roundPoints(match[1])) : []
  const pins = [...mapHtml.matchAll(/<g transform="translate\((-?[\d.]+),\s*(-?[\d.]+)\)">([\s\S]*?)<\/g>/g)].map((match) => ({
    x: Number(match[1]),
    y: Number(match[2]),
    label: decode(/<text[^>]*>([\s\S]*?)<\/text>/.exec(match[3])?.[1] ?? ''),
  }))

  const foodHtml = between(main, 'Favorite Food', '</main>') ?? main.slice(main.indexOf('Favorite Food'))
  const food = [...foodHtml.matchAll(/<a ([^>]*href="[^"]*"[^>]*)>([\s\S]*?)<\/a>/g)]
    .map((match) => parseItemLink(match[1], match[2]))
    .filter((item) => item.thumb)
    .map(({ extra, ...item }) => ({ ...item, sourceType: extra[0] ?? null }))

  return {
    name,
    categoryChips,
    ldDescription: parseLdDescription(html),
    pageDescription,
    locations,
    weather,
    locationLabel: locationLabel ? decode(locationLabel) : null,
    flymark: mapParams?.get('flymark') ?? null,
    zone: mapBlock && polygons.length
      ? {
          sourceId: maskMatch[1],
          baseMap: mapBlock[2],
          viewBox: mapBlock[1].split(' ').map((n) => Number(Number(n).toFixed(1))).join(' '),
          polygons,
        }
      : null,
    baseMap: mapBlock?.[2] ?? null,
    pins,
    food,
    imageSrc: /<img src="(\/_astro\/[^"]+)"[^>]*class="[^"]*detail-image/.exec(html)?.[1] ?? null,
  }
}

// Angka per bintang di blok Energy/Market: "+40", "1.065" (titik = ribuan, koma = desimal), atau "---".
function parseStarValues(fragment) {
  const tokens = stripTags(fragment).split(' ').filter((token) => /^(\+?[\d.,]+|-{3})$/.test(token))
  return tokens.map((raw) => ({ raw, value: /^-+$/.test(raw) ? null : Number(raw.replace(/^\+/, '').replace(/\./g, '').replace(',', '.')) }))
}

// Halaman detail resep: kategori, nama, level, deskripsi (About), energi, harga jual, bahan.
function parseRecipeDetail(html) {
  const h1Index = html.indexOf('<h1')
  const name = decode(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1]?.replace(/<[^>]+>/g, '') ?? '')
  const categoryChips = [...html.slice(Math.max(0, h1Index - 3000), h1Index).matchAll(
    /brightness-110">\s*([^<]*?)\s*<\/span>\s*<span>([^<]+)<\/span>/g,
  )].map((match) => ({ emoji: match[1].trim(), label: decode(match[2]) }))
  const main = between(html, '<main', '</main>') ?? html
  const level = /<span[^>]*>Level<\/span>\s*<span[^>]*>(\d+)<\/span>/.exec(main)?.[1]
  const aboutMatch = /About\s*<\/h2>\s*<div[^>]*>([\s\S]*?)<\/div>/.exec(main)
  const about = aboutMatch ? decode(aboutMatch[1].replace(/<[^>]+>/g, ' ')) || null : null
  // Deskripsi resep ditulis dalam tanda kutip di sumber; disimpan tanpa tanda kutip.
  const quoted = about ? /^["“]([\s\S]*)["”]$/.exec(about) : null

  const energyHtml = between(main, 'Energy &amp; Buffs', '<!-- Module: Market -->') ?? ''
  // Blok Market berakhir sebelum Cooking Mastery (angka "Preparations" di sana bukan harga).
  const marketHtml = between(main, '<!-- Module: Market -->', '<!-- Hover border effect') ?? ''
  // Isi blok energi selain ikon bintang/petir dan angka (kalau ada, kemungkinan info buff yang perlu dicek).
  const energyIcons = [...energyHtml.matchAll(/lucide lucide-([a-z-]+)/g)].map((match) => match[1])
  const energyExtra = stripTags(energyHtml.replace(/<svg[\s\S]*?<\/svg>/g, ' '))
    .replace(/^Energy & Buffs/, '')
    .split(' ')
    .filter((token) => token && !/^(\+?[\d.,]+|-{3})$/.test(token))
  const titles = [...energyHtml.matchAll(/(?:title|data-tooltip|aria-label)="([^"]+)"/g)].map((match) => decode(match[1]))

  const ingredientsHtml = between(main, '<!-- Module: Ingredients -->', '<!-- Hover border effect') ?? ''
  const headings = [...ingredientsHtml.matchAll(/<h4[^>]*>\s*(Fixed Ingredients|Choose (\d+) from the following[^<]*?)\s*<\/h4>/g)]
  const groups = headings.map((heading, i) => {
    const body = ingredientsHtml.slice(heading.index + heading[0].length, headings[i + 1]?.index ?? undefined)
    const links = [...body.matchAll(/<a ([^>]*href="[^"]*"[^>]*)>([\s\S]*?)<\/a>/g)].map((match) => parseItemLink(match[1], match[2]))
    if (heading[1] === 'Fixed Ingredients') {
      return {
        type: 'fixed',
        heading: decode(heading[1]),
        items: links.map(({ extra, ...link }) => ({ ...link, quantityRaw: extra.find((text) => /^x\d+$/i.test(text)) ?? null })),
      }
    }
    return { type: 'choose', heading: decode(heading[1]), count: Number(heading[2]), options: links.map(({ extra, ...link }) => link) }
  })

  return {
    name,
    categoryChips,
    level: level ? Number(level) : null,
    about,
    descriptionOriginal: quoted ? quoted[1].trim() : about,
    quoted: Boolean(quoted),
    ldDescription: parseLdDescription(html),
    energy: parseStarValues(energyHtml),
    energyIcons: [...new Set(energyIcons)],
    energyExtra,
    energyTitles: titles,
    market: parseStarValues(marketHtml.replace(/<h2[\s\S]*?<\/h2>/, '')),
    // Blok Market berisi angka tanpa ikon bintang (mis. hanya "Sell Price 0"): bukan harga per kualitas.
    marketStarless: (() => {
      const body = marketHtml.replace(/<h2[\s\S]*?<\/h2>/, '')
      return /\d/.test(stripTags(body)) && !/lucide-star\b/.test(body) ? stripTags(body) : null
    })(),
    ingredientsModule: /Required Ingredients/.test(ingredientsHtml),
    groups,
    imageSrc: /<img src="(\/_astro\/[^"]+)"[^>]*class="[^"]*detail-image/.exec(html)?.[1] ?? null,
  }
}

// Kotak "LABEL angka" di bawah deskripsi (BUY PRICE, GROWTH TIME, SELL VALUE, ENERGY BOOST): teks mentah angkanya.
function statBox(text, label) {
  return new RegExp(`\\b${label} (\\+?[\\d.,:]+h?)(?= |$)`).exec(text)?.[1] ?? null
}
// Angka sumber: titik = pemisah ribuan, koma = desimal ("1.080" = 1080, "232,5" = 232.5).
const sourceNumber = (raw) => Number(raw.replace(/^\+/, '').replace(/\./g, '').replace(',', '.'))

// Sel "ikon bintang ×N + angka" berurutan: [{ stars, raw }]. Jumlah ikon bintang di depan angka = kualitasnya.
function starCells(fragment) {
  const cells = []
  let stars = 0
  for (const match of fragment.matchAll(/<svg[^>]*lucide-star\b[^>]*>|<span[^>]*>\s*(\+?[\d.,]+)\s*<\/span>/g)) {
    if (match[1] == null) stars++
    else {
      cells.push({ stars, raw: match[1] })
      stars = 0
    }
  }
  return cells
}

// Deret angka per bintang: setiap modul berjudul <h2> (Market Value, Event Tokens, …) yang isinya hanya sel "ikon
// bintang ×N + angka". Jumlah ikon bintang di depan angka = kualitasnya (1★–5★); sumber kadang tidak punya semua
// kualitas (mis. Starfruit: Market Value 1★–4★), dan kualitas yang tidak ada dikembalikan sebagai null.
// Modul lain (Farming Mastery, daftar resep) berisi teks, jadi terlewati. Label tombol trofi ("Achieved!",
// span .trophy-label) bukan isi deret dan dibuang dulu.
function parseStarRows(main) {
  const headings = [...main.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)]
  const rows = []
  for (const [i, heading] of headings.entries()) {
    const label = stripTags(heading[1])
    const body = main
      .slice(heading.index + heading[0].length, headings[i + 1]?.index ?? undefined)
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<span[^>]*trophy-label[^>]*>[\s\S]*?<\/span>/g, ' ')
    const words = stripTags(body).split(' ').filter(Boolean)
    if (!words.length || !words.every((word) => /^\+?[\d.,]+$/.test(word))) continue
    const cells = starCells(body)
    const byStar = new Map(cells.map((cell) => [cell.stars, cell.raw]))
    if (cells.length !== words.length || byStar.size !== cells.length || cells.some((cell) => cell.stars < 1 || cell.stars > 5)) continue
    const raw = [1, 2, 3, 4, 5].map((star) => byStar.get(star) ?? null)
    rows.push({ label, raw, values: raw.map((value) => (value == null ? null : sourceNumber(value))) })
  }
  return rows
}

// Halaman detail tanaman & collectible: kategori, nama, deskripsi (About), kotak angka, deret per bintang, peta.
function parseGoodsDetail(html) {
  const h1Index = html.indexOf('<h1')
  const name = decode(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1]?.replace(/<[^>]+>/g, '') ?? '')
  const categoryChips = [...html.slice(Math.max(0, h1Index - 3000), h1Index).matchAll(
    /brightness-110">\s*([^<]*?)\s*<\/span>\s*<span>([^<]+)<\/span>/g,
  )].map((match) => ({ emoji: match[1].trim(), label: decode(match[2]) }))
  const main = between(html, '<main', '</main>') ?? html
  const text = stripTags(main)
  const aboutHtml = between(main, 'About </h2>', '</h2>') ?? ''
  const aboutMatch = /<div[^>]*>\s*<div[^>]*>[\s\S]*?<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>/.exec(aboutHtml)
  const aboutText = aboutMatch ? decode(aboutMatch[1].replace(/<[^>]+>/g, ' ')) : ''
  // Deskripsi kosong di sumber: blok About langsung berisi kotak angka.
  const pageDescription = aboutText && !/^(BUY PRICE|SELL VALUE)\b/.test(aboutText) ? aboutText : null

  const mapHtml = between(html, '<!-- Map Background -->', '<!-- Central Label Layer -->') ?? ''
  const mapBlock = /<svg[^>]*viewBox="([^"]+)"[^>]*>\s*<image href="\/_astro\/([^"/]+?\.webp)"/.exec(mapHtml)
  const maskMatch = /<mask id="(zm-[^"]+)">([\s\S]*?)<\/mask>/.exec(mapHtml)
  const polygons = maskMatch ? [...maskMatch[2].matchAll(/points="([^"]+)"/g)].map((match) => roundPoints(match[1])) : []
  const pins = [...mapHtml.matchAll(/<g transform="translate\((-?[\d.]+),\s*(-?[\d.]+)\)">([\s\S]*?)<\/g>/g)].map((match) => ({
    x: Number(match[1]),
    y: Number(match[2]),
    label: decode(/<text[^>]*>([\s\S]*?)<\/text>/.exec(match[3])?.[1] ?? ''),
  }))
  const locationLabel = /Central Label Layer -->\s*<div[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>/.exec(html)?.[1]
  const mapLink = /href="\/en\/map\?([^"]+)"/.exec(html)?.[1]
  const mapParams = mapLink ? new URLSearchParams(decode(mapLink)) : null

  return {
    name,
    categoryChips,
    ldDescription: parseLdDescription(html),
    pageDescription,
    buyPrice: statBox(text, 'BUY PRICE'),
    growthTime: statBox(text, 'GROWTH TIME'),
    sellValue: statBox(text, 'SELL VALUE'),
    energyBoost: statBox(text, 'ENERGY BOOST'),
    starRows: parseStarRows(main),
    // Teks lain di kotak identitas selain nama & kategori (mis. status event "Unavailable — Event ended"); tidak disimpan.
    statusText: /Unavailable[^<]*/.exec(main.slice(main.indexOf('</h1>'), main.indexOf('About </h2>')))?.[0]?.trim() ?? null,
    locationLabel: locationLabel ? decode(locationLabel) : null,
    flyzone: mapParams?.get('flyzone') ?? null,
    flymark: mapParams?.get('flymark') ?? null,
    zone: mapBlock && polygons.length
      ? {
          sourceId: maskMatch[1],
          baseMap: mapBlock[2],
          viewBox: mapBlock[1].split(' ').map((n) => Number(Number(n).toFixed(1))).join(' '),
          polygons,
        }
      : null,
    baseMap: mapBlock?.[2] ?? null,
    pins,
    imageSrc: /<img src="(\/_astro\/[^"]+)"[^>]*class="[^"]*detail-image/.exec(html)?.[1] ?? null,
  }
}

// Halaman detail bahan masak: nama, kategori, deskripsi, status, dan gambar sama dengan tanaman/collectible. Kotak
// "Market Value" berisi "Buy Price" dan (kalau ada) "Sell Price"; labelnya huruf biasa (tampil kapital lewat CSS).
// Info asal ("Origin: General") diambil kalau ada, dari teks yang sama atau dari elemen setelah label "Origin".
function parseIngredientDetail(html) {
  const goods = parseGoodsDetail(html)
  const main = between(html, '<main', '</main>') ?? html
  const text = stripTags(main)
  const price = (label) => new RegExp(`\\b${label} (\\+?[\\d.,]+)(?= |$)`, 'i').exec(text)?.[1] ?? null
  const originMatch = />\s*Origin:\s*([^<\s][^<]*?)\s*</.exec(main) ?? />\s*Origin:?\s*<\/[a-z0-9]+>\s*<[a-z0-9]+[^>]*>\s*([^<]+?)\s*</i.exec(main)
  return {
    ...goods,
    buyPrice: price('Buy Price'),
    sellPrice: price('Sell Price'),
    origin: originMatch ? decode(originMatch[1]) : null,
    // "Origin" muncul di halaman tapi nilainya tidak terbaca: dilaporkan, tidak ditebak.
    originUnread: !originMatch && /\bOrigin\b/.test(text),
    workInProgress: /Work in Progress/i.test(text),
  }
}

// Halaman benda (crop, collectible, ingredient, fish, recipe): nama dari judul, gambar utama.
function parseItemPage(html) {
  return {
    name: decode(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1]?.replace(/<[^>]+>/g, '') ?? '') || null,
    imageSrc: /<img src="(\/_astro\/[^"]+)"[^>]*class="[^"]*detail-image/.exec(html)?.[1] ?? null,
  }
}

const parsePoints = (points) => points.split(' ').map((pair) => pair.split(',').map(Number))
// Sama kalau jumlah titik sama dan setiap titik berselisih ≤ 0,11 (selisih pembulatan 1 desimal).
function samePolygon(pointsA, pointsB) {
  return pointsA.length === pointsB.length && pointsA.every(([x, y], i) => Math.abs(x - pointsB[i][0]) <= 0.11 && Math.abs(y - pointsB[i][1]) <= 0.11)
}
const samePolygonSet = (a, b) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|')

// ---------- salah ketik "y" → "g" di teks sumber ----------
// Deskripsi heartodex kadang menulis huruf "y" sebagai "g" (mis. "easilg", "Widelg", "ferocitg", "preg").
// Kata ditandai kalau: berakhir "g" setelah huruf yang tidak lazim mendahului "g" di akhir kata bahasa
// Inggris (easilg → easily), berawalan "g" padahal versi "y"-nya kata umum (gou → you), berawalan konsonan
// + "g" yang tidak ada di bahasa Inggris (mgsterious → mysterious), atau versi "y"-nya dipakai di deskripsi
// mana pun sementara versi "g"-nya tidak dipakai di deskripsi lain (grag → gray, ang → any).
// Ini hanya penanda untuk dicek manusia.
// Kata asli yang lolos aturan akhiran. "get"/"gear" sengaja tidak dimasukkan: bisa jadi "yet"/"year" (mis. "quirky get beautiful").
const G_WORDS_OK = new Set(['leg', 'beg', 'keg', 'peg', 'nutmeg', 'iceberg'])
const Y_START_WORDS = new Set(['you', 'your', 'yours', 'yourself', 'yellow', 'yellowish', 'yes', 'yield', 'young', 'youth', 'yet', 'year', 'years'])
// Kata umum berhuruf "y" yang belum tentu muncul di deskripsi lain (mis. "ang" → "any").
const COMMON_Y_WORDS = new Set([
  'any', 'many', 'very', 'they', 'day', 'days', 'way', 'ways', 'say', 'may', 'stay', 'play', 'gray', 'grey', 'shy', 'sky',
  'fly', 'dry', 'try', 'cry', 'why', 'only', 'easy', 'tiny', 'body', 'lady', 'baby', 'every', 'pretty', 'happy', 'really',
  'family', 'mystery', 'mysterious', 'eye', 'eyes', 'type', 'style', 'anyone', 'anything', 'anyway', 'everyone',
  'everything', 'someone', 'yummy',
])

function descriptionWords(text) {
  return (text ?? '').match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? []
}

// Kosakata: kata (huruf kecil) → jumlah deskripsi yang memakainya.
function buildVocabulary(texts) {
  const vocabulary = new Map()
  for (const text of texts) {
    for (const word of new Set(descriptionWords(text).map((item) => item.toLowerCase()))) {
      vocabulary.set(word, (vocabulary.get(word) ?? 0) + 1)
    }
  }
  return vocabulary
}

// `vocabulary` dari buildVocabulary, termasuk `text` itu sendiri (kemunculan di teks ini tidak dihitung "di tempat lain").
function suspiciousWords(text, vocabulary) {
  const found = new Set()
  const own = new Set(descriptionWords(text).map((item) => item.toLowerCase()))
  const usedElsewhere = (word) => (vocabulary.get(word) ?? 0) - (own.has(word) ? 1 : 0) > 0
  for (const word of descriptionWords(text)) {
    const lower = word.toLowerCase()
    if (!lower.includes('g') || G_WORDS_OK.has(lower)) continue
    const variants = [...lower.matchAll(/g/g)].map(({ index }) => lower.slice(0, index) + 'y' + lower.slice(index + 1))
    const endsOddly = /[ltrekdpscfmbvhzxw]g$/.test(lower)
    const startsOddly = (lower.startsWith('g') && Y_START_WORDS.has(`y${lower.slice(1)}`)) || /^[bcdfhjklmpqrstvwxz]g/.test(lower)
    const knownElsewhere = !usedElsewhere(lower) && variants.some((variant) => vocabulary.has(variant) || COMMON_Y_WORDS.has(variant))
    if (endsOddly || startsOddly || knownElsewhere) found.add(word)
  }
  return [...found]
}

// Ukuran asli WebP (header VP8X/VP8/VP8L), untuk memastikan cocok dengan width/height di EntryImage.
const EXPECTED_IMAGE_SIZE = 400
function webpSize(bytes) {
  const chunk = bytes.toString('ascii', 12, 16)
  if (chunk === 'VP8X') return [1 + bytes.readUIntLE(24, 3), 1 + bytes.readUIntLE(27, 3)]
  if (chunk === 'VP8 ') return [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff]
  if (chunk === 'VP8L') {
    const bits = bytes.readUInt32LE(21)
    return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1]
  }
  return null
}

// ---------- menulis sumber JS ----------
const jsString = (value) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`
function literal(value) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return jsString(value)
  if (Array.isArray(value)) return `[${value.map(literal).join(', ')}]`
  if (typeof value === 'object') return `{ ${Object.entries(value).map(([key, item]) => `${key}: ${literal(item)}`).join(', ')} }`
  throw new Error(`Tipe tidak didukung: ${typeof value}`)
}

// `todos[key]` = komentar TODO di baris field itu. Daftar lokasi (bugs) ditulis satu objek per baris,
// dengan TODO per lokasi di `todos.locationItems[i]`. Kelompok bahan resep juga satu kelompok per baris.
function entrySource(entry, todos, fieldOrder) {
  // Field opsional yang tidak diisi (undefined, mis. `uncertain` resep) tidak ditulis sama sekali.
  const lines = fieldOrder.filter((key) => entry[key] !== undefined).map((key) => {
    const todo = todos[key] ? ` // TODO: ${todos[key]}` : ''
    if (key === 'locations' && entry.locations.length) {
      const items = entry.locations.map((item, i) => {
        const itemTodo = todos.locationItems?.[i] ? ` // TODO: ${todos.locationItems[i]}` : ''
        return `      ${literal(item)},${itemTodo}`
      })
      return [`    locations: [${todo}`, ...items, '    ],'].join('\n')
    }
    // Kelompok bahan resep dan deret angka per bintang tanaman: satu objek per baris.
    if ((key === 'ingredients' || key === 'starValues') && entry[key].length) {
      return [`    ${key}: [${todo}`, ...entry[key].map((group) => `      ${literal(group)},`), '    ],'].join('\n')
    }
    return `    ${key}: ${literal(entry[key])},${todo}`
  })
  return `{\n${lines.join('\n')}\n  }`
}

// Memecah isi array data menjadi blok objek level teratas, apa adanya (sadar string & komentar).
function splitTopLevelObjects(body) {
  const blocks = []
  let depth = 0
  let start = -1
  let outside = ''
  for (let i = 0; i < body.length; i++) {
    const char = body[i]
    if (char === "'" || char === '"' || char === '`') {
      const quote = char
      let j = i + 1
      while (j < body.length && body[j] !== quote) j += body[j] === '\\' ? 2 : 1
      if (depth === 0) outside += body.slice(i, j + 1)
      i = j
      continue
    }
    if (char === '/' && body[i + 1] === '/') {
      const end = body.indexOf('\n', i)
      if (depth === 0) outside += body.slice(i, end < 0 ? undefined : end)
      i = end < 0 ? body.length : end
      continue
    }
    if (char === '/' && body[i + 1] === '*') {
      const end = body.indexOf('*/', i + 2)
      if (depth === 0) outside += body.slice(i, end + 2)
      i = end + 1
      continue
    }
    if (char === '{' || char === '[') {
      if (depth === 0 && char === '{') start = i
      depth++
    } else if (char === '}' || char === ']') {
      depth--
      if (depth === 0 && char === '}') blocks.push(body.slice(start, i + 1))
    } else if (depth === 0) {
      outside += char
    }
  }
  if (outside.replace(/[\s,]/g, '') !== '') {
    throw new Error('Array data berisi teks di luar objek (mis. komentar). Rapikan dulu sebelum menjalankan skrip.')
  }
  return blocks
}

function findClosingBracket(source, openIndex) {
  const blocksStart = openIndex + 1
  let depth = 1
  for (let i = blocksStart; i < source.length; i++) {
    const char = source[i]
    if (char === "'" || char === '"' || char === '`') {
      let j = i + 1
      while (j < source.length && source[j] !== char) j += source[j] === '\\' ? 2 : 1
      i = j
    } else if (char === '/' && source[i + 1] === '/') {
      i = source.indexOf('\n', i)
    } else if (char === '[' || char === '{') depth++
    else if (char === ']' || char === '}') {
      depth--
      if (depth === 0) return i
    }
  }
  throw new Error('Penutup array data tidak ditemukan')
}

// ---------- modul data aplikasi (lewat Vite, supaya validator & konstanta sama persis) ----------
async function loadAppModules(kind) {
  const server = await createServer({
    root: ROOT,
    logLevel: 'error',
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  try {
    const load = (file) => server.ssrLoadModule(file)
    const [
      fishModule, bugsModule, birdsModule, animalsModule, zonesModule, viewBoxModule, validateModule, timeModule,
      attributesModule, categoriesModule, itemsModule, recipesModule, validateRecipesModule, recipeCategoriesModule,
      recipeFamiliesModule, eventsModule, cropsModule, validateCropsModule, cropCategoriesModule, collectiblesModule,
      validateCollectiblesModule, collectibleCategoriesModule, ingredientsModule, validateIngredientsModule, ingredientCategoriesModule,
    ] = await Promise.all([
      load('/src/data/wildlife/fish.js'),
      load('/src/data/wildlife/bugs.js'),
      load('/src/data/wildlife/birds.js'),
      load('/src/data/wildlife/animals.js'),
      load('/src/data/wildlife/locationZones.js'),
      load('/src/data/wildlife/zoneViewBox.js'),
      load('/src/data/wildlife/validateWildlife.js'),
      load('/src/data/gameTime.js'),
      load('/src/data/wildlife/attributes.js'),
      load('/src/data/wildlife/categories.js'),
      load('/src/data/items.js'),
      load('/src/data/recipes/recipes.js'),
      load('/src/data/recipes/validateRecipes.js'),
      load('/src/data/recipes/categories.js'),
      load('/src/data/recipes/families.js'),
      load('/src/data/events.js'),
      load('/src/data/crops/crops.js'),
      load('/src/data/crops/validateCrops.js'),
      load('/src/data/crops/categories.js'),
      load('/src/data/collectibles/collectibles.js'),
      load('/src/data/collectibles/validateCollectibles.js'),
      load('/src/data/collectibles/categories.js'),
      load('/src/data/ingredients/ingredients.js'),
      load('/src/data/ingredients/validateIngredients.js'),
      load('/src/data/ingredients/categories.js'),
    ])
    const all = { fish: fishModule.fish, bugs: bugsModule.bugs, birds: birdsModule.birds, animals: animalsModule.animals }
    // Semua katalog selain wildlife: file data, validator, dan kategori entrinya.
    const others = {
      recipes: { entries: recipesModule.recipes, validate: validateRecipesModule.findRecipeProblems, categories: recipeCategoriesModule.RECIPE_CATEGORIES },
      crops: { entries: cropsModule.crops, validate: validateCropsModule.findCropProblems, categories: cropCategoriesModule.CROP_CATEGORIES },
      collectibles: {
        entries: collectiblesModule.collectibles,
        validate: validateCollectiblesModule.findCollectibleProblems,
        categories: collectibleCategoriesModule.COLLECTIBLE_CATEGORIES,
      },
      ingredients: {
        entries: ingredientsModule.ingredients,
        validate: validateIngredientsModule.findIngredientProblems,
        categories: ingredientCategoriesModule.INGREDIENT_CATEGORIES,
      },
    }
    const other = others[kind.slug]
    const schema = other ? null : categoriesModule.getWildlifeCategory(kind.slug)
    return {
      entries: structuredClone(other ? other.entries : all[kind.slug]),
      allEntries: structuredClone(all),
      recipes: structuredClone(recipesModule.recipes),
      crops: structuredClone(cropsModule.crops),
      collectibles: structuredClone(collectiblesModule.collectibles),
      ingredients: structuredClone(ingredientsModule.ingredients),
      // items.js saja (resep, ikan, bahan generik); Crop, Collectible & Ingredient ada di file datanya sendiri.
      items: structuredClone(itemsModule.items),
      itemTypes: structuredClone(itemsModule.ITEM_TYPES),
      zones: structuredClone(zonesModule.LOCATION_ZONES),
      zoneViewBox: viewBoxModule.zoneViewBox,
      findProblems: (list) => (other ? other.validate(list) : validateModule.findWildlifeProblems(list, kind.slug)),
      findItemProblems: (list) => itemsModule.findItemProblems(list),
      periodIds: timeModule.PERIODS.map((period) => period.id),
      weatherIds: attributesModule.WEATHERS.map((weather) => weather.id),
      categories: other ? other.categories : schema.entryCategories,
      // Usulan kelompok jenis masakan untuk resep baru (tampilan; bisa diubah manual di recipes.js).
      suggestRecipeFamily: recipeFamiliesModule.suggestRecipeFamily,
      // Urutan section (Base Game, lalu event terbaru → terlama) untuk urutan array data.
      compareSections: eventsModule.compareSections,
      schema,
    }
  } finally {
    await server.close()
  }
}

const titleCase = (label) =>
  label
    .split(' ')
    .map((word) => (/^\[.*\]$|^&$/.test(word) ? word : word.charAt(0) + word.slice(1).toLowerCase()))
    .join(' ')
const slugify = (label) => label.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const sameSet = (a, b) => a.length === b.length && a.every((value) => b.includes(value))
const sameViewBox = (a, b) => {
  const [x, y] = [a.split(' ').map(Number), b.split(' ').map(Number)]
  return x.every((value, i) => Math.abs(value - y[i]) <= 0.35)
}
// Urutkan field objek sesuai fieldOrder (sama dengan urutan di file data), tanpa field yang tidak diisi.
const ordered = (entry, fieldOrder) => Object.fromEntries(fieldOrder.filter((key) => entry[key] !== undefined).map((key) => [key, entry[key]]))

// Titik (x, y) di dalam poligon "x,y x,y …" (ray casting).
function pointInPolygon([x, y], points) {
  const ring = parsePoints(points)
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

// Label lokasi yang huruf besar-kecilnya belum pasti (ber-TODO) di semua file data, supaya TODO-nya diwariskan.
async function readUncertainLabels() {
  const labels = new Set()
  for (const kind of Object.values(KINDS)) {
    const file = path.join(ROOT, kind.dataFile)
    if (!existsSync(file)) continue
    const source = await readFile(file, 'utf8')
    for (const match of source.matchAll(/location: '([^']+)', \/\/ TODO: verifikasi huruf besar-kecil/g)) labels.add(match[1])
    for (const match of source.matchAll(/\{ name: '([^']+)', zone: [^}]*\}, \/\/ TODO: verifikasi huruf besar-kecil/g)) labels.add(match[1])
  }
  return labels
}

// Entri yang dipilih lewat --slug, atau --section dan/atau --level; yang sudah ada di file data dilewati.
function selectTargets(list, args, existingSlugs) {
  const listIndex = new Map(list.map((item) => [item.slug, item]))
  const targets = list.filter((item) =>
    args.slugs.length
      ? args.slugs.includes(item.slug)
      : (!args.section || item.section === args.section) && (args.level == null || item.level === args.level),
  )
  const missingSlugs = args.slugs.filter((slug) => !listIndex.has(slug))
  if (missingSlugs.length) console.warn(`Slug tidak ada di halaman daftar: ${missingSlugs.join(', ')}`)
  const skipped = targets.filter((item) => existingSlugs.has(item.slug)).map((item) => item.slug)
  const toAdd = targets.filter((item) => !existingSlugs.has(item.slug))
  console.log(`Target: ${targets.length} entri; sudah ada (dilewati, tidak diubah): ${skipped.join(', ') || '-'}`)
  return { listIndex, toAdd }
}

// Kategori: satu label persis seperti di halaman detail.
function pickCategory(detail, app, todos, notes) {
  if (detail.categoryChips.length === 1) {
    const category = detail.categoryChips[0].label
    const known = app.categories[category]
    if (known && known.emoji !== detail.categoryChips[0].emoji) notes.push(`ikon kategori beda: ${detail.categoryChips[0].emoji}`)
    return category
  }
  todos.category = detail.categoryChips.length
    ? `lebih dari satu kategori di sumber: ${detail.categoryChips.map((chip) => chip.label).join(', ')}`
    : 'kategori tidak ditemukan di sumber'
  return null
}

// Deskripsi asli: JSON-LD, dicek silang dengan teks di halaman. JSON-LD heartodex terpotong di 160 karakter,
// jadi kalau teks halaman lebih panjang dan diawali teks JSON-LD, teks lengkap dari halaman yang dipakai.
function pickDescription(ldDescription, pageDescription, todos, notes) {
  const ldTruncated = Boolean(ldDescription && pageDescription && pageDescription.length > ldDescription.length && pageDescription.startsWith(ldDescription))
  const descriptionOriginal = (ldTruncated ? pageDescription : ldDescription ?? pageDescription) ?? null
  if (!descriptionOriginal) todos.descriptionOriginal = 'deskripsi tidak ditemukan di sumber'
  if (ldTruncated) notes.push('deskripsi JSON-LD terpotong; dipakai teks lengkap dari halaman')
  else if (ldDescription && pageDescription && ldDescription !== pageDescription) notes.push('deskripsi JSON-LD berbeda dari teks di halaman')
  return descriptionOriginal
}

// Gambar utama: diunduh dari <img> di halaman detail; file yang sudah ada tidak ditimpa.
async function prepareImage({ imageSrc, imageDir, fileName, imageUrl, write }) {
  const imageFile = path.join(imageDir, fileName)
  const result = { image: null, imageSize: null, imageBytes: null, imageFile, todo: null, note: null }
  if (existsSync(imageFile)) {
    result.image = `${imageUrl}/${fileName}`
    result.imageSize = webpSize(await readFile(imageFile))
    result.imageStatus = 'sudah ada (tidak ditimpa)'
  } else if (!imageSrc) {
    result.todo = 'gambar tidak ditemukan di sumber'
    result.imageStatus = 'tidak ada'
  } else {
    const bytes = await getCached(`${BASE_URL}${imageSrc}`, { binary: true })
    if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') {
      result.todo = `berkas di sumber bukan WebP (${imageSrc})`
      result.imageStatus = 'bukan WebP'
    } else {
      result.image = `${imageUrl}/${fileName}`
      result.imageStatus = write ? 'diunduh' : 'siap diunduh'
      result.imageBytes = bytes
      result.imageSize = webpSize(bytes)
      if (!result.imageSize) result.note = 'ukuran gambar tidak terbaca dari header WebP'
    }
  }
  return result
}

// ---------- benda bersama (items.js) ----------
// Benda yang belum ada di items.js diambil dari halamannya sendiri: nama dari judul, gambar utama ke
// public/images/items/<bagian>-<slug>.webp. Jenis dari bagian URL (crops → Crop, …).
// Crop, Collectible & Ingredient tidak disimpan di items.js: sumber tunggalnya crops.js / collectibles.js / ingredients.js
// (sinkronkan dulu dengan --kind crops|collectibles|ingredients). Gambarnya juga hanya ada di
// public/images/crops|collectibles|ingredients/.
//
// Benda baru yang juga entri Hatowiki sendiri (resep, ikan, serangga, burung) memakai gambar entri itu, tidak diunduh lagi.
// `batch` = resep yang ditambahkan di run yang sama (slug → true): gambar & namanya diisi dari hasil run itu (finishBatch).
function createItemResolver(app, write, { batch = new Set() } = {}) {
  const ownData = {
    crops: new Map(app.crops.map((entry) => [entry.slug, entry])),
    collectibles: new Map(app.collectibles.map((entry) => [entry.slug, entry])),
    ingredients: new Map(app.ingredients.map((entry) => [entry.slug, entry])),
  }
  const entryData = {
    recipes: new Map(app.recipes.map((entry) => [entry.slug, entry])),
    fish: new Map(app.allEntries.fish.map((entry) => [entry.slug, entry])),
    insects: new Map(app.allEntries.bugs.map((entry) => [entry.slug, entry])),
    birds: new Map(app.allEntries.birds.map((entry) => [entry.slug, entry])),
  }
  const existing = new Map(app.items.map((item) => [item.id, item]))
  const pending = new Map()
  const segmentTypes = new Map(Object.entries(app.itemTypes).map(([type, { segment }]) => [segment, type]))

  async function resolve(ref, usedBy) {
    if (!ref.segment) {
      // Bahan generik tanpa halaman (mis. "Any Fish"): id any/<jenis>, tanpa gambar dan sumber.
      const typeName = /^Any (.+)$/i.exec(ref.name)?.[1]
      const type = typeName && Object.keys(app.itemTypes).find((key) => key.toLowerCase() === typeName.toLowerCase())
      if (!type) return { id: null, problem: `bahan "${ref.name}" tanpa halaman di sumber dan jenisnya tidak dikenali` }
      const id = `any/${slugify(typeName)}`
      if (!existing.has(id) && !pending.has(id)) {
        pending.set(id, {
          entry: { id, name: ref.name, type, image: null, imageSize: null, source: null },
          todos: { image: 'bahan generik tanpa halaman di sumber; sumber hanya menampilkan gambar placeholder' },
          notes: [],
          usedBy: new Set(),
        })
      }
      pending.get(id)?.usedBy.add(usedBy)
      return { id }
    }
    const id = `${ref.segment}/${ref.slug}`
    if (ownData[ref.segment]) {
      const entry = ownData[ref.segment].get(ref.slug)
      if (!entry) return { id: null, problem: `${id} belum ada di data ${ref.segment}; jalankan --kind ${ref.segment} --slug ${ref.slug} dulu` }
      if (entry.name !== ref.name) console.warn(`  catatan: nama "${ref.name}" di ${usedBy} ≠ "${entry.name}" di ${ref.segment}`)
      return { id }
    }
    if (existing.has(id)) {
      if (existing.get(id).name !== ref.name) console.warn(`  catatan: nama "${ref.name}" di ${usedBy} ≠ "${existing.get(id).name}" di items.js`)
      return { id }
    }
    if (pending.has(id)) {
      pending.get(id).usedBy.add(usedBy)
      return { id }
    }
    const type = segmentTypes.get(ref.segment)
    if (!type) return { id: null, problem: `jenis benda untuk bagian "${ref.segment}" belum ada di ITEM_TYPES (${id})` }
    const source = `${BASE_URL}/en/${ref.segment}/${ref.slug}`
    const own = entryData[ref.segment]?.get(ref.slug)
    if (own) {
      // Entri sudah ada di data Hatowiki: nama, gambar, dan sumbernya dipakai ulang (gambar tidak diunduh lagi).
      const notes = own.name !== ref.name ? [`nama di tautan "${ref.name}" ≠ nama entri "${own.name}"`] : []
      const imageSize = own.imageSize ?? (own.image ? webpSize(await readFile(path.join(ROOT, 'public', own.image))) : null)
      pending.set(id, {
        entry: { id, name: own.name, type, image: own.image ?? null, imageSize: own.image ? imageSize : null, source: own.source },
        todos: own.image ? {} : { image: 'entrinya belum punya gambar' },
        notes,
        imageStatus: own.image ? `dipakai ulang dari ${own.image}` : 'tidak ada',
        usedBy: new Set([usedBy]),
      })
      return { id }
    }
    if (ref.segment === 'recipes' && batch.has(ref.slug)) {
      // Resep yang ditambahkan di run yang sama: diisi dari hasilnya setelah semua resep diproses (finishBatch).
      pending.set(id, {
        entry: { id, name: ref.name, type, image: null, imageSize: null, source },
        todos: {},
        notes: [],
        fromBatch: ref.slug,
        imageStatus: 'dari resep di run ini',
        usedBy: new Set([usedBy]),
      })
      return { id }
    }
    const page = parseItemPage(await getCached(source))
    const todos = {}
    const notes = []
    const name = page.name ?? ref.name
    if (!page.name) notes.push('judul halaman benda tidak terbaca; dipakai nama dari tautan')
    else if (page.name !== ref.name) notes.push(`nama di halaman benda "${page.name}" ≠ nama di tautan "${ref.name}"`)
    const image = await prepareImage({
      imageSrc: page.imageSrc,
      imageDir: path.join(ROOT, ITEMS.imageDir),
      fileName: `${ref.segment}-${ref.slug}.webp`,
      imageUrl: ITEMS.imageUrl,
      write,
    })
    if (image.todo) todos.image = image.todo
    if (image.note) notes.push(image.note)
    pending.set(id, {
      entry: { id, name, type, image: image.image, imageSize: image.image ? image.imageSize : null, source },
      todos,
      notes,
      imageBytes: image.imageBytes,
      imageFile: image.imageFile,
      imageStatus: image.imageStatus,
      usedBy: new Set([usedBy]),
    })
    return { id }
  }

  // Benda dari resep di run yang sama: nama, gambar, dan ukurannya dari entri resep hasil run itu.
  function finishBatch(results) {
    for (const item of pending.values()) {
      if (!item.fromBatch) continue
      const entry = results.find((result) => result.entry.slug === item.fromBatch)?.entry
      if (!entry) {
        item.todos.image = 'resep sumbernya tidak ikut tersimpan di run ini'
        continue
      }
      if (entry.name !== item.entry.name) item.notes.push(`nama di tautan "${item.entry.name}" ≠ nama resep "${entry.name}"`)
      Object.assign(item.entry, { name: entry.name, image: entry.image, imageSize: entry.image ? entry.imageSize : null, source: entry.source })
      if (!entry.image) item.todos.image = 'resepnya belum punya gambar'
    }
  }

  return { resolve, pending, finishBatch }
}

function reportItems(pending) {
  if (!pending.size) {
    console.log('Benda baru: -')
    return
  }
  console.log(`\nBenda baru (${pending.size}):`)
  for (const { entry, todos, notes, imageStatus, usedBy } of pending.values()) {
    console.log(`• ${entry.id} — ${entry.name} | ${entry.type} | gambar: ${imageStatus ?? 'tidak ada'} | dipakai: ${[...usedBy].join(', ')}`)
    for (const [key, message] of Object.entries(todos)) console.log(`    TODO ${key}: ${message}`)
    for (const note of notes) console.log(`    catatan: ${note}`)
  }
}

// Masalah validasi yang hanya karena zona/benda baru belum ada di modul yang dimuat diabaikan (dicek ulang setelah ditulis).
function withoutPendingRefs(problems, { zones = {}, itemIds = new Set() }) {
  const pendingRef = (problem) => {
    const zone = /zona "(.+)" tidak ada$/.exec(problem)?.[1]
    if (zone) return Boolean(zones[zone])
    const item = /(?:makanan|bahan) "(.+)" tidak ada di items\.js$/.exec(problem)?.[1]
    return Boolean(item && itemIds.has(item))
  }
  return problems
    .map(({ slug, problems: list }) => ({ slug, problems: list.filter((problem) => !pendingRef(problem)) }))
    .filter(({ problems: list }) => list.length)
}

// ---------- lokasi & zona peta ----------
// Peta dasar yang dipakai entri baru tapi belum ada di public/images/maps (mis. Whalefall Canyon): diunduh sekali.
async function missingBaseMaps(baseMapNames) {
  const downloads = []
  for (const name of new Set(baseMapNames.filter((item) => BASE_MAPS[item]))) {
    const imageFile = path.join(ROOT, 'public', BASE_MAPS[name])
    if (existsSync(imageFile)) continue
    const imageBytes = await getCached(`${BASE_URL}/_astro/${name}`, { binary: true })
    const size = webpSize(imageBytes)
    console.log(`Peta dasar baru: ${BASE_MAPS[name]} dari ${name} (${size?.join('×') ?? 'ukuran tidak terbaca'})`)
    downloads.push({ imageFile, imageBytes })
  }
  return downloads
}

const zoneProblemOf = (detail) =>
  !detail.zone
    ? 'zona peta tidak ada di sumber (tampil placeholder)'
    : !BASE_MAPS[detail.zone.baseMap]
      ? `peta dasar di sumber tidak dikenal (${detail.zone.baseMap}); tambahkan ke BASE_MAPS dan perbarui peta lokal dulu`
      : null

// Label lokasi, zona baru/lama, dan lokasi jamak dengan zona per lokasi. Dipakai wildlife dan collectible.
function createLocationTools(app, { mapLocations, mapZones, uncertainLabels }) {
  const knownLabels = [...new Set([
    ...app.allEntries.fish.map((item) => item.location),
    ...[...app.allEntries.bugs, ...app.allEntries.birds, ...app.allEntries.animals, ...app.collectibles]
      .flatMap((item) => (item.locations ?? []).map((location) => location.name)),
  ].filter(Boolean))]
  const zones = { ...app.zones }
  const newZones = []
  const mapLocationEntries = [...mapLocations.entries()]
  const idForLabel = (upper) => mapLocationEntries.find(([, name]) => name.toUpperCase() === upper.toUpperCase())?.[0] ?? null

  // Huruf besar-kecil label lokasi: tabel peta dan halaman daftar dipercaya; label lama diikuti beserta TODO-nya.
  function resolveLabel(upperLabel, trusted) {
    const target = upperLabel.toUpperCase()
    const spanish = SPANISH_LOCATION_LABELS[target]
    if (spanish) {
      return {
        label: spanish.label,
        todo: `label di sumber berbahasa Spanyol ("${spanish.original}") tanpa versi Inggris di heartodex; diterjemahkan mengikuti pola ${spanish.pattern}`,
      }
    }
    let label = [...trusted, ...knownLabels].find((candidate) => candidate.toUpperCase() === target) ?? null
    if (label && !trusted.includes(label) && uncertainLabels.has(label)) {
      return { label, todo: `verifikasi huruf besar-kecil; sumber hanya menampilkan "${upperLabel}"` }
    }
    if (!label) {
      // Sumber hanya punya versi kapital. Isi label tidak diubah; huruf besar-kecil mengikuti pola
      // label yang sudah ada (mis. "ALL SEAS & OCEAN" → "All Seas & Ocean") dan ditandai untuk dicek.
      label = titleCase(upperLabel)
      return { label, todo: `verifikasi huruf besar-kecil; sumber hanya menampilkan "${upperLabel}"` }
    }
    return { label, todo: null }
  }

  // Zona baru atau zona lama dengan poligon yang sama persis (dipakai bersama).
  function zoneFor(label, polygons, viewBox, meta) {
    const reused = Object.entries(zones).find(([, zone]) => samePolygonSet(zone.polygons, polygons))
    if (reused) return reused[0]
    let key = slugify(label ?? `zona-${meta.flyzone}`)
    if (zones[key]) key = `${key}-${meta.flyzone ?? meta.sourceId}`
    zones[key] = { viewBox, polygons }
    newZones.push({ key, viewBox, polygons, ...meta })
    return key
  }

  // Beberapa label lokasi. Poligon gabungan di halaman detail dipisah per lokasi dengan mencocokkannya ke zona di
  // skrip peta (ubicacion_id). `trustedFor(i)` = label tepercaya tambahan untuk lokasi ke-i (mis. daftar Location hewan).
  function multiLocations({ detail, labelsUpper, listLabels, zoneProblem, zoneMeta, todos, notes, trustedFor = () => [] }) {
    const locations = []
    const itemTodos = []
    let locationImage = null
    if (!labelsUpper.length) todos.locations = 'label lokasi tidak ditemukan di sumber'
    const detailPolygons = zoneProblem ? [] : detail.zone.polygons
    const owners = detailPolygons.map((points) => {
      const parsed = parsePoints(points)
      return mapZones.find((zone) => samePolygon(zone.points, parsed))?.locationId ?? null
    })
    const labelIds = labelsUpper.map(idForLabel)
    const unmatched = detailPolygons.filter((_, i) => !owners[i] || !labelIds.includes(owners[i]))
    if (unmatched.length && labelsUpper.length > 1) {
      notes.push(`${unmatched.length} poligon tidak bisa dipetakan ke salah satu lokasi (${owners.map((owner) => owner ?? '?').join(', ')})`)
    }
    for (const [i, upper] of labelsUpper.entries()) {
      const trusted = [...trustedFor(i), mapLocations.get(labelIds[i]), ...listLabels].filter(Boolean)
      const resolved = resolveLabel(upper, trusted)
      const todo = []
      if (resolved.todo) todo.push(resolved.todo)
      // Satu lokasi: semua poligon miliknya (seperti ikan). Beberapa lokasi: poligon dengan ubicacion_id lokasi itu.
      const polygons = labelsUpper.length === 1 ? detailPolygons : detailPolygons.filter((_, p) => owners[p] && owners[p] === labelIds[i])
      let zone = null
      if (zoneProblem) todo.push(zoneProblem)
      else if (!polygons.length) todo.push('zona peta lokasi ini tidak ada di sumber')
      else {
        const ownViewBox = labelsUpper.length === 1 ? detail.zone.viewBox : app.zoneViewBox([polygons])
        zone = zoneFor(resolved.label, polygons, ownViewBox, zoneMeta)
      }
      locations.push({ name: resolved.label, zone })
      itemTodos.push(todo.join('; ') || null)
    }
    const detailSet = labelsUpper.map((label) => label.toUpperCase())
    const listSet = listLabels.map((label) => label.toUpperCase())
    // Label halaman detail yang dipakai; perbedaannya dengan halaman daftar dicatat sebagai TODO.
    if (labelsUpper.length && !sameSet(detailSet, listSet)) {
      todos.locations = `label di halaman detail "${labelsUpper.join(' · ')}" berbeda dari halaman daftar "${listLabels.join(', ')}"`
    }
    const zoneKeys = locations.map((location) => location.zone).filter(Boolean)
    if (zoneKeys.length) {
      locationImage = BASE_MAPS[detail.zone.baseMap]
      // viewBox yang dihitung aplikasi untuk semua zona entri ini harus sama dengan peta di halaman detail.
      const computed = zoneKeys.length === 1 ? zones[zoneKeys[0]].viewBox : app.zoneViewBox(zoneKeys.map((key) => zones[key].polygons))
      if (!sameViewBox(computed, detail.zone.viewBox)) notes.push(`viewBox peta dihitung ${computed} ≠ sumber ${detail.zone.viewBox}`)
    }
    if (itemTodos.some(Boolean)) todos.locationItems = itemTodos
    return { locations, locationImage }
  }

  return { zones, newZones, resolveLabel, zoneFor, multiLocations }
}

// ---------- utama ----------
async function main() {
  const args = parseArgs(process.argv.slice(2))
  const kind = KINDS[args.kind]
  if (kind.family === 'recipes') return syncRecipes(args, kind)
  if (kind.family === 'goods') return syncGoods(args, kind)
  const app = await loadAppModules(kind)
  const translationsFile = path.join(ROOT, kind.translationsFile)
  const imageDir = path.join(ROOT, kind.imageDir)
  const existingSlugs = new Set(app.entries.map((item) => item.slug))
  const translations = existsSync(translationsFile) ? JSON.parse(await readFile(translationsFile, 'utf8')) : {}
  const animal = app.schema.hasFavoriteFood

  console.log('Mengambil halaman daftar dan tabel lokasi…')
  const list = parseList(await getCached(`${BASE_URL}/en/${kind.segment}`), kind.segment, kind.untitledSection)
  const mapPage = await getCached(`${BASE_URL}/en/map`)
  const mapScriptPath = /src="(\/_astro\/HeartopiaMap[^"]+\.js)"/.exec(mapPage)?.[1]
  const mapScript = mapScriptPath ? await getCached(`${BASE_URL}${mapScriptPath}`) : ''
  const mapLocations = parseMapLocations(mapScript)
  const mapZones = parseMapZones(mapScript)
  const mapMarkers = parseMapMarkers(mapScript)
  const { listIndex, toAdd } = selectTargets(list, args, existingSlugs)

  const locationTools = createLocationTools(app, { mapLocations, mapZones, uncertainLabels: await readUncertainLabels() })
  const { zones, newZones, resolveLabel, zoneFor } = locationTools
  const results = []
  const items = createItemResolver(app, args.write)

  for (const listItem of toAdd) {
    const source = `${BASE_URL}/en/${kind.segment}/${listItem.slug}`
    const html = await getCached(source)
    const detail = animal ? parseAnimalDetail(html, app) : parseDetail(html, app)
    const todos = {}
    const notes = []

    const category = pickCategory(detail, app, todos, notes)
    const descriptionOriginal = pickDescription(detail.ldDescription, animal ? detail.pageDescription : detail.aboutDescription, todos, notes)
    if (detail.tip) notes.push(`Expert Tip di sumber (petunjuk heartodex, tidak dimasukkan ke deskripsi): "${detail.tip}"`)
    const description = translations[listItem.slug]?.trim() || null
    if (!description) todos.description = 'terjemahan Indonesia belum ada'

    // Harga jual. Bugs & Birds: hanya bilangan bulat; nilai desimal → null + TODO dengan nilai aslinya.
    // Kualitas yang tidak dicantumkan di sumber → null + `marketValueMissing` (tampil "—"); blok kosong → null seluruhnya.
    let marketValue = detail.marketValue
    let marketValueMissing
    if (app.schema.hasMarketValue) {
      const marketTodos = []
      if (!detail.marketCellsOk) notes.push('sel harga jual di sumber tidak terbaca per bintang (bintang ganda/di luar 1–5)')
      if (detail.marketText && detail.marketRaw?.join(' ') !== detail.marketText.join(' ')) {
        notes.push(`harga per bintang [${detail.marketRaw}] ≠ teks blok Market Value [${detail.marketText}]`)
      }
      if (!marketValue) {
        todos.marketValue = 'harga jual tidak ada di sumber (blok Market Value kosong)'
      } else {
        const missing = marketValue.map((value, i) => (value === null ? i : null)).filter((i) => i != null)
        if (missing.length) {
          marketValueMissing = missing
          marketTodos.push(`harga jual tidak ada di sumber untuk ${missing.map((i) => `${i + 1}★`).join(', ')}`)
        }
        if (app.schema.integerPrices) {
          const decimals = detail.marketRaw
            .map((raw, i) => ({ raw, stars: i + 1, value: marketValue[i] }))
            .filter(({ value }) => value !== null && !Number.isInteger(value))
          if (decimals.length) {
            marketValue = marketValue.map((value) => (Number.isInteger(value) ? value : null))
            marketTodos.push(`harga desimal di sumber, diisi null (tampil "Belum pasti"): ${decimals.map(({ stars, raw }) => `${stars}★ "${raw}"`).join(', ')}`)
          }
        }
        if (marketTodos.length) todos.marketValue = marketTodos.join('; ')
      }
    }

    // Lokasi & zona peta. Hewan: label dari daftar "Location" di halaman detail (huruf besar-kecil asli),
    // wildlife lain: label peta (kapital) di halaman detail.
    const labelsUpper = animal
      ? detail.locations.map((label) => label.toUpperCase())
      : detail.locationLabel ? detail.locationLabel.split(' · ').map((label) => label.trim()).filter(Boolean) : []
    const listLabels = app.schema.multiLocation || labelsUpper.length > 1 ? splitList(listItem.location) : [listItem.location]
    const zoneProblem = zoneProblemOf(detail)
    const zoneMeta = { sourceId: detail.zone?.sourceId, flyzone: detail.flyzone, source }
    let locationFields
    let locationImage = null

    if (!app.schema.multiLocation && labelsUpper.length <= 1) {
      // Ikan: satu label, satu zona (poligon halaman detail apa adanya).
      let location = null
      let locationZone = null
      if (labelsUpper.length) {
        const resolved = resolveLabel(detail.locationLabel, [mapLocations.get(detail.flyzone), listItem.location].filter(Boolean))
        location = resolved.label
        if (resolved.todo) todos.location = resolved.todo
        if (location.toUpperCase() !== listItem.location.toUpperCase()) {
          notes.push(`label lokasi detail "${location}" berbeda dari daftar "${listItem.location}"`)
        }
      } else {
        todos.location = 'label lokasi tidak ditemukan di sumber'
      }
      if (zoneProblem) todos.locationZone = zoneProblem
      else {
        locationZone = zoneFor(location, detail.zone.polygons, detail.zone.viewBox, zoneMeta)
        locationImage = BASE_MAPS[detail.zone.baseMap]
      }
      locationFields = { location, locationZone }
    } else {
      // Serangga, burung, hewan: beberapa label (lihat createLocationTools). Ikan dengan beberapa label di sumber (mis. ikan
      // event "OLD SEA · [EVENT] FROSTSPORE FISH") juga memakai `locations`, satu zona per lokasi.
      if (animal && detail.locationLabel) {
        const mapSet = detail.locationLabel.split(' · ').map((label) => label.trim().toUpperCase())
        if (!sameSet(mapSet, labelsUpper)) notes.push(`label peta "${detail.locationLabel}" berbeda dari daftar Location "${detail.locations.join(', ')}"`)
      }
      const multi = locationTools.multiLocations({
        detail, labelsUpper, listLabels, zoneProblem, zoneMeta, todos, notes,
        trustedFor: (i) => (animal ? [detail.locations[i]] : []),
      })
      locationImage = multi.locationImage
      locationFields = { locations: multi.locations }
    }

    // Hewan: titik tempat makan (pin di peta halaman detail = marker flymark) dan makanan favorit.
    let animalFields = {}
    if (animal) {
      let feedingSpot = null
      const pin = detail.pins[0]
      const marker = detail.flymark ? mapMarkers.get(detail.flymark) : null
      if (detail.baseMap && !BASE_MAPS[detail.baseMap]) {
        todos.feedingSpot = `peta dasar di sumber tidak dikenal (${detail.baseMap}); tambahkan ke BASE_MAPS dan perbarui peta lokal dulu`
      } else if (pin) {
        feedingSpot = { x: round1(pin.x), y: round1(pin.y) }
        if (detail.pins.length > 1) notes.push(`${detail.pins.length} pin di peta; dipakai yang pertama`)
        if (pin.label.toUpperCase() !== (detail.name ?? '').toUpperCase()) notes.push(`label pin "${pin.label}" ≠ nama "${detail.name}"`)
        if (!marker) notes.push(`marker flymark=${detail.flymark} tidak ditemukan di skrip peta`)
        else if (Math.abs(marker.x - pin.x) > 0.01 || Math.abs(marker.y - pin.y) > 0.01) {
          notes.push(`pin (${pin.x}, ${pin.y}) ≠ marker flymark=${detail.flymark} (${marker.x}, ${marker.y})`)
        }
      } else if (marker) {
        feedingSpot = { x: round1(marker.x), y: round1(marker.y) }
        notes.push(`pin tidak ada di halaman detail; dipakai marker flymark=${detail.flymark}`)
      } else {
        todos.feedingSpot = 'titik tempat makan tidak ada di sumber (peta memakai zona lokasi)'
      }
      if (feedingSpot) {
        locationImage = BASE_MAPS[detail.baseMap] ?? MAP_IMAGE_PATH
        const home = locationFields.locations.find((location) => location.zone && zones[location.zone].polygons.some((points) => pointInPolygon([feedingSpot.x, feedingSpot.y], points)))
        notes.push(`titik tempat makan (${feedingSpot.x}, ${feedingSpot.y}) ${home ? `di dalam zona ${home.name}` : 'di luar zona lokasinya'}`)
      }
      const favoriteFood = []
      const foodProblems = []
      for (const food of detail.food) {
        const expected = SPANISH_TYPE_SEGMENTS[food.sourceType]
        if (food.segment && expected !== food.segment) notes.push(`jenis makanan "${food.sourceType}" tidak cocok dengan bagian URL "${food.segment}" (${food.name})`)
        const { id, problem } = await items.resolve(food, listItem.slug)
        if (id) favoriteFood.push(id)
        else foodProblems.push(problem)
      }
      if (!detail.food.length) foodProblems.push('makanan favorit tidak ada di sumber')
      if (foodProblems.length) todos.favoriteFood = foodProblems.join('; ')
      animalFields = { feedingSpot, favoriteFood }
    }

    const image = await prepareImage({ imageSrc: detail.imageSrc, imageDir, fileName: `${listItem.slug}.webp`, imageUrl: kind.imageUrl, write: args.write })
    if (image.todo) todos.image = image.todo
    if (image.note) notes.push(image.note)
    if (!kind.storeImageSize && image.imageBytes && (image.imageSize?.[0] !== EXPECTED_IMAGE_SIZE || image.imageSize?.[1] !== EXPECTED_IMAGE_SIZE)) {
      notes.push(`ukuran gambar ${image.imageSize?.join('×') ?? 'tidak terbaca'}, bukan ${EXPECTED_IMAGE_SIZE}×${EXPECTED_IMAGE_SIZE} seperti width/height di EntryImage`)
    }

    if (app.schema.hasLevel) {
      if (detail.level == null) todos.level = 'level tidak ditemukan di sumber'
      if (detail.level != null && detail.level !== listItem.level) notes.push(`level detail ${detail.level} ≠ daftar ${listItem.level}`)
    }
    if (app.schema.hasShadow && !detail.shadow) todos.shadow = 'shadow tidak ditemukan di sumber'
    if (!app.schema.hasShadow && detail.shadow) notes.push(`sumber punya shadow "${detail.shadow}" padahal skema ${kind.slug} tanpa shadow`)
    if (app.schema.hasSchedule) {
      if (!sameSet(detail.schedule, listItem.schedule)) notes.push(`schedule detail [${detail.schedule}] ≠ daftar [${listItem.schedule}]`)
      if (!detail.schedule.length) todos.schedule = 'schedule tidak ditemukan di halaman detail'
    }
    if (!sameSet(detail.weather, listItem.weather)) notes.push(`weather detail [${detail.weather}] ≠ daftar [${listItem.weather}]`)
    if (!detail.weather.length) todos.weather = 'weather tidak ditemukan di halaman detail'

    const entry = ordered({
      slug: listItem.slug,
      name: detail.name || null,
      category,
      section: listItem.section,
      description,
      descriptionOriginal,
      ...(app.schema.hasLevel ? { level: detail.level } : {}),
      ...(app.schema.hasShadow ? { shadow: detail.shadow } : {}),
      ...(app.schema.hasMarketValue ? { marketValue, marketValueMissing } : {}),
      ...(app.schema.hasSchedule ? { schedule: detail.schedule } : {}),
      weather: detail.weather,
      ...locationFields,
      ...animalFields,
      image: image.image,
      ...(kind.storeImageSize ? { imageSize: image.image ? image.imageSize : null } : {}),
      locationImage,
      source,
    }, kind.fieldOrder)
    if (kind.storeImageSize && image.image && !image.imageSize) todos.imageSize = 'ukuran gambar tidak terbaca'
    if (!entry.name) todos.name = 'nama tidak ditemukan di sumber'
    results.push({
      entry, todos, notes, imageStatus: image.imageStatus, imageBytes: image.imageBytes, imageFile: image.imageFile,
      zoneSourceId: detail.zone?.sourceId, flyzone: detail.flyzone, section: listItem.section, baseMap: detail.zone?.baseMap ?? detail.baseMap ?? null,
    })
  }

  // Kosakata dari semua deskripsi yang tersedia (semua kategori + hasil ambil ini), untuk penanda salah ketik.
  const vocabulary = buildVocabulary(
    [...Object.values(app.allEntries).flat(), ...app.recipes, ...results.map((result) => result.entry)].map((item) => item.descriptionOriginal),
  )
  for (const result of results) {
    result.suspicious = suspiciousWords(result.entry.descriptionOriginal, vocabulary)
  }

  // Validasi dengan skema aplikasi. Zona & benda baru belum ada di modul, jadi pengecekan itu dilakukan di sini.
  const newItems = [...items.pending.values()]
  const problems = withoutPendingRefs(app.findProblems([...app.entries, ...results.map((result) => result.entry)]), {
    zones,
    itemIds: new Set(newItems.map(({ entry }) => entry.id)),
  })
  const itemProblems = app.findItemProblems([...app.items, ...newItems.map(({ entry }) => entry)])

  // ---------- laporan ----------
  console.log(`\nRequest jaringan: ${stats.network}, dari cache: ${stats.cache}\n`)
  for (const { entry, todos, notes, imageStatus, zoneSourceId, flyzone, suspicious } of results) {
    const locationText = entry.locations
      ? entry.locations.map((location) => `${location.name} [${location.zone ?? 'placeholder'}]`).join(' · ')
      : `${entry.location} | zona: ${entry.locationZone ? `${entry.locationZone} (${zoneSourceId}, flyzone=${flyzone})` : 'placeholder'}`
    const stats1 = [
      app.schema.hasLevel && `Lv ${entry.level}`,
      app.schema.hasShadow && entry.shadow,
      entry.category,
      app.schema.hasMarketValue && (entry.marketValue?.map((value) => value ?? '—').join('/') ?? 'harga —'),
    ].filter(Boolean)
    console.log(`• ${entry.slug} — ${entry.name} | ${stats1.join(' | ')}`)
    console.log(`    lokasi: ${locationText} | gambar: ${imageStatus}`)
    if (app.schema.hasSchedule) console.log(`    waktu: ${entry.schedule.join(', ')} | cuaca: ${entry.weather.join(', ')}`)
    else console.log(`    cuaca favorit: ${entry.weather.join(', ')}`)
    if (animal) console.log(`    tempat makan: ${entry.feedingSpot ? `${entry.feedingSpot.x}, ${entry.feedingSpot.y}` : '-'} | makanan: ${entry.favoriteFood.join(', ')}`)
    console.log(`    EN: ${entry.descriptionOriginal}`)
    console.log(`    ID: ${entry.description ?? '(belum diterjemahkan)'}`)
    if (suspicious.length) console.log(`    kata mencurigakan (y→g?): ${suspicious.join(', ')}`)
    for (const [key, message] of Object.entries(todos)) {
      if (key === 'locationItems') message.forEach((item, i) => item && console.log(`    TODO lokasi ${entry.locations[i].name}: ${item}`))
      else console.log(`    TODO ${key}: ${message}`)
    }
    for (const note of notes) console.log(`    catatan: ${note}`)
  }
  reportItems(items.pending)
  const flagged = results.filter((result) => result.suspicious.length)
  console.log(`\nKata mencurigakan: ${flagged.map((result) => `${result.entry.slug} [${result.suspicious.join(', ')}]`).join('; ') || '-'}`)
  console.log(`Zona baru: ${newZones.map((zone) => zone.key).join(', ') || '-'}`)
  if (problems.length || itemProblems.length) {
    console.log('\nValidasi GAGAL:')
    for (const { slug, problems: list } of problems) console.log(`  ${slug}: ${list.join('; ')}`)
    for (const { id, problems: list } of itemProblems) console.log(`  benda ${id}: ${list.join('; ')}`)
    process.exitCode = 1
    return
  }
  console.log('Validasi skema: lolos.')
  await writeFile(
    path.join(CACHE_DIR, '..', `last-run-${kind.slug}.json`),
    JSON.stringify(results.map(({ imageBytes, ...rest }) => rest), null, 2),
  )

  if (!args.write) {
    console.log('\nDry run: tidak ada file yang ditulis. Tambahkan --write untuk menyimpan.')
    return
  }
  if (!results.length) {
    console.log('Tidak ada entri baru untuk ditulis.')
    return
  }

  // File data: blok lama disalin apa adanya, blok baru disisipkan, lalu diurutkan level → urutan daftar.
  // locationZones.js: zona baru ditambahkan di akhir objek, zona lama tidak disentuh. items.js: benda baru, urut id.
  const dataFile = path.join(ROOT, kind.dataFile)
  const zonesSource = await readFile(ZONES_FILE, 'utf8')
  const writes = [
    { file: dataFile, next: mergeArraySource(await readFile(dataFile, 'utf8'), kind, app.entries, results, listIndex, app.compareSections) },
    { file: ZONES_FILE, next: appendZones(zonesSource, newZones) },
    ...(newItems.length ? [{ file: path.join(ROOT, ITEMS.dataFile), next: mergeItemsSource(await readFile(path.join(ROOT, ITEMS.dataFile), 'utf8'), app.items, newItems) }] : []),
  ]
  await commitWrites(writes, async () => {
    const after = await loadAppModules(kind)
    assertUnchanged(app, after)
    assertSaved(after.entries, results.map(({ entry }) => entry), 'slug', 'entri baru')
    assertSaved(after.items, newItems.map(({ entry }) => entry), 'id', 'benda baru')
    const afterProblems = [...after.findProblems(after.entries), ...after.findItemProblems(after.items)]
    if (afterProblems.length) throw new Error(`validasi gagal: ${JSON.stringify(afterProblems)}`)
    console.log(`\nTersimpan: ${results.length} entri baru, ${newZones.length} zona baru, ${newItems.length} benda baru. Total ${kind.slug}: ${after.entries.length}.`)
    console.log(`Urutan: ${after.entries.map((item) => item.slug).join(', ')}`)
  }, [...results, ...newItems, ...(await missingBaseMaps(results.map((result) => result.baseMap)))])
}

// ---------- resep ----------
// Angka per bintang (energi/harga jual) → 5 nilai bulat atau null. "---" dan bintang yang tidak ada → null (tampil "—");
// desimal → null + indeks di `uncertain` (tampil "Belum pasti"). Semua kosong → null seluruhnya.
function starValues(parsed, label) {
  if (!parsed.length) return { values: null, todo: `${label} tidak ada di sumber`, uncertain: [] }
  const values = []
  const missing = []
  const decimals = []
  const uncertain = []
  for (let i = 0; i < 5; i++) {
    const cell = parsed[i]
    if (!cell) {
      values.push(null)
      missing.push(`${i + 1}★ tidak ada`)
    } else if (cell.value === null) {
      values.push(null)
      missing.push(`${i + 1}★ "${cell.raw}"`)
    } else if (!Number.isInteger(cell.value)) {
      values.push(null)
      decimals.push(`${i + 1}★ "${cell.raw}"`)
      uncertain.push(i)
    } else {
      values.push(cell.value)
    }
  }
  const todo = []
  if (parsed.length > 5) todo.push(`sumber berisi ${parsed.length} angka, hanya 5 pertama yang dipakai`)
  if (missing.length) todo.push(`${label} tidak ada di sumber: ${missing.join(', ')}`)
  if (decimals.length) todo.push(`${label} desimal di sumber, diisi null (tampil "Belum pasti"): ${decimals.join(', ')}`)
  const allMissing = values.every((value) => value === null) && !uncertain.length
  return { values: allMissing ? null : values, todo: todo.join('; ') || null, uncertain }
}

async function syncRecipes(args, kind) {
  const app = await loadAppModules(kind)
  const translationsFile = path.join(ROOT, kind.translationsFile)
  const imageDir = path.join(ROOT, kind.imageDir)
  const existingSlugs = new Set(app.entries.map((item) => item.slug))
  const translations = existsSync(translationsFile) ? JSON.parse(await readFile(translationsFile, 'utf8')) : {}

  console.log('Mengambil halaman daftar…')
  const list = parseList(await getCached(`${BASE_URL}/en/${kind.segment}`), kind.segment, kind.untitledSection)
  const { listIndex, toAdd } = selectTargets(list, args, existingSlugs)
  const items = createItemResolver(app, args.write, { batch: new Set(toAdd.map((item) => item.slug)) })
  const results = []

  for (const listItem of toAdd) {
    const source = `${BASE_URL}/en/${kind.segment}/${listItem.slug}`
    const detail = parseRecipeDetail(await getCached(source))
    const todos = {}
    const notes = []

    const category = pickCategory(detail, app, todos, notes)
    if (detail.about && !detail.quoted) notes.push('deskripsi di bagian About tidak diapit tanda kutip')
    const descriptionOriginal = pickDescription(detail.ldDescription, detail.descriptionOriginal, todos, notes)
    const description = translations[listItem.slug]?.trim() || null
    if (!description) todos.description = 'terjemahan Indonesia belum ada'

    if (detail.level == null) todos.level = 'level tidak ditemukan di sumber'
    else if (detail.level !== listItem.level) notes.push(`level detail ${detail.level} ≠ daftar ${listItem.level}`)

    const energy = starValues(detail.energy, 'energi')
    if (energy.todo) todos.energy = energy.todo
    const market = detail.marketStarless
      ? { values: null, todo: `harga jual per bintang tidak dicantumkan di sumber (blok Market hanya berisi "${detail.marketStarless}")`, uncertain: [] }
      : starValues(detail.market, 'harga jual')
    if (market.todo) todos.marketValue = market.todo
    const uncertain = {
      ...(energy.uncertain.length ? { energy: energy.uncertain } : {}),
      ...(market.uncertain.length ? { marketValue: market.uncertain } : {}),
    }

    // Buff: hanya kalau sumber mencantumkannya (teks, ikon selain bintang/petir, atau tooltip). Tidak dikarang.
    const otherIcons = detail.energyIcons.filter((icon) => icon !== 'star' && icon !== 'zap')
    if (detail.energyExtra.length || detail.energyTitles.length || otherIcons.length) {
      todos.buffs = `blok "Energy & Buffs" berisi info lain, cek manual: ${[...detail.energyExtra, ...detail.energyTitles, ...otherIcons].join(', ')}`
    } else {
      todos.buffs = 'buff tidak dicantumkan di sumber (blok "Energy & Buffs" hanya berisi energi per bintang)'
    }

    // Bahan: kelompok "fixed" (dengan jumlah) dan "choose" (pilih N dari daftar, boleh dicampur).
    const ingredients = []
    const ingredientProblems = []
    for (const group of detail.groups) {
      if (group.type === 'fixed') {
        const groupItems = []
        for (const link of group.items) {
          const { id, problem } = await items.resolve(link, listItem.slug)
          const quantity = Number(/^x(\d+)$/i.exec(link.quantityRaw ?? '')?.[1])
          if (!id) ingredientProblems.push(problem)
          else if (!Number.isInteger(quantity) || quantity < 1) ingredientProblems.push(`jumlah "${link.name}" tidak terbaca (${link.quantityRaw ?? '-'})`)
          else groupItems.push({ item: id, quantity })
        }
        // Bahan yang sama tercantum dua kali di sumber: disimpan apa adanya (tidak digabung/ditebak), ditandai TODO.
        const repeated = groupItems.map(({ item }) => item).filter((item, i, list) => list.indexOf(item) !== i)
        if (repeated.length) ingredientProblems.push(`bahan tetap tercantum lebih dari sekali di sumber (disimpan apa adanya): ${[...new Set(repeated)].join(', ')}`)
        ingredients.push({ type: 'fixed', items: groupItems })
      } else {
        const options = []
        for (const link of group.options) {
          const { id, problem } = await items.resolve(link, listItem.slug)
          if (id) options.push(id)
          else ingredientProblems.push(problem)
        }
        if (!/\(mix & match\)/.test(group.heading)) notes.push(`judul kelompok pilihan tanpa "(mix & match)": "${group.heading}"`)
        ingredients.push({ type: 'choose', count: group.count, options })
      }
    }
    if (!detail.groups.length) ingredientProblems.push('bahan tidak dicantumkan di sumber')
    if (ingredientProblems.length) todos.ingredients = ingredientProblems.join('; ')

    const image = await prepareImage({ imageSrc: detail.imageSrc, imageDir, fileName: `${listItem.slug}.webp`, imageUrl: kind.imageUrl, write: args.write })
    if (image.todo) todos.image = image.todo
    if (image.note) notes.push(image.note)

    const entry = ordered({
      slug: listItem.slug,
      name: detail.name || null,
      category,
      section: listItem.section,
      family: app.suggestRecipeFamily(detail.name || listItem.slug, listItem.slug),
      description,
      descriptionOriginal,
      level: detail.level,
      energy: energy.values,
      buffs: null,
      marketValue: market.values,
      uncertain: Object.keys(uncertain).length ? uncertain : undefined,
      ingredients,
      image: image.image,
      imageSize: image.image ? image.imageSize : null,
      source,
    }, kind.fieldOrder)
    if (image.image && !image.imageSize) todos.imageSize = 'ukuran gambar tidak terbaca'
    if (!entry.name) todos.name = 'nama tidak ditemukan di sumber'
    results.push({ entry, todos, notes, imageStatus: image.imageStatus, imageBytes: image.imageBytes, imageFile: image.imageFile, section: listItem.section })
  }
  items.finishBatch(results)

  const vocabulary = buildVocabulary(
    [...Object.values(app.allEntries).flat(), ...app.recipes, ...app.crops, ...app.collectibles, ...app.ingredients, ...results.map((result) => result.entry)]
      .map((item) => item.descriptionOriginal),
  )
  for (const result of results) result.suspicious = suspiciousWords(result.entry.descriptionOriginal, vocabulary)

  const newItems = [...items.pending.values()]
  const problems = withoutPendingRefs(app.findProblems([...app.entries, ...results.map((result) => result.entry)]), {
    itemIds: new Set(newItems.map(({ entry }) => entry.id)),
  })
  const itemProblems = app.findItemProblems([...app.items, ...newItems.map(({ entry }) => entry)])

  // ---------- laporan ----------
  const itemName = (id) => items.pending.get(id)?.entry.name ?? app.items.find((item) => item.id === id)?.name ?? id
  const stars = (values) => (values ? values.map((value) => value ?? '—').join('/') : '—')
  console.log(`\nRequest jaringan: ${stats.network}, dari cache: ${stats.cache}\n`)
  for (const { entry, todos, notes, imageStatus, suspicious } of results) {
    console.log(`• ${entry.slug} — ${entry.name} | Lv ${entry.level} | ${entry.category} | gambar: ${imageStatus}`)
    console.log(`    energi: ${stars(entry.energy)} | harga jual: ${stars(entry.marketValue)}`)
    for (const group of entry.ingredients) {
      if (group.type === 'fixed') console.log(`    bahan tetap: ${group.items.map(({ item, quantity }) => `${itemName(item)} x${quantity}`).join(', ')}`)
      else console.log(`    pilih ${group.count}: ${group.options.map(itemName).join(', ')}`)
    }
    console.log(`    EN: ${entry.descriptionOriginal}`)
    console.log(`    ID: ${entry.description ?? '(belum diterjemahkan)'}`)
    if (suspicious.length) console.log(`    kata mencurigakan (y→g?): ${suspicious.join(', ')}`)
    for (const [key, message] of Object.entries(todos)) console.log(`    TODO ${key}: ${message}`)
    for (const note of notes) console.log(`    catatan: ${note}`)
  }
  reportItems(items.pending)
  const flagged = results.filter((result) => result.suspicious.length)
  console.log(`\nKata mencurigakan: ${flagged.map((result) => `${result.entry.slug} [${result.suspicious.join(', ')}]`).join('; ') || '-'}`)
  if (problems.length || itemProblems.length) {
    console.log('\nValidasi GAGAL:')
    for (const { slug, problems: list } of problems) console.log(`  ${slug}: ${list.join('; ')}`)
    for (const { id, problems: list } of itemProblems) console.log(`  benda ${id}: ${list.join('; ')}`)
    process.exitCode = 1
    return
  }
  console.log('Validasi skema: lolos.')
  await writeFile(
    path.join(CACHE_DIR, '..', `last-run-${kind.slug}.json`),
    JSON.stringify({ results: results.map(({ imageBytes, ...rest }) => rest), items: newItems.map(({ imageBytes, ...rest }) => ({ ...rest, usedBy: [...rest.usedBy] })) }, null, 2),
  )
  if (!args.write) {
    console.log('\nDry run: tidak ada file yang ditulis. Tambahkan --write untuk menyimpan.')
    return
  }
  if (!results.length) {
    console.log('Tidak ada entri baru untuk ditulis.')
    return
  }

  const dataFile = path.join(ROOT, kind.dataFile)
  const itemsFile = path.join(ROOT, ITEMS.dataFile)
  const writes = [
    { file: dataFile, next: mergeArraySource(await readFile(dataFile, 'utf8'), kind, app.entries, results, listIndex, app.compareSections) },
    ...(newItems.length ? [{ file: itemsFile, next: mergeItemsSource(await readFile(itemsFile, 'utf8'), app.items, newItems) }] : []),
  ]
  await commitWrites(writes, async () => {
    const after = await loadAppModules(kind)
    assertUnchanged(app, after)
    assertSaved(after.entries, results.map(({ entry }) => entry), 'slug', 'resep baru')
    assertSaved(after.items, newItems.map(({ entry }) => entry), 'id', 'benda baru')
    const afterProblems = [...after.findProblems(after.entries), ...after.findItemProblems(after.items)]
    if (afterProblems.length) throw new Error(`validasi gagal: ${JSON.stringify(afterProblems)}`)
    console.log(`\nTersimpan: ${results.length} resep baru, ${newItems.length} benda baru. Total resep: ${after.entries.length}, benda: ${after.items.length}.`)
    console.log(`Urutan: ${after.entries.map((item) => item.slug).join(', ')}`)
  }, [...results, ...newItems])
}

// ---------- tanaman & collectible ----------
// Satu angka bulat dari kotak di halaman detail ("10", "1.080", "+8"). Desimal → null + TODO + `uncertain`.
function integerStat(raw, label, key, todos, uncertain) {
  if (raw == null) {
    todos[key] = `${label} tidak ada di sumber`
    return null
  }
  const value = sourceNumber(raw)
  if (!Number.isFinite(value)) {
    todos[key] = `${label} tidak terbaca di sumber ("${raw}")`
    return null
  }
  if (!Number.isInteger(value)) {
    todos[key] = `${label} desimal di sumber, diisi null (tampil "Belum pasti"): "${raw}"`
    uncertain.push(key)
    return null
  }
  return value
}

// Waktu tumbuh "HH:MM:SSh" → detik (bilangan bulat).
function growthSeconds(raw, todos) {
  const match = /^(\d+):(\d{2}):(\d{2})h$/.exec(raw ?? '')
  if (!match) {
    todos.growthTime = raw ? `format waktu tumbuh tidak dikenal: "${raw}"` : 'waktu tumbuh tidak ada di sumber'
    return null
  }
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
}

async function syncGoods(args, kind) {
  const app = await loadAppModules(kind)
  const crop = kind.slug === 'crops'
  const ingredient = kind.slug === 'ingredients'
  const translationsFile = path.join(ROOT, kind.translationsFile)
  const imageDir = path.join(ROOT, kind.imageDir)
  const existingSlugs = new Set(app.entries.map((item) => item.slug))
  const translations = existsSync(translationsFile) ? JSON.parse(await readFile(translationsFile, 'utf8')) : {}

  console.log('Mengambil halaman daftar…')
  const list = parseList(await getCached(`${BASE_URL}/en/${kind.segment}`), kind.segment, kind.untitledSection)
  const { listIndex, toAdd } = selectTargets(list, args, existingSlugs)
  // Collectible punya lokasi & zona peta seperti serangga (tanaman & bahan masak tidak).
  let locationTools = null
  if (!crop && !ingredient) {
    const mapPage = await getCached(`${BASE_URL}/en/map`)
    const mapScriptPath = /src="(\/_astro\/HeartopiaMap[^"]+\.js)"/.exec(mapPage)?.[1]
    const mapScript = mapScriptPath ? await getCached(`${BASE_URL}${mapScriptPath}`) : ''
    locationTools = createLocationTools(app, {
      mapLocations: parseMapLocations(mapScript),
      mapZones: parseMapZones(mapScript),
      uncertainLabels: await readUncertainLabels(),
    })
  }
  const results = []

  for (const listItem of toAdd) {
    const source = `${BASE_URL}/en/${kind.segment}/${listItem.slug}`
    const html = await getCached(source)
    const detail = ingredient ? parseIngredientDetail(html) : parseGoodsDetail(html)
    const todos = {}
    const notes = []
    const uncertain = []

    const category = pickCategory(detail, app, todos, notes)
    if (!detail.ldDescription && !detail.pageDescription) {
      todos.descriptionOriginal = 'deskripsi tidak ada di sumber (blok About kosong)'
    }
    const descriptionOriginal = detail.ldDescription || detail.pageDescription
      ? pickDescription(detail.ldDescription, detail.pageDescription, todos, notes)
      : null
    // Terjemahan: teks, atau { text, sourceLang } kalau teks asli di situs EN bukan bahasa Inggris (mis. Spanyol).
    const translation = translations[listItem.slug]
    const description = (typeof translation === 'string' ? translation : translation?.text)?.trim() || null
    const descriptionSourceLang = typeof translation === 'object' && translation?.sourceLang ? translation.sourceLang : undefined
    if (!description) todos.description = descriptionOriginal ? 'terjemahan Indonesia belum ada' : 'deskripsi tidak ada di sumber'
    if (detail.statusText) notes.push(`status event di sumber tidak disimpan: "${detail.statusText}"`)
    if (listItem.section !== 'Base Game' && category !== listItem.section) notes.push(`kategori "${category}" ≠ section "${listItem.section}"`)
    if (listItem.section === 'Base Game' && category !== 'Common') notes.push(`kategori "${category}" di section Base Game`)

    let fields
    let locationImage
    if (crop) {
      // Level hanya ada di halaman daftar (halaman detail tanaman tidak mencantumkannya).
      const level = Number.isInteger(listItem.level) && listItem.level >= 1 ? listItem.level : null
      if (level == null) todos.level = `level tidak terbaca di halaman daftar ("${listItem.level}")`
      const seedPrice = integerStat(detail.buyPrice, 'harga benih (Buy Price)', 'seedPrice', todos, uncertain)
      const growthTime = growthSeconds(detail.growthTime, todos)
      // Kualitas yang tidak ada di sumber → null (tampil "—"); desimal → null + `uncertain` (tampil "Belum pasti").
      const rowTodos = []
      const starValues = detail.starRows.map((row) => {
        const missing = row.values.map((value, i) => (value === null ? i : null)).filter((i) => i != null)
        const decimals = row.values.map((value, i) => (value !== null && !Number.isInteger(value) ? i : null)).filter((i) => i != null)
        if (missing.length) rowTodos.push(`${row.label} tidak ada di sumber untuk ${missing.map((i) => `${i + 1}★`).join(', ')}`)
        if (decimals.length) {
          rowTodos.push(`${row.label} desimal di sumber, diisi null (tampil "Belum pasti"): ${decimals.map((i) => `${i + 1}★ "${row.raw[i]}"`).join(', ')}`)
        }
        return {
          label: row.label,
          values: row.values.map((value) => (Number.isInteger(value) ? value : null)),
          ...(decimals.length ? { uncertain: decimals } : {}),
        }
      })
      if (rowTodos.length) todos.starValues = rowTodos.join('; ')
      if (!starValues.length) todos.starValues = 'deret angka per bintang (Market Value) tidak ada di sumber'
      else if (starValues[0].label !== 'Market Value') notes.push(`deret pertama berlabel "${starValues[0].label}", bukan Market Value`)
      if (detail.sellValue || detail.energyBoost) notes.push(`tanaman punya Sell Value/Energy Boost: ${detail.sellValue}/${detail.energyBoost}`)
      fields = { level, seedPrice, growthTime, starValues }
    } else if (ingredient) {
      const buyPrice = integerStat(detail.buyPrice, 'harga beli (Buy Price)', 'buyPrice', todos, uncertain)
      const sellPrice = integerStat(detail.sellPrice, 'harga jual (Sell Price)', 'sellPrice', todos, uncertain)
      const origin = detail.origin || null
      if (!origin) todos.origin = detail.originUnread ? 'info asal ada di sumber tapi tidak terbaca' : 'info asal (Origin) tidak ada di sumber'
      if (detail.workInProgress) notes.push('halaman sumber bertanda "Work in Progress"')
      if (detail.growthTime || detail.sellValue || detail.energyBoost || detail.starRows.length) {
        notes.push('bahan punya Growth Time/Sell Value/Energy Boost/deret per bintang (tidak disimpan)')
      }
      if (detail.zone || detail.pins.length || detail.locationLabel) notes.push('halaman bahan punya peta/lokasi (tidak disimpan)')
      fields = { buyPrice, sellPrice, origin }
    } else {
      const sellValue = integerStat(detail.sellValue, 'nilai jual (Sell Value)', 'sellValue', todos, uncertain)
      // Energy Boost hanya ada untuk benda yang bisa dimakan; tidak ada di sumber → null tanpa TODO.
      const energyTodos = {}
      const energy = detail.energyBoost == null ? null : integerStat(detail.energyBoost, 'energi (Energy Boost)', 'energy', energyTodos, uncertain)
      Object.assign(todos, energyTodos)
      if (detail.buyPrice || detail.growthTime || detail.starRows.length) notes.push('collectible punya Buy Price/Growth Time/deret per bintang')
      const labelsUpper = detail.locationLabel ? detail.locationLabel.split(' · ').map((label) => label.trim()).filter(Boolean) : []
      const multi = locationTools.multiLocations({
        detail,
        labelsUpper,
        listLabels: splitList(listItem.location),
        zoneProblem: zoneProblemOf(detail),
        zoneMeta: { sourceId: detail.zone?.sourceId, flyzone: detail.flyzone, source },
        todos,
        notes,
      })
      // Pin di peta halaman detail hanyalah satu titik contoh (marker flymark) dari banyak titik benda itu di peta
      // interaktif, jadi tidak disimpan; peta memakai zona lokasi.
      if (detail.pins.length) notes.push(`pin contoh di peta sumber (tidak disimpan): ${detail.pins.map((pin) => `${pin.label} (${pin.x}, ${pin.y})`).join(', ')}; flymark=${detail.flymark}`)
      locationImage = multi.locationImage
      fields = { sellValue, energy, locations: multi.locations }
    }

    const image = await prepareImage({ imageSrc: detail.imageSrc, imageDir, fileName: `${listItem.slug}.webp`, imageUrl: kind.imageUrl, write: args.write })
    if (image.todo) todos.image = image.todo
    if (image.note) notes.push(image.note)

    const entry = ordered({
      slug: listItem.slug,
      name: detail.name || null,
      category,
      section: listItem.section,
      description,
      descriptionOriginal,
      descriptionSourceLang,
      ...fields,
      uncertain: uncertain.length ? uncertain : undefined,
      image: image.image,
      imageSize: image.image ? image.imageSize : null,
      ...(crop || ingredient ? {} : { locationImage }),
      source,
    }, kind.fieldOrder)
    if (image.image && !image.imageSize) todos.imageSize = 'ukuran gambar tidak terbaca'
    if (!entry.name) todos.name = 'nama tidak ditemukan di sumber'
    results.push({
      entry, todos, notes, imageStatus: image.imageStatus, imageBytes: image.imageBytes, imageFile: image.imageFile,
      section: listItem.section, zoneSourceId: detail.zone?.sourceId, flyzone: detail.flyzone, baseMap: detail.zone?.baseMap ?? null,
    })
  }

  const vocabulary = buildVocabulary(
    [...Object.values(app.allEntries).flat(), ...app.recipes, ...app.crops, ...app.collectibles, ...app.ingredients, ...results.map((result) => result.entry)]
      .map((item) => item.descriptionOriginal),
  )
  for (const result of results) result.suspicious = suspiciousWords(result.entry.descriptionOriginal, vocabulary)
  const zones = locationTools?.zones ?? {}
  const newZones = locationTools?.newZones ?? []
  const problems = withoutPendingRefs(app.findProblems([...app.entries, ...results.map((result) => result.entry)]), { zones })

  // ---------- laporan ----------
  const stars = (values) => values.map((value) => value ?? '—').join('/')
  const clock = (seconds) => (seconds == null ? '—' : `${Math.floor(seconds / 3600)}j ${Math.floor((seconds % 3600) / 60)}m`)
  console.log(`\nRequest jaringan: ${stats.network}, dari cache: ${stats.cache}\n`)
  for (const { entry, todos, notes, imageStatus, suspicious } of results) {
    const head = crop
      ? `Lv ${entry.level} | benih ${entry.seedPrice ?? '—'} | tumbuh ${clock(entry.growthTime)}`
      : ingredient
        ? `beli ${entry.buyPrice ?? '—'} | jual ${entry.sellPrice ?? '—'} | asal ${entry.origin ?? '—'}`
        : `jual ${entry.sellValue ?? '—'} | energi ${entry.energy ?? '—'}`
    console.log(`• ${entry.slug} — ${entry.name} | ${entry.category} | section ${entry.section} | ${head} | gambar: ${imageStatus}`)
    if (crop) for (const row of entry.starValues) console.log(`    ${row.label}: ${stars(row.values)}`)
    else if (!ingredient) console.log(`    lokasi: ${entry.locations.map((location) => `${location.name} [${location.zone ?? 'placeholder'}]`).join(' · ')}`)
    console.log(`    EN: ${entry.descriptionOriginal ?? '(tidak ada)'}`)
    console.log(`    ID: ${entry.description ?? '(belum diterjemahkan)'}`)
    if (suspicious.length) console.log(`    kata mencurigakan (y→g?): ${suspicious.join(', ')}`)
    for (const [key, message] of Object.entries(todos)) {
      if (key === 'locationItems') message.forEach((item, i) => item && console.log(`    TODO lokasi ${entry.locations[i].name}: ${item}`))
      else console.log(`    TODO ${key}: ${message}`)
    }
    for (const note of notes) console.log(`    catatan: ${note}`)
  }
  const flagged = results.filter((result) => result.suspicious.length)
  console.log(`\nKata mencurigakan: ${flagged.map((result) => `${result.entry.slug} [${result.suspicious.join(', ')}]`).join('; ') || '-'}`)
  if (!crop && !ingredient) console.log(`Zona baru: ${newZones.map((zone) => zone.key).join(', ') || '-'}`)
  if (problems.length) {
    console.log('\nValidasi GAGAL:')
    for (const { slug, problems: list } of problems) console.log(`  ${slug}: ${list.join('; ')}`)
    process.exitCode = 1
    return
  }
  console.log('Validasi skema: lolos.')
  await writeFile(
    path.join(CACHE_DIR, '..', `last-run-${kind.slug}.json`),
    JSON.stringify(results.map(({ imageBytes, ...rest }) => rest), null, 2),
  )
  if (!args.write) {
    console.log('\nDry run: tidak ada file yang ditulis. Tambahkan --write untuk menyimpan.')
    return
  }
  if (!results.length) {
    console.log('Tidak ada entri baru untuk ditulis.')
    return
  }

  const dataFile = path.join(ROOT, kind.dataFile)
  const writes = [
    { file: dataFile, next: mergeArraySource(await readFile(dataFile, 'utf8'), kind, app.entries, results, listIndex, app.compareSections) },
    ...(newZones.length ? [{ file: ZONES_FILE, next: appendZones(await readFile(ZONES_FILE, 'utf8'), newZones) }] : []),
  ]
  await commitWrites(writes, async () => {
    const after = await loadAppModules(kind)
    assertUnchanged(app, after)
    assertSaved(after.entries, results.map(({ entry }) => entry), 'slug', `${kind.slug} baru`)
    const afterProblems = after.findProblems(after.entries)
    if (afterProblems.length) throw new Error(`validasi gagal: ${JSON.stringify(afterProblems)}`)
    console.log(`\nTersimpan: ${results.length} entri baru, ${newZones.length} zona baru. Total ${kind.slug}: ${after.entries.length}.`)
    console.log(`Urutan: ${after.entries.map((item) => item.slug).join(', ')}`)
  }, [...results, ...(await missingBaseMaps(results.map((result) => result.baseMap)))])
}

// ---------- menulis file ----------
// Array data (`export const <nama> = [ … ]`): blok lama disalin apa adanya, blok baru disisipkan, lalu diurutkan
// section (Base Game, lalu event terbaru → terlama) → level → urutan di halaman daftar.
function mergeArraySource(original, kind, oldEntries, results, listIndex, compareSections) {
  const open = original.indexOf('[', original.indexOf(`export const ${kind.exportName} = [`))
  const close = findClosingBracket(original, open)
  const oldBlocks = splitTopLevelObjects(original.slice(open + 1, close))
  if (oldBlocks.length !== oldEntries.length) throw new Error(`Jumlah blok di ${kind.dataFile} tidak cocok dengan data yang dimuat`)
  const blocks = [
    ...oldBlocks.map((text, i) => ({ text, item: oldEntries[i] })),
    ...results.map(({ entry, todos }) => ({ text: entrySource(entry, todos, kind.fieldOrder), item: entry })),
  ]
  const rank = (item) => [item.level ?? Infinity, listIndex.get(item.slug)?.order ?? Infinity]
  blocks.sort((a, b) => {
    const [levelA, orderA] = rank(a.item)
    const [levelB, orderB] = rank(b.item)
    return compareSections(a.item.section, b.item.section) || levelA - levelB || orderA - orderB
  })
  return `${original.slice(0, open + 1)}\n${blocks.map((block) => `  ${block.text},`).join('\n')}\n${original.slice(close)}`
}

// items.js: benda lama disalin apa adanya, benda baru disisipkan, urut id.
function mergeItemsSource(original, oldItems, newItems) {
  const open = original.indexOf('[', original.indexOf(`export const ${ITEMS.exportName} = [`))
  const close = findClosingBracket(original, open)
  const oldBlocks = splitTopLevelObjects(original.slice(open + 1, close))
  if (oldBlocks.length !== oldItems.length) throw new Error(`Jumlah blok di ${ITEMS.dataFile} tidak cocok dengan data yang dimuat`)
  const blocks = [
    ...oldBlocks.map((text, i) => ({ text, id: oldItems[i].id })),
    ...newItems.map(({ entry, todos }) => ({ text: entrySource(entry, todos, ITEMS.fieldOrder), id: entry.id })),
  ].sort((a, b) => a.id.localeCompare(b.id, 'en'))
  return `${original.slice(0, open + 1)}\n${blocks.map((block) => `  ${block.text},`).join('\n')}\n${original.slice(close)}`
}

function appendZones(original, newZones) {
  if (!newZones.length) return original
  const zoneSource = newZones
    .map((zone) => [
      `  // Zona "${zone.sourceId}" (flyzone=${zone.flyzone}) di ${zone.source} (diperiksa ${TODAY}).`,
      `  ${jsString(zone.key)}: {`,
      `    viewBox: ${jsString(zone.viewBox)},`,
      '    polygons: [',
      ...zone.polygons.map((points) => `      ${jsString(points)},`),
      '    ],',
      '  },',
    ].join('\n'))
    .join('\n')
  const end = original.lastIndexOf('}')
  return `${original.slice(0, end)}${zoneSource}\n${original.slice(end)}`
}

// Data lama di semua file (wildlife, resep, tanaman, collectible, bahan, benda, zona) harus identik setelah menulis.
function assertUnchanged(before, after) {
  const collections = [
    ...Object.keys(before.allEntries).map((slug) => [slug, before.allEntries[slug], after.allEntries[slug], 'slug']),
    ['recipes', before.recipes, after.recipes, 'slug'],
    ['crops', before.crops, after.crops, 'slug'],
    ['collectibles', before.collectibles, after.collectibles, 'slug'],
    ['ingredients', before.ingredients, after.ingredients, 'slug'],
    ['items', before.items, after.items, 'id'],
  ]
  for (const [name, list, afterList, key] of collections) {
    const byKey = new Map(afterList.map((item) => [item[key], item]))
    for (const item of list) {
      if (JSON.stringify(byKey.get(item[key])) !== JSON.stringify(item)) throw new Error(`data lama berubah: ${name}/${item[key]}`)
    }
  }
  for (const [key, zone] of Object.entries(before.zones)) {
    if (JSON.stringify(after.zones[key]) !== JSON.stringify(zone)) throw new Error(`zona lama berubah: ${key}`)
  }
}

function assertSaved(afterList, entries, key, label) {
  const byKey = new Map(afterList.map((item) => [item[key], item]))
  for (const entry of entries) {
    if (JSON.stringify(byKey.get(entry[key])) !== JSON.stringify(entry)) throw new Error(`${label} tidak tersimpan benar: ${entry[key]}`)
  }
}

// Menulis semua file, lalu mengecek ulang. Kalau gagal, semua file dikembalikan. Gambar baru ditulis setelah
// pengecekan lolos; flag wx menolak menimpa file yang sudah ada.
async function commitWrites(writes, verify, withImages) {
  const originals = await Promise.all(writes.map(({ file }) => readFile(file, 'utf8')))
  const changed = writes.filter(({ next }, i) => next !== originals[i])
  for (const { file, next } of changed) await writeFile(file, next)
  try {
    await verify()
    for (const { imageBytes, imageFile } of withImages) {
      if (!imageBytes) continue
      await mkdir(path.dirname(imageFile), { recursive: true })
      await writeFile(imageFile, imageBytes, { flag: 'wx' })
    }
  } catch (error) {
    for (const [i, { file }] of writes.entries()) await writeFile(file, originals[i])
    throw new Error(`Penulisan dibatalkan dan file dikembalikan: ${error.message}`)
  }
}

// Parser diekspor untuk pengecekan; sinkronisasi hanya jalan kalau skrip dipanggil langsung.
export {
  buildVocabulary, parseAnimalDetail, parseDetail, parseGoodsDetail, parseIngredientDetail, parseItemPage, parseList, parseMapMarkers, parseMapZones,
  parseRecipeDetail, suspiciousWords,
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
