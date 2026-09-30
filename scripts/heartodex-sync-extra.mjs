#!/usr/bin/env node
/**
 * Sinkronisasi Achievements, Items (benda pakai per hobi), dan NPCs dari Heartodex:
 *   achievements → src/data/achievements/achievements.js   gambar public/images/achievements/<slug>.webp
 *   items        → src/data/hobbyItems/hobbyItems.js       gambar public/images/hobby-items/<slug>.webp
 *   npcs         → src/data/npcs/npcs.js                   gambar public/images/npcs/<slug>.webp
 * (Folder data Items bernama hobbyItems karena src/data/items.js sudah dipakai untuk benda bersama.)
 *
 * Pemakaian:
 *   node scripts/heartodex-sync-extra.mjs --kind achievements           dry run: ambil, validasi, laporkan
 *   node scripts/heartodex-sync-extra.mjs --kind npcs --write           tulis data dan gambar
 *
 * Aturan:
 * - Halaman & gambar diambil lewat scripts/lib/heartodex-fetch.mjs (jeda 2 detik, cache di scripts/.cache/heartodex,
 *   sama dengan heartodex-sync.mjs).
 * - Tiga katalog ini tidak punya field yang diisi tangan di file data, jadi file datanya ditulis ulang seluruhnya dari
 *   sumber + terjemahan Indonesia di scripts/translations/<kind>.id.json (teks, atau { text, sourceLang } kalau teks
 *   asli di situs EN bukan bahasa Inggris). Ubah terjemahan di file itu, bukan di file data. Gambar yang sudah ada
 *   tidak ditimpa. Deskripsi Thai (<kind>.th.json), teks Inggris (english-descriptions.mjs), dan isian manual
 *   (data/manual/descriptions.json) tidak disentuh.
 * - Data yang tidak ada di sumber diisi null + TODO, tidak pernah ditebak. Semua entri berada di section Base Game
 *   karena halaman daftar Heartodex untuk ketiga katalog ini tidak punya pembagian section event.
 * - Achievements: nama, kategori hobi, tujuan (Objective, disimpan sebagai description/descriptionOriginal supaya
 *   terjemahan & isian manual memakai jalur yang sama dengan katalog lain), dan hadiah (title & kategorinya). Bagian
 *   "Pro Tips" (tulisan editor Heartodex, bukan data game) tidak diambil. Achievement yang di sumber bernama "Hidden
 *   Achievement N" dengan title "?" ditandai `hidden: true`; title-nya null + TODO.
 * - Items: kategori hobi, deskripsi (About), dan harga (ITEM PRICE). Penjual tidak disimpan di sini: halaman Hatowiki
 *   menghitungnya dari daftar "Items for sale" NPC. Penjual di halaman item ("SOLD BY") dan harga di daftar NPC dicek
 *   silang dan perbedaannya dilaporkan.
 * - NPCs: peran, deskripsi, hadiah favorit (label apa adanya), lokasi dengan zona peta yang sudah ada di
 *   src/data/wildlife/locationZones.js, pin posisi NPC (dicek silang dengan marker `flymark` di skrip peta), dan daftar
 *   barang yang dijual beserta harganya. Barang dicocokkan ke katalog Items lewat namanya (tautan di sumber memakai slug
 *   Spanyol); yang tidak cocok disimpan tanpa id benda dan dilaporkan. Harga 0 di daftar NPC = tidak dicantumkan
 *   (halaman item-nya juga tanpa ITEM PRICE), jadi null + TODO.
 * - Setelah menulis: `node scripts/english-descriptions.mjs` dan `node scripts/manual-descriptions.mjs`.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { ROOT, withAppModules } from './lib/app-modules.mjs'
import { BASE_URL, fetchStats, getCached } from './lib/heartodex-fetch.mjs'
import { parseMapMarkers } from './heartodex-sync.mjs'

const MAIN_MAP = 'map_eA0M2.webp'
const MAIN_MAP_IMAGE = '/images/maps/heartopia-map.webp'
const TODAY = new Date().toLocaleDateString('sv')

const KINDS = {
  achievements: {
    segment: 'achievements',
    label: 'achievement',
    dataFile: 'src/data/achievements/achievements.js',
    imageDir: 'public/images/achievements',
    imageUrl: '/images/achievements',
    fieldOrder: ['slug', 'name', 'category', 'section', 'description', 'descriptionOriginal', 'hidden', 'rewardTitle', 'rewardCategory', 'image', 'imageSize', 'source'],
  },
  items: {
    segment: 'items',
    label: 'item',
    dataFile: 'src/data/hobbyItems/hobbyItems.js',
    imageDir: 'public/images/hobby-items',
    imageUrl: '/images/hobby-items',
    fieldOrder: ['slug', 'name', 'category', 'section', 'description', 'descriptionOriginal', 'descriptionSourceLang', 'price', 'image', 'imageSize', 'source'],
  },
  npcs: {
    segment: 'npcs',
    label: 'NPC',
    dataFile: 'src/data/npcs/npcs.js',
    imageDir: 'public/images/npcs',
    imageUrl: '/images/npcs',
    fieldOrder: [
      'slug', 'name', 'category', 'section', 'role', 'description', 'descriptionOriginal', 'favoriteGifts', 'locations', 'mapPin',
      'locationImage', 'shop', 'image', 'imageSize', 'source',
    ],
  },
}

// Label peran yang di situs EN heartodex masih setengah Spanyol: diterjemahkan mengikuti pola peran NPC lain, ditandai TODO.
const ROLE_FIXES = {
  'Mentor de Driving': {
    role: 'Driving mentor',
    todo: 'peran di sumber setengah Spanyol ("Mentor de Driving"); diterjemahkan mengikuti pola "Cooking mentor", "Fishing mentor", "Gardening mentor"',
  },
}

// ---------- argumen ----------
function parseArgs(argv) {
  const args = { kind: null, write: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--write') args.write = true
    else if (argv[i] === '--kind') args.kind = argv[++i]
    else throw new Error(`Argumen tidak dikenal: ${argv[i]}`)
  }
  if (!KINDS[args.kind]) throw new Error(`Tentukan --kind: ${Object.keys(KINDS).join(' | ')}.`)
  return args
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
const between = (html, start, end) => {
  const from = html.indexOf(start)
  if (from < 0) return null
  const to = end ? html.indexOf(end, from + start.length) : -1
  return html.slice(from + start.length, to < 0 ? undefined : to)
}
const spans = (html) => [...html.replace(/<svg[\s\S]*?<\/svg>/g, '').matchAll(/<span[^>]*>([^<]*)<\/span>/g)].map((match) => decode(match[1])).filter(Boolean)
// "3.000" → 3000 (titik = ribuan, seperti angka lain di heartodex).
const parseAmount = (raw) => (/^[\d.]+$/.test(raw ?? '') ? Number(raw.replace(/\./g, '')) : null)

// Halaman daftar: slug urut tampil (satu kartu per entri).
function parseList(html, segment) {
  const slugs = []
  for (const match of html.matchAll(new RegExp(`<a href="/en/${segment}/([^"/]+)"([^>]*)>`, 'g'))) {
    if (match[2].includes('data-name=') && !slugs.includes(match[1])) slugs.push(match[1])
  }
  return slugs
}

// Bagian umum halaman detail: nama, chip kategori (emoji + label), teks kecil di bawah nama, gambar utama.
function parseHead(html) {
  const main = between(html, '<main', '</main>') ?? html
  const h1Index = main.indexOf('<h1')
  const name = decode(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(main)?.[1]?.replace(/<[^>]+>/g, '') ?? '')
  const chips = [...main.slice(0, h1Index).matchAll(/brightness-110">\s*([^<]*?)\s*<\/span>\s*<span>([^<]+)<\/span>/g)].map((match) => ({
    emoji: match[1].trim(),
    label: decode(match[2]),
  }))
  const afterH1 = main.slice(main.indexOf('</h1>') + 5)
  const subtitle = /^\s*<p[^>]*>([\s\S]*?)<\/p>/.exec(afterH1)?.[1]
  const imageSrc = /<aside[\s\S]*?<img src="(\/_astro\/[^"]+)"/.exec(main)?.[1] ?? null
  return { main, name, chips, subtitle: subtitle ? decode(subtitle) : null, afterH1, imageSrc }
}

// Teks blok setelah judul h2 (mis. "About", "Objective"): isi div whitespace-pre-line pertama sesudahnya.
function blockText(main, heading) {
  const start = main.search(new RegExp(`<svg[\\s\\S]*?</svg>\\s*${heading}\\s*</h2>`))
  if (start < 0) return { found: false, text: null }
  const rest = main.slice(start)
  const match = /whitespace-pre-line[^>]*>([\s\S]*?)<\/div>/.exec(rest)
  const text = match ? decode(match[1].replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, ' ')) : ''
  return { found: true, text: text || null }
}

function parseAchievement(html) {
  const head = parseHead(html)
  const objective = blockText(head.main, 'Objective')
  const rewardHtml = between(head.main, 'Achievement Reward', 'Pro Tips') ?? ''
  const rewardSpans = spans(rewardHtml)
  const valueAfter = (label) => {
    const index = rewardSpans.findIndex((text) => text.toLowerCase() === label)
    return index >= 0 ? rewardSpans[index + 1] ?? null : null
  }
  return {
    ...head,
    objective: objective.text,
    rewardTitle: valueAfter('unlocked title')?.replace(/^"|"$/g, '') ?? null,
    rewardCategory: valueAfter('category'),
    hasProTips: head.main.includes('Pro Tips'),
  }
}

function parseHobbyItem(html) {
  const head = parseHead(html)
  const about = blockText(head.main, 'About')
  const priceRaw = /ITEM PRICE\s*<\/span>\s*<span[^>]*>(?:\s*<svg[\s\S]*?<\/svg>)?\s*([\d.]+)\s*</.exec(head.main)?.[1] ?? null
  const seller = /<a href="\/npcs\/([^"]+)"[\s\S]*?SOLD BY\s*<\/span>\s*<span[^>]*>([^<]*)<\/span>/.exec(head.main)
  return { ...head, about: about.text, priceRaw, seller: seller ? { slug: seller[1], name: decode(seller[2]) } : null }
}

function parseNpc(html) {
  const head = parseHead(html)
  const about = blockText(head.main, 'About')
  const giftsHtml = between(head.main, 'Favorite Gifts', '</div> </div> </div>') ?? ''
  const gifts = spans(giftsHtml).filter((text) => text.toLowerCase() !== 'none')

  const mapLink = /href="\/en\/map\?([^"]+)"/.exec(html)?.[1]
  const mapParams = mapLink ? new URLSearchParams(decode(mapLink)) : null
  const locationLabel = /Central Label Layer -->\s*<div[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>/.exec(html)?.[1]
  const mapHtml = between(html, '<!-- Map Background -->', '<!-- Central Label Layer -->') ?? ''
  const baseMap = /<image href="\/_astro\/([^"/]+?\.webp)"/.exec(mapHtml)?.[1] ?? null
  const maskMatch = /<mask id="(zm-[^"]+)">([\s\S]*?)<\/mask>/.exec(mapHtml)
  const polygons = maskMatch ? [...maskMatch[2].matchAll(/points="([^"]+)"/g)].map((match) => roundPoints(match[1])) : []
  const pins = [...mapHtml.matchAll(/<g transform="translate\((-?[\d.]+),\s*(-?[\d.]+)\)">([\s\S]*?)<\/g>/g)].map((match) => ({
    x: Number(match[1]),
    y: Number(match[2]),
    label: decode(/<text[^>]*>([\s\S]*?)<\/text>/.exec(match[3])?.[1] ?? ''),
  }))

  const saleHtml = between(head.main, 'Items for sale', null) ?? ''
  const shop = [...saleHtml.matchAll(/<a href="\/en\/([a-z-]+)\/([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((match) => {
    const [name, price] = spans(match[3])
    return { segment: match[1], sourceSlug: match[2], name, priceRaw: price ?? null }
  })

  return {
    ...head,
    about: about.text,
    gifts,
    locationLabel: locationLabel ? decode(locationLabel) : null,
    flymark: mapParams?.get('flymark') ?? null,
    flymap: mapParams?.get('flymap') ?? null,
    zoneId: maskMatch?.[1] ?? null,
    polygons,
    baseMap,
    pins,
    shop,
  }
}

const roundPoints = (points) =>
  points
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map((n) => Number(n).toFixed(1)).join(','))
    .join(' ')

// Tabel lokasi {id, nombre_en} di skrip peta: sumber huruf besar-kecil nama lokasi (label halaman detail kapital semua).
function parseMapLocations(script) {
  const names = []
  for (const match of script.matchAll(/\{id:(\d+),nombre:"[^"]*",nombre_en:"([^"]*)",nombre_pt:"[^"]*",emoji:"[^"]*"\}/g)) names.push(match[2].trim())
  return names
}

function pointInPolygon([x, y], points) {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i]
    const [xj, yj] = points[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
const parsePoints = (points) => points.split(' ').map((pair) => pair.split(',').map(Number))

// ---------- gambar ----------
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

async function prepareImage(kind, slug, imageSrc) {
  const file = path.join(ROOT, kind.imageDir, `${slug}.webp`)
  const image = `${kind.imageUrl}/${slug}.webp`
  if (existsSync(file)) return { image, imageSize: webpSize(await readFile(file)), bytes: null, file, status: 'sudah ada' }
  if (!imageSrc) return { image: null, imageSize: null, bytes: null, file, status: 'tidak ada', todo: 'gambar tidak ditemukan di sumber' }
  const bytes = await getCached(`${BASE_URL}${imageSrc}`, { binary: true })
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') {
    return { image: null, imageSize: null, bytes: null, file, status: 'bukan WebP', todo: `berkas di sumber bukan WebP (${imageSrc})` }
  }
  return { image, imageSize: webpSize(bytes), bytes, file, status: 'diunduh' }
}

// ---------- menulis sumber JS ----------
const jsString = (value) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`
function literal(value) {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'string') return jsString(value)
  if (Array.isArray(value)) return `[${value.map(literal).join(', ')}]`
  return `{ ${Object.entries(value).map(([key, item]) => `${key}: ${literal(item)}`).join(', ')} }`
}

// `todos[key]` = komentar TODO di baris field itu; daftar objek (lokasi, barang dijual) satu objek per baris dengan
// TODO per baris di `todos[`${key}Items`][i]`.
function entrySource(entry, todos, fieldOrder) {
  const lines = fieldOrder.filter((key) => entry[key] !== undefined).map((key) => {
    const todo = todos[key] ? ` // TODO: ${todos[key]}` : ''
    if ((key === 'locations' || key === 'shop') && entry[key].length) {
      const rows = entry[key].map((item, i) => {
        const itemTodo = todos[`${key}Items`]?.[i] ? ` // TODO: ${todos[`${key}Items`][i]}` : ''
        return `      ${literal(item)},${itemTodo}`
      })
      return [`    ${key}: [${todo}`, ...rows, '    ],'].join('\n')
    }
    return `    ${key}: ${literal(entry[key])},${todo}`
  })
  return `  {\n${lines.join('\n')}\n  }`
}

async function readTranslations(kindSlug) {
  const file = path.join(ROOT, `scripts/translations/${kindSlug}.id.json`)
  if (!existsSync(file)) return {}
  const table = JSON.parse(await readFile(file, 'utf8'))
  delete table._meta
  return table
}

function translationOf(table, slug) {
  const value = table[slug]
  const text = (typeof value === 'string' ? value : value?.text)?.trim() || null
  const sourceLang = typeof value === 'object' && value?.sourceLang ? value.sourceLang : undefined
  return { text, sourceLang }
}

function pickCategory(head, categoryMap, todos, notes) {
  if (head.chips.length === 1) {
    const { label, emoji } = head.chips[0]
    if (categoryMap && categoryMap[label] && categoryMap[label].emoji !== emoji) notes.push(`ikon kategori "${label}" beda: ${emoji}`)
    return label
  }
  todos.category = head.chips.length ? `lebih dari satu kategori di sumber: ${head.chips.map((chip) => chip.label).join(', ')}` : 'kategori tidak ada di sumber'
  return null
}

// ---------- per katalog ----------
async function buildAchievements(kind, app) {
  const slugs = parseList(await getCached(`${BASE_URL}/en/achievements`), 'achievements')
  const translations = await readTranslations('achievements')
  const results = []
  for (const slug of slugs) {
    const source = `${BASE_URL}/en/achievements/${slug}`
    const detail = parseAchievement(await getCached(source))
    const todos = {}
    const notes = []
    const category = pickCategory(detail, app.achievementCategories, todos, notes)
    const hidden = /^Hidden Achievement \d+$/i.test(detail.name) || detail.rewardTitle === '?'
    const rewardTitle = detail.rewardTitle && detail.rewardTitle !== '?' ? detail.rewardTitle : null
    if (!rewardTitle) todos.rewardTitle = detail.rewardTitle === '?' ? 'title hadiah dirahasiakan di sumber (tertulis "?")' : 'title hadiah tidak ada di sumber'
    if (!detail.rewardCategory) todos.rewardCategory = 'kategori hadiah tidak ada di sumber'
    if (detail.subtitle && detail.subtitle !== detail.rewardTitle) notes.push(`teks di bawah nama "${detail.subtitle}" ≠ title hadiah "${detail.rewardTitle}"`)
    if (detail.hasProTips) notes.push('bagian Pro Tips tidak diambil (tulisan editor Heartodex)')
    const descriptionOriginal = detail.objective
    if (!descriptionOriginal) todos.descriptionOriginal = 'tujuan (Objective) tidak ada di sumber'
    const translation = translationOf(translations, slug)
    if (!translation.text) todos.description = descriptionOriginal ? 'terjemahan Indonesia belum ada' : 'tujuan tidak ada di sumber'
    const image = await prepareImage(kind, slug, detail.imageSrc)
    if (image.todo) todos.image = image.todo
    if (hidden) notes.push(`achievement tersembunyi (nama "${detail.name}", title "${detail.rewardTitle}")`)
    results.push({
      entry: {
        slug,
        name: detail.name,
        category,
        section: 'Base Game',
        description: translation.text,
        descriptionOriginal,
        ...(hidden ? { hidden: true } : {}),
        rewardTitle,
        rewardCategory: detail.rewardCategory,
        image: image.image,
        imageSize: image.imageSize,
        source,
      },
      todos,
      notes,
      image,
    })
  }
  return results
}

async function buildHobbyItems(kind, app) {
  const slugs = parseList(await getCached(`${BASE_URL}/en/items`), 'items')
  const translations = await readTranslations('items')
  const results = []
  for (const slug of slugs) {
    const source = `${BASE_URL}/en/items/${slug}`
    const detail = parseHobbyItem(await getCached(source))
    const todos = {}
    const notes = []
    const category = pickCategory(detail, app.itemCategories, todos, notes)
    const descriptionOriginal = detail.about
    if (!descriptionOriginal) todos.descriptionOriginal = 'deskripsi tidak ada di sumber (blok About kosong)'
    const translation = translationOf(translations, slug)
    if (!translation.text && descriptionOriginal) todos.description = 'terjemahan Indonesia belum ada'
    else if (!translation.text) todos.description = 'deskripsi tidak ada di sumber'
    const price = parseAmount(detail.priceRaw)
    if (price == null) todos.price = 'harga (ITEM PRICE) tidak ada di sumber'
    if (detail.seller) notes.push(`halaman item: dijual oleh ${detail.seller.name} (/npcs/${detail.seller.slug})`)
    const image = await prepareImage(kind, slug, detail.imageSrc)
    if (image.todo) todos.image = image.todo
    results.push({
      entry: {
        slug,
        name: detail.name,
        category,
        section: 'Base Game',
        description: translation.text,
        descriptionOriginal,
        descriptionSourceLang: translation.sourceLang,
        price,
        image: image.image,
        imageSize: image.imageSize,
        source,
      },
      todos,
      notes,
      image,
      seller: detail.seller,
    })
  }
  return results
}

async function buildNpcs(kind, app) {
  const slugs = parseList(await getCached(`${BASE_URL}/en/npcs`), 'npcs')
  const translations = await readTranslations('npcs')
  const mapPage = await getCached(`${BASE_URL}/en/map`)
  const mapScriptPath = /src="(\/_astro\/HeartopiaMap[^"]+\.js)"/.exec(mapPage)?.[1]
  const mapScript = mapScriptPath ? await getCached(`${BASE_URL}${mapScriptPath}`) : ''
  const markers = parseMapMarkers(mapScript)
  const mapNames = parseMapLocations(mapScript)
  const itemsBySlug = new Map(app.hobbyItems.map((item) => [item.slug, item]))
  const itemsByName = new Map(app.hobbyItems.map((item) => [item.name.toLowerCase(), item]))
  const results = []
  for (const slug of slugs) {
    const source = `${BASE_URL}/en/npcs/${slug}`
    const detail = parseNpc(await getCached(source))
    const todos = {}
    const notes = []
    const category = pickCategory(detail, app.npcCategories, todos, notes)

    let role = detail.subtitle
    const roleFix = ROLE_FIXES[role]
    if (roleFix) {
      role = roleFix.role
      todos.role = roleFix.todo
    }
    if (!role) todos.role = 'peran tidak ada di sumber'

    const descriptionOriginal = detail.about
    if (!descriptionOriginal) todos.descriptionOriginal = 'deskripsi tidak ada di sumber (blok About kosong)'
    const translation = translationOf(translations, slug)
    if (!translation.text) todos.description = descriptionOriginal ? 'terjemahan Indonesia belum ada' : 'deskripsi tidak ada di sumber'
    if (!detail.gifts.length) notes.push('hadiah favorit: None di sumber')

    // Lokasi: label kapital di peta halaman detail → nama dari tabel lokasi peta; zona = zona yang sudah ada dengan
    // poligon yang sama persis.
    const locations = []
    const locationTodos = []
    if (!detail.locationLabel) todos.locations = 'lokasi tidak ada di sumber'
    else {
      const name = mapNames.find((candidate) => candidate.toUpperCase() === detail.locationLabel.toUpperCase()) ?? null
      const zoneKey = Object.entries(app.zones).find(([, zone]) => zone.polygons.length === detail.polygons.length && zone.polygons.every((points, i) => points === detail.polygons[i]))?.[0] ?? null
      locations.push({ name: name ?? detail.locationLabel, zone: zoneKey })
      const problems = []
      if (!name) problems.push(`verifikasi huruf besar-kecil; sumber hanya menampilkan "${detail.locationLabel}"`)
      if (!zoneKey) problems.push(`zona peta (${detail.zoneId}) belum ada di locationZones.js`)
      locationTodos.push(problems.join('; ') || null)
    }
    if (locationTodos.some(Boolean)) todos.locationsItems = locationTodos

    // Pin posisi NPC: pin di peta halaman detail, dicek silang dengan marker flymark. Peta dasar selain peta utama
    // (mis. Whalefall Canyon) tidak cocok dengan zona lokasinya, jadi pin-nya tidak dipakai.
    let mapPin = null
    const pin = detail.pins[0]
    const marker = detail.flymark ? markers.get(detail.flymark) : null
    if (detail.baseMap && detail.baseMap !== MAIN_MAP) {
      todos.mapPin = `pin di sumber ada di peta lain (${detail.baseMap}${detail.flymap ? `, flymap=${detail.flymap}` : ''}), tidak cocok dengan zona ${locations[0]?.name ?? '?'} di peta utama`
    } else if (pin) {
      mapPin = { x: Math.round(pin.x * 10) / 10, y: Math.round(pin.y * 10) / 10 }
      if (!marker) notes.push(`marker flymark=${detail.flymark} tidak ditemukan di skrip peta`)
      else if (Math.abs(marker.x - pin.x) > 0.01 || Math.abs(marker.y - pin.y) > 0.01) notes.push(`pin (${pin.x}, ${pin.y}) ≠ marker flymark=${detail.flymark} (${marker.x}, ${marker.y})`)
    } else if (marker) {
      mapPin = { x: Math.round(marker.x * 10) / 10, y: Math.round(marker.y * 10) / 10 }
      notes.push(`pin tidak ada di halaman detail; dipakai marker flymark=${detail.flymark}`)
    } else {
      todos.mapPin = 'posisi NPC tidak ada di sumber (peta memakai zona lokasi)'
    }
    if (mapPin && locations[0]?.zone) {
      const inside = app.zones[locations[0].zone].polygons.some((points) => pointInPolygon([mapPin.x, mapPin.y], parsePoints(points)))
      notes.push(`pin (${mapPin.x}, ${mapPin.y}) ${inside ? 'di dalam' : 'DI LUAR'} zona ${locations[0].name}`)
    }
    const locationImage = locations.some((location) => location.zone) || mapPin ? MAIN_MAP_IMAGE : null

    // Barang yang dijual: dicocokkan ke katalog Items lewat nama.
    const shop = []
    const shopTodos = []
    for (const offer of detail.shop) {
      const item = offer.segment === 'items' ? itemsByName.get(offer.name.toLowerCase()) ?? itemsBySlug.get(offer.sourceSlug) : null
      const price = parseAmount(offer.priceRaw)
      const problems = []
      if (!item) problems.push(`belum ada di katalog Hatowiki (tautan sumber /en/${offer.segment}/${offer.sourceSlug})`)
      if (!price) problems.push(`harga tidak dicantumkan (daftar NPC menulis "${offer.priceRaw ?? ''}")`)
      if (item && price && item.price != null && item.price !== price) notes.push(`harga ${offer.name}: ${price} di daftar NPC ≠ ${item.price} di halaman item`)
      shop.push({ item: item ? `items/${item.slug}` : null, name: offer.name, price: price || null })
      shopTodos.push(problems.join('; ') || null)
    }
    if (shopTodos.some(Boolean)) todos.shopItems = shopTodos

    const image = await prepareImage(kind, slug, detail.imageSrc)
    if (image.todo) todos.image = image.todo
    results.push({
      entry: {
        slug,
        name: detail.name,
        category,
        section: 'Base Game',
        role,
        description: translation.text,
        descriptionOriginal,
        favoriteGifts: detail.gifts,
        locations,
        mapPin,
        locationImage,
        shop,
        image: image.image,
        imageSize: image.imageSize,
        source,
      },
      todos,
      notes,
      image,
    })
  }
  return results
}

// Penjual di halaman item ("SOLD BY") dibandingkan dengan daftar "Items for sale" NPC.
function crossCheckSellers(itemResults, npcs) {
  const notes = []
  for (const { entry, seller } of itemResults) {
    const sellers = npcs.filter((npc) => npc.shop.some((offer) => offer.item === `items/${entry.slug}`))
    const names = sellers.map((npc) => npc.name)
    if (!seller && sellers.length) notes.push(`${entry.name}: halaman item tanpa SOLD BY, dijual ${names.join(', ')} menurut data NPC`)
    else if (seller && !sellers.some((npc) => npc.slug === seller.slug)) {
      notes.push(`${entry.name}: halaman item menulis "${seller.name}" (/npcs/${seller.slug}), data NPC: ${names.join(', ') || 'tidak ada'}`)
    }
  }
  return notes
}

// ---------- utama ----------
async function loadApp(load) {
  const [{ ACHIEVEMENT_CATEGORIES }, { HOBBY_ITEM_CATEGORIES }, { NPC_CATEGORIES }, { LOCATION_ZONES }] = await Promise.all([
    load('/src/data/achievements/categories.js'),
    load('/src/data/hobbyItems/categories.js'),
    load('/src/data/npcs/categories.js'),
    load('/src/data/wildlife/locationZones.js'),
  ])
  const hobbyItems = existsSync(path.join(ROOT, KINDS.items.dataFile)) ? (await load('/src/data/hobbyItems/hobbyItems.js')).hobbyItems : []
  const npcs = existsSync(path.join(ROOT, KINDS.npcs.dataFile)) ? (await load('/src/data/npcs/npcs.js')).npcs : []
  const validators = {
    achievements: (await load('/src/data/achievements/validateAchievements.js')).findAchievementProblems,
    items: (await load('/src/data/hobbyItems/validateHobbyItems.js')).findHobbyItemProblems,
    npcs: (await load('/src/data/npcs/validateNpcs.js')).findNpcProblems,
  }
  return {
    achievementCategories: ACHIEVEMENT_CATEGORIES,
    itemCategories: HOBBY_ITEM_CATEGORIES,
    npcCategories: NPC_CATEGORIES,
    zones: LOCATION_ZONES,
    hobbyItems,
    npcs,
    validators,
  }
}

// Kepala file data (komentar & typedef) diambil dari file yang sudah ada; hanya array datanya yang ditulis ulang.
function renderDataFile(original, exportName, totalName, total, results, fieldOrder) {
  const start = original.indexOf(`export const ${exportName} = [`)
  const end = original.indexOf('\n]\n', start)
  if (start < 0 || end < 0) throw new Error(`Array "${exportName}" tidak ditemukan di file data`)
  const body = results.map(({ entry, todos }) => entrySource(entry, todos, fieldOrder)).join(',\n')
  const head = original
    .slice(0, start)
    .replace(new RegExp(`export const ${totalName} = \\d+`), `export const ${totalName} = ${total}`)
    .replace(/\(diperiksa \d{4}-\d{2}-\d{2}\)/, `(diperiksa ${TODAY})`)
  return `${head}export const ${exportName} = [\n${body},\n${original.slice(end + 1)}`
}

const EXPORTS = {
  achievements: ['achievements', 'ACHIEVEMENTS_TOTAL_IN_GAME'],
  items: ['hobbyItems', 'HOBBY_ITEMS_TOTAL_IN_GAME'],
  npcs: ['npcs', 'NPCS_TOTAL_IN_GAME'],
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const kind = KINDS[args.kind]
  const report = await withAppModules(async (load) => {
    const app = await loadApp(load)
    const builders = { achievements: buildAchievements, items: buildHobbyItems, npcs: buildNpcs }
    const results = await builders[args.kind](kind, app)
    const extraNotes = args.kind === 'items' && app.npcs.length ? crossCheckSellers(results, app.npcs) : []
    const problems = app.validators[args.kind](results.map((result) => result.entry))
    return { results, extraNotes, problems }
  })
  const { results, extraNotes, problems } = report

  console.log(`\n${results.length} ${kind.label} di https://www.heartodex.com/en/${kind.segment}`)
  for (const { entry, todos, notes, image } of results) {
    const todoList = Object.entries(todos).flatMap(([key, value]) => (Array.isArray(value) ? value.filter(Boolean).map((text) => `${key}: ${text}`) : [`${key}: ${value}`]))
    console.log(`• ${entry.slug} — ${entry.name} | ${entry.category ?? '-'} | gambar: ${image.status}`)
    for (const text of todoList) console.log(`    TODO ${text}`)
    for (const text of notes) console.log(`    catatan: ${text}`)
  }
  for (const text of extraNotes) console.log(`• cek silang penjual: ${text}`)
  if (problems.length) {
    for (const { slug, problems: list } of problems) console.error(`✗ ${slug}: ${list.join('; ')}`)
    throw new Error('Validasi gagal; tidak ada yang ditulis.')
  }
  console.log(`Validasi lulus. Halaman: ${fetchStats.network} diambil, ${fetchStats.cache} dari cache.`)

  if (!args.write) {
    console.log('Dry run: tambahkan --write untuk menulis data dan gambar.')
    return
  }
  const dataFile = path.join(ROOT, kind.dataFile)
  const original = await readFile(dataFile, 'utf8')
  const [exportName, totalName] = EXPORTS[args.kind]
  await writeFile(dataFile, renderDataFile(original.replace(/\r\n/g, '\n'), exportName, totalName, results.length, results, kind.fieldOrder))
  let downloaded = 0
  for (const { image } of results) {
    if (!image.bytes) continue
    await mkdir(path.dirname(image.file), { recursive: true })
    await writeFile(image.file, image.bytes, { flag: 'wx' })
    downloaded++
  }
  console.log(`Ditulis: ${kind.dataFile} (${results.length} entri), ${downloaded} gambar baru.`)
  console.log('Perbarui juga: node scripts/english-descriptions.mjs && node scripts/manual-descriptions.mjs')
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
