#!/usr/bin/env node
/**
 * Uji dua bahasa (Indonesia & Thai) di Chrome headless (lewat Chrome DevTools Protocol):
 * - Routing: versi Indonesia tanpa awalan, versi Thai di /th dengan slug yang sama; semua halaman (beranda, hub, daftar,
 *   detail, 404) berbahasa Thai (lang="th", judul & deskripsi dasar situs, tanpa teks antarmuka Indonesia, semua tautan
 *   internal tetap di /th); /id/... diarahkan ke alamat tanpa awalan; rewrite vercel.json melayani /th/... tapi tidak
 *   /api; navigasi, tombol kembali, dan pencarian global tetap di /th.
 * - Teks & data: kunci teks antarmuka id & th sama; deskripsi Thai diambil dari scripts/translations/<kind>.th.json
 *   (lengkap untuk semua entri yang punya deskripsi Indonesia, tercatat sebagai terjemahan otomatis yang belum ditinjau),
 *   deskripsi yang disembunyikan di versi Indonesia juga tersembunyi di Thai; angka th-TH dengan angka Arab; font Thai
 *   (Anuphan) hanya dimuat di /th; teks & font Thai tidak dimuat sama sekali untuk pengunjung biasa di versi Indonesia.
 * - Pemilih bahasa: bola dunia di toolbar (disclosure, keyboard, Escape) dan tautan di footer, membuka halaman yang sama
 *   termasuk filter di URL, pilihan diingat (alamat tanpa awalan diarahkan ke /th untuk yang memilih Thai).
 * - Notifikasi saran bahasa: muncul di versi Indonesia untuk bahasa browser th/lo atau negara TH/LA dari api/geo.js
 *   (dicegat di uji), dan di versi Thai untuk bahasa browser id; isi & atribut lang, dialog non-modal di pojok kiri
 *   bawah yang bisa difokus, Escape & tombol X menutup dan diingat, memilih bahasa (tombol, pemilih) menutupnya,
 *   animasi masuk mengikuti prefers-reduced-motion, footer diberi ruang supaya konten tidak tertutup; console bersih.
 *
 * Pemakaian (dev server harus sudah jalan):
 *   npm run dev
 *   node scripts/qa/i18n.test.mjs          → lebar 1280
 *   node scripts/qa/i18n.test.mjs 390      → lebar tertentu
 *
 * Variabel lingkungan: BASE_URL (bawaan http://localhost:5173), CHROME_PATH (lokasi Chrome/Edge).
 */
import { readFileSync } from 'node:fs'
import { openTab, sleep, startChrome } from './cdp.mjs'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173'
const WIDTHS = process.argv.slice(2).map(Number).filter(Boolean)
const PORT = 9950 + Math.floor(Math.random() * 40)
const ROOT = new URL('../../', import.meta.url)

// Teks yang diharapkan, ditulis ulang di sini supaya uji tidak memakai kode aplikasi untuk memeriksa dirinya sendiri.
const TH_TITLE = 'Hatowiki | วิกิชุมชน Heartopia'
const ID_TITLE = 'Hatowiki | Wiki Komunitas Heartopia'
const SUGGEST_TH = {
  title: 'สวัสดี! 👋',
  text: 'Hatowiki มีเวอร์ชันภาษาไทยด้วยนะ อยากเปลี่ยนเป็นภาษาไทยไหม?',
  english: 'Hatowiki is also available in Thai.',
  button: 'เปลี่ยนเป็นภาษาไทย',
  close: 'ปิด',
}
const SUGGEST_ID = {
  title: 'Halo! 👋',
  english: 'Hatowiki is also available in Indonesian.',
  button: 'Pakai bahasa Indonesia',
  close: 'Tutup',
}
// Teks antarmuka Indonesia yang tidak boleh tersisa di halaman Thai (nama entri, lokasi, istilah game tetap Inggris).
const ID_UI_WORDS = /\b(Beranda|Lihat semua|Lihat daftar|Kembali|Harga jual|Harga beli|Nilai jual|Lokasi|Cuaca|Menampilkan|Deskripsi|Sumber data|dari|membuka tab baru|Bahan|Waktu|Urutan|Filter Lanjutan|Semua|Resep|Ikan|Serangga|Burung|Hewan|Tanaman|koin|energi|Syarat level|Toko)\b/
const THAI = /[฀-๿]/
const THAI_DIGITS = /[๐-๙]/
const ROUTES = [
  '/',
  '/wildlife',
  '/wildlife/fish',
  '/wildlife/fish/sea-bass',
  '/wildlife/bugs',
  '/wildlife/bugs/blue-morpho',
  '/wildlife/birds/snowy-owl',
  '/wildlife/animals',
  '/wildlife/animals/capybara',
  '/recipes',
  '/recipes/tiramisu',
  '/crops',
  '/crops/tomato',
  '/collectibles',
  '/collectibles/apple',
  '/ingredients',
  '/ingredients/egg',
  '/nope',
  '/wildlife/fish/nope',
]
const KINDS = {
  fish: '/src/data/wildlife/fish.js',
  bugs: '/src/data/wildlife/bugs.js',
  birds: '/src/data/wildlife/birds.js',
  animals: '/src/data/wildlife/animals.js',
  recipes: '/src/data/recipes/recipes.js',
  crops: '/src/data/crops/crops.js',
  collectibles: '/src/data/collectibles/collectibles.js',
  ingredients: '/src/data/ingredients/ingredients.js',
}

async function runSuite(width) {
  const results = []
  const check = (name, ok, detail) => {
    results.push(Boolean(ok))
    console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${name}${detail ? `  — ${detail}` : ''}`)
  }
  const tabs = []

  /**
   * Tab baru dengan penyimpanan kosong. `languages` = navigator.languages palsu; `geo` = negara yang dikembalikan
   * /api/geo (dicegat), undefined = tidak dicegat (di dev server fungsinya tidak ada); `reducedMotion`.
   */
  async function freshTab({ languages = ['en-US', 'en'], geo, reducedMotion = false } = {}) {
    const tab = await openTab(PORT, width)
    tabs.push(tab)
    const { send, evaluate } = tab
    await send('Emulation.setEmulatedMedia', {
      features: [
        { name: 'prefers-color-scheme', value: 'light' },
        { name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' },
      ],
    })
    await send('Storage.clearDataForOrigin', { origin: BASE_URL, storageTypes: 'local_storage,session_storage' })
    const list = JSON.stringify(languages)
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `Object.defineProperty(navigator, 'languages', { get: () => ${list} }); Object.defineProperty(navigator, 'language', { get: () => ${list}[0] })`,
    })
    tab.geoRequests = 0
    if (geo !== undefined) {
      await send('Fetch.enable', { patterns: [{ urlPattern: '*/api/geo*' }] })
      tab.on('Fetch.requestPaused', ({ requestId }) => {
        tab.geoRequests++
        send('Fetch.fulfillRequest', {
          requestId,
          responseCode: 200,
          responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
          body: Buffer.from(JSON.stringify({ country: geo })).toString('base64'),
        })
      })
    }
    tab.go = async (route, wait = 1800) => {
      await send('Page.navigate', { url: BASE_URL + route })
      await sleep(wait)
    }
    tab.waitFor = async (expression, timeout = 5000) => {
      const start = Date.now()
      while (Date.now() - start < timeout) {
        if (await evaluate(`(() => { try { return !!(${expression}) } catch { return false } })()`)) return true
        await sleep(150)
      }
      return false
    }
    tab.press = async (key, code, vk) => {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk })
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk })
      await sleep(200)
    }
    tab.url = () => evaluate('location.pathname + location.search')
    return tab
  }

  // ================= 1. Routing /th, teks antarmuka, data =================
  const main = await freshTab()
  const { evaluate } = main

  await main.go('/')
  const idHome = await evaluate(`({ lang: document.documentElement.lang, title: document.title, font: !!document.getElementById('font-th'),
    thaiLoaded: performance.getEntriesByType('resource').some((r) => /messages\\/th\\.json|\\.th\\.json|Anuphan|anuphan/i.test(r.name)) })`)
  check('Versi Indonesia (/) tetap lang="id" dengan judul dasar Indonesia', idHome.lang === 'id' && idHome.title === ID_TITLE, `${idHome.lang} · ${idHome.title}`)
  check('Versi Indonesia tidak memuat teks, deskripsi, maupun font Thai (pengunjung dengan bahasa browser lain)', !idHome.font && !idHome.thaiLoaded, JSON.stringify(idHome))

  await main.go('/th', 2500)
  const thHome = await evaluate(`(async () => {
    await document.fonts.ready
    const m = (s) => document.querySelector(s)?.getAttribute('content')
    return { lang: document.documentElement.lang, title: document.title, path: location.pathname, font: document.getElementById('font-th')?.href ?? null,
      thaiFont: document.fonts.check('600 32px Anuphan', 'ไทย'), body: getComputedStyle(document.body).fontFamily, heading: getComputedStyle(document.querySelector('.home h2')).fontFamily,
      badge: document.querySelector('.hero__badge')?.textContent.trim(), description: m('meta[name="description"]'), ogLocale: m('meta[property="og:locale"]'),
      ogTitle: m('meta[property="og:title"]'), canonical: document.querySelector('link[rel="canonical"]')?.href }
  })()`)
  check('/th: halaman Thai (lang="th", judul & deskripsi dasar situs Thai, og:locale th_TH, canonical /th)',
    thHome.lang === 'th' && thHome.path === '/th' && thHome.title === TH_TITLE && thHome.ogTitle === TH_TITLE && THAI.test(thHome.description) && thHome.ogLocale === 'th_TH' && thHome.canonical?.endsWith('/th') && thHome.badge === 'โปรเจกต์ชุมชน ไม่เป็นทางการ',
    `${thHome.title} · ${thHome.ogLocale} · ${thHome.badge}`)
  check('/th: font Thai (Anuphan) dimuat dan dipakai teks isi & judul besar', /Anuphan/.test(thHome.font ?? '') && thHome.thaiFont && /Anuphan/.test(thHome.body) && /Anuphan/.test(thHome.heading), `${thHome.body} | ${thHome.heading}`)

  const pages = []
  for (const route of ROUTES) {
    await main.go(`/th${route === '/' ? '' : route}`)
    pages.push({
      route,
      ...(await evaluate(`(() => {
        const text = document.querySelector('.site').innerText
        const internal = [...document.querySelectorAll('a[href^="/"]:not([hreflang])')].map((a) => a.getAttribute('href')).filter((href) => !href.startsWith('/images'))
        const labels = [...document.querySelectorAll('[aria-label], [title], [placeholder], [alt]')].map((el) => [el.getAttribute('aria-label'), el.getAttribute('title'), el.getAttribute('placeholder')].filter(Boolean).join(' ')).join(' | ')
        return { lang: document.documentElement.lang, path: location.pathname, title: document.title, h1: document.querySelector('h1')?.textContent.trim() ?? '',
          text, labels, badLinks: internal.filter((href) => href !== '/th' && !href.startsWith('/th/') && !href.startsWith('/th?')), thai: /[฀-๿]/.test(text) }
      })()`)),
    })
  }
  const idLeft = pages.map((page) => ({ route: page.route, hit: (page.text + ' ' + page.labels).match(ID_UI_WORDS)?.[0] })).filter((page) => page.hit)
  check(`/th: ${ROUTES.length} halaman (beranda, hub, daftar, detail, 404) berbahasa Thai dengan slug yang sama`,
    pages.every((page) => page.lang === 'th' && page.thai && page.path === `/th${page.route === '/' ? '' : page.route}`),
    pages.filter((page) => page.lang !== 'th' || !page.thai).map((page) => page.route).join(', '))
  check('/th: tidak ada teks antarmuka Indonesia yang tersisa (teks, aria-label, title, placeholder)', idLeft.length === 0, idLeft.map((page) => `${page.route}: "${page.hit}"`).join(', '))
  check('/th: semua tautan internal tetap di /th (toolbar, footer, kartu, breadcrumb, detail; selain pemilih bahasa)', pages.every((page) => page.badLinks.length === 0),
    pages.filter((page) => page.badLinks.length).map((page) => `${page.route}: ${page.badLinks.slice(0, 3).join(' ')}`).join(', '))
  check('/th: angka memakai angka Arab (tanpa angka Thai)', pages.every((page) => !THAI_DIGITS.test(page.text)))
  const notFound = pages.find((page) => page.route === '/nope')
  const fishNotFound = pages.find((page) => page.route === '/wildlife/fish/nope')
  check('/th: halaman 404 umum & detail tidak ditemukan berbahasa Thai', notFound.h1 === 'ไม่พบหน้านี้' && fishNotFound.h1 === 'ไม่พบปลานี้' && fishNotFound.title === 'ไม่พบปลานี้ | Hatowiki', `${notFound.h1} · ${fishNotFound.h1}`)
  const listTitle = pages.find((page) => page.route === '/wildlife/fish').title
  check('/th: judul tab halaman memakai nama entri/katalog (Inggris) + Hatowiki', listTitle === 'Fish | Hatowiki' && pages.find((page) => page.route === '/wildlife/fish/sea-bass').title === 'Sea Bass | Hatowiki', listTitle)

  // Kunci teks antarmuka sama di kedua bahasa; deskripsi Thai lengkap & sesuai aturan sembunyi.
  const coverage = await evaluate(`(async () => {
    const keys = (o, pre = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, pre + k + '.') : [pre + k]))
    const [{ default: id }, { default: th }] = await Promise.all([import('/src/i18n/messages/id.json'), import('/src/i18n/messages/th.json')])
    const skip = (k) => k.startsWith('dataText.') || k.endsWith('.unit')
    const idKeys = keys(id).filter((k) => !skip(k)), thKeys = keys(th).filter((k) => !skip(k))
    const kinds = ${JSON.stringify(KINDS)}
    const out = { idKeys: idKeys.length, missingTh: idKeys.filter((k) => !thKeys.includes(k)), extraTh: thKeys.filter((k) => !idKeys.includes(k)), emptyTh: thKeys.filter((k) => !String(k.split('.').reduce((o, p) => o?.[p], th) ?? '').trim()), kinds: {} }
    for (const [kind, path] of Object.entries(kinds)) {
      const mod = await import(path)
      const entries = Object.values(mod).find((v) => Array.isArray(v) && v[0]?.slug)
      const json = (await import('/scripts/translations/' + kind + '.th.json')).default
      const { _meta, ...texts } = json
      out.kinds[kind] = {
        entries: entries.length,
        translated: Object.keys(texts).length,
        missing: entries.filter((e) => e.description && !texts[e.slug]).map((e) => e.slug),
        leakedHidden: entries.filter((e) => !e.description && texts[e.slug]).map((e) => e.slug),
        unknown: Object.keys(texts).filter((slug) => !entries.some((e) => e.slug === slug)),
        noThai: Object.entries(texts).filter(([, text]) => !/[฀-๿]/.test(text)).map(([slug]) => slug),
        meta: _meta && _meta.machineTranslated === true && _meta.reviewedByNativeSpeaker === false && _meta.language === 'th',
      }
    }
    return out
  })()`)
  check(`Teks antarmuka: ${coverage.idKeys} kunci id punya pasangan th (tidak ada yang kurang, lebih, atau kosong)`,
    coverage.missingTh.length === 0 && coverage.extraTh.length === 0 && coverage.emptyTh.length === 0, [...coverage.missingTh, ...coverage.extraTh, ...coverage.emptyTh].join(', '))
  const kindRows = Object.entries(coverage.kinds)
  const translatedTotal = kindRows.reduce((sum, [, row]) => sum + row.translated, 0)
  check(`Deskripsi Thai: ${translatedTotal} teks, lengkap untuk semua entri yang punya deskripsi Indonesia, tidak ada slug asing`,
    kindRows.every(([, row]) => row.missing.length === 0 && row.unknown.length === 0 && row.noThai.length === 0),
    kindRows.map(([kind, row]) => `${kind} ${row.translated}/${row.entries}${row.missing.length ? ` kurang ${row.missing.join(' ')}` : ''}${row.unknown.length ? ` asing ${row.unknown.join(' ')}` : ''}`).join(', '))
  check('Deskripsi yang disembunyikan di versi Indonesia (salah salin di sumber) juga tidak diterjemahkan', kindRows.every(([, row]) => row.leakedHidden.length === 0),
    kindRows.flatMap(([, row]) => row.leakedHidden).join(', '))
  check('Metadata tiap berkas <kind>.th.json: terjemahan otomatis, belum ditinjau penutur asli', kindRows.every(([, row]) => row.meta), kindRows.filter(([, row]) => !row.meta).map(([kind]) => kind).join(', '))

  // Detail: deskripsi Thai tampil, yang disembunyikan tetap "belum tersedia"; versi Indonesia tetap deskripsi Indonesia.
  const detail = async (route) => { await main.go(route); return evaluate(`document.querySelector('.entry-detail__description')?.textContent.trim()`) }
  const [thSeaBass, idSeaBass, thHidden, thHiddenBug, thTomato] = [await detail('/th/wildlife/fish/sea-bass'), await detail('/wildlife/fish/sea-bass'), await detail('/th/recipes/mandarin-milkshake'), await detail('/th/wildlife/bugs/colorful-brick-large-red-damselfly'), await detail('/th/crops/tomato')]
  const expected = await evaluate(`(async () => {
    const [fish, crops, { fish: fishData }] = await Promise.all([import('/scripts/translations/fish.th.json'), import('/scripts/translations/crops.th.json'), import('/src/data/wildlife/fish.js')])
    return { seaBass: fish.default['sea-bass'], tomato: crops.default.tomato, idSeaBass: fishData.find((f) => f.slug === 'sea-bass').description }
  })()`)
  check('Detail /th: deskripsi Thai dari <kind>.th.json; versi Indonesia tetap deskripsi Indonesia', thSeaBass === expected.seaBass && thTomato === expected.tomato && idSeaBass === expected.idSeaBass, thSeaBass)
  check('Detail /th: deskripsi yang disembunyikan di versi Indonesia tampil "ยังไม่มีคำอธิบาย"', thHidden === 'ยังไม่มีคำอธิบาย' && thHiddenBug === 'ยังไม่มีคำอธิบาย', `${thHidden} · ${thHiddenBug}`)

  // Angka & jam per locale; teks data (tempat membeli bahan) ikut diterjemahkan.
  const numbers = await evaluate(`(async () => {
    const { recipes } = await import('/src/data/recipes/recipes.js')
    const recipe = recipes.find((r) => (r.marketValue?.[4] ?? 0) >= 1000)
    return { slug: recipe.slug, value: recipe.marketValue[4], th: recipe.marketValue[4].toLocaleString('th-TH-u-nu-latn'), id: recipe.marketValue[4].toLocaleString('id-ID') }
  })()`)
  await main.go(`/th/recipes/${numbers.slug}`)
  const thPrices = await evaluate(`[...document.querySelectorAll('.panel--hero .market-value__amount')].map((e) => e.firstChild.textContent)`)
  await main.go(`/recipes/${numbers.slug}`)
  const idPrices = await evaluate(`[...document.querySelectorAll('.panel--hero .market-value__amount')].map((e) => e.firstChild.textContent)`)
  check('Angka: /th memakai format th-TH (angka Arab, pemisah ribuan koma), versi Indonesia tetap id-ID', thPrices.includes(numbers.th) && idPrices.includes(numbers.id) && numbers.th !== numbers.id,
    `${numbers.slug}: ${numbers.th} vs ${numbers.id}`)
  await main.go('/th/wildlife/fish/sea-bass')
  const thHint = await evaluate(`document.querySelector('.availability__hint')?.textContent`)
  await main.go('/wildlife/fish/sea-bass')
  const idHint = await evaluate(`document.querySelector('.availability__hint')?.textContent`)
  check('Jam periode: /th "06:00–12:00", versi Indonesia tetap "06.00–12.00"', thHint === '06:00–12:00' && idHint === '06.00–12.00', `${thHint} · ${idHint}`)
  await main.go('/th/ingredients/yellow-sugar')
  const obtained = await evaluate(`[...document.querySelectorAll('.spec')].find((s) => s.textContent.includes('หาได้จาก'))?.querySelector('dd').innerText.replace(/\\n/g, ' ')`)
  check('Teks data Indonesia (tempat membeli bahan) diterjemahkan di /th', obtained === 'ร้าน Doris เฉพาะตอนมีรุ้ง', obtained)

  // Pengalihan /id dan rewrite vercel.json.
  await main.go('/id/wildlife/fish?waktu=Day')
  const fromId = await main.url()
  await main.go('/id')
  const fromIdRoot = await main.url()
  check('/id/... diarahkan ke alamat tanpa awalan (dengan query tetap)', fromId === '/wildlife/fish?waktu=Day' && fromIdRoot === '/', `${fromId} · ${fromIdRoot}`)
  const vercel = JSON.parse(readFileSync(new URL('vercel.json', ROOT), 'utf8'))
  const rewrite = new RegExp(`^${vercel.rewrites[0].source}$`)
  const redirects = vercel.redirects.map((r) => `${r.source}>${r.destination}`).join()
  check('vercel.json: rewrite ke index.html melayani /th/... (bukan /api), /id diarahkan permanen ke alamat tanpa awalan',
    vercel.rewrites[0].destination === '/index.html' && rewrite.test('/th/wildlife/fish/sea-bass') && rewrite.test('/th') && !rewrite.test('/api/geo') && redirects === '/id>/,/id/:path*>/:path*' && vercel.redirects.every((r) => r.permanent),
    `${vercel.rewrites[0].source} · ${redirects}`)
  const { GET } = await import(new URL('api/geo.js', ROOT))
  const geoTh = await (await GET(new Request('https://example.test/api/geo', { headers: { 'x-vercel-ip-country': 'TH' } }))).json()
  const geoNone = await GET(new Request('https://example.test/api/geo'))
  check('api/geo.js: mengembalikan negara dari header x-vercel-ip-country (null kalau tidak ada), tanpa cache', geoTh.country === 'TH' && (await geoNone.json()).country === null && /no-store/.test(geoNone.headers.get('cache-control')), JSON.stringify(geoTh))

  // Navigasi di dalam versi Thai: kartu → detail → kembali (filter tetap), menu, dan pencarian global.
  await main.go('/th/wildlife/fish?waktu=Day')
  await evaluate(`document.querySelector('.entry-card').click()`); await sleep(1000)
  const toDetail = await main.url()
  await evaluate(`document.querySelector('.entry-detail__footer a').click()`); await sleep(1000)
  const backToList = await main.url()
  check('/th: kartu → detail → kembali tetap di /th dengan filter yang sama', /^\/th\/wildlife\/fish\/[a-z0-9-]+$/.test(toDetail) && backToList === '/th/wildlife/fish?waktu=Day', `${toDetail} → ${backToList}`)
  const desktop = width >= 760
  let navLinks = []
  if (desktop) {
    await evaluate(`document.querySelector('.nav-menu__button').click()`); await sleep(300)
    navLinks = await evaluate(`[...document.querySelectorAll('.nav-menu__panel a')].map((a) => a.getAttribute('href'))`)
  } else {
    await evaluate(`document.querySelector('.menu-button').click()`); await sleep(400)
    navLinks = await evaluate(`[...document.querySelectorAll('.drawer a')].map((a) => a.getAttribute('href'))`)
    await main.press('Escape', 'Escape', 27)
  }
  check(`/th: ${desktop ? 'menu Wildlife' : 'drawer'} berisi tautan /th`, navLinks.length > 0 && navLinks.every((href) => href.startsWith('/th/') || href === '/th'), navLinks.slice(0, 4).join(' '))
  await main.go('/th/wildlife')
  await evaluate(`(() => {
    const root = document.querySelector('.site-header .global-search')
    root.querySelector('.global-search__toggle')?.offsetParent && root.querySelector('.global-search__toggle').click()
  })()`); await sleep(300)
  await evaluate(`(() => { const input = document.querySelector('.site-header .global-search input'); input.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(input, 'Sea Bass'); input.dispatchEvent(new Event('input', { bubbles: true })) })()`)
  await sleep(400)
  const searchLabel = await evaluate(`document.querySelector('.site-header .global-search [role="option"] .search-option__kind')?.textContent.trim()`)
  await main.press('Enter', 'Enter', 13); await sleep(1000)
  const searched = await main.url()
  check('/th: pencarian global (label kategori Thai) membuka detail di /th', searched === '/th/wildlife/fish/sea-bass' && searchLabel === 'ปลา', `${searchLabel} → ${searched}`)

  // ================= 2. Pemilih bahasa =================
  const LIST = '/wildlife/fish?waktu=Day&kategori=Common'
  await main.go(LIST)
  const menuState = () => evaluate(`(() => {
    const button = document.querySelector('.language-menu__button')
    const links = [...document.querySelectorAll('.language-menu__panel a')].map((a) => ({ text: a.textContent.trim(), href: a.getAttribute('href'), lang: a.lang, hreflang: a.hreflang, current: a.getAttribute('aria-current') }))
    return { label: button.getAttribute('aria-label'), title: button.title, expanded: button.getAttribute('aria-expanded'), icon: !!button.querySelector('svg.lucide-globe, svg'), links, focus: document.activeElement === button, focusText: document.activeElement?.textContent.trim() }
  })()`)
  const closed = await menuState()
  await evaluate(`document.querySelector('.language-menu__button').click()`); await sleep(250)
  const opened = await menuState()
  check('Pemilih bahasa toolbar: tombol ikon bola dunia berlabel (bahasa sekarang), disclosure tertutup → terbuka saat diklik',
    closed.label === 'Pilih bahasa (Indonesia)' && closed.title === closed.label && closed.expanded === 'false' && closed.icon && opened.expanded === 'true',
    `${closed.label} · ${closed.expanded} → ${opened.expanded}`)
  check('Pemilih bahasa: "Indonesia" & "ไทย" (lang & hreflang sesuai, bahasa sekarang aria-current) ke halaman yang sama termasuk filter',
    JSON.stringify(opened.links) === JSON.stringify([
      { text: 'Indonesia', href: LIST, lang: 'id', hreflang: 'id', current: 'true' },
      { text: 'ไทย', href: `/th${LIST}`, lang: 'th', hreflang: 'th', current: null },
    ]),
    opened.links.map((link) => `${link.text} ${link.href}`).join(' · '))
  await main.press('Escape', 'Escape', 27)
  const afterEscape = await menuState()
  await main.press('ArrowDown', 'ArrowDown', 40)
  const afterArrow = await menuState()
  check('Pemilih bahasa: Escape menutup & fokus kembali ke tombol; panah bawah membuka & memfokuskan pilihan pertama',
    afterEscape.expanded === 'false' && afterEscape.focus && afterArrow.expanded === 'true' && afterArrow.focusText === 'Indonesia', `${afterEscape.expanded}/${afterEscape.focus} · ${afterArrow.focusText}`)
  const filterCount = () => evaluate(`document.querySelectorAll('.active-chip').length`)
  const idChips = await filterCount()
  await evaluate(`[...document.querySelectorAll('.language-menu__panel a')].find((a) => a.lang === 'th').click()`); await sleep(1500)
  const switched = await evaluate(`({ url: location.pathname + location.search, lang: document.documentElement.lang, stored: localStorage.getItem('hdx-lang'), label: document.querySelector('.language-menu__button').getAttribute('aria-label'), heading: document.querySelector('.list-status__count').textContent })`)
  const thChips = await filterCount()
  check('Pilih "ไทย": halaman yang sama di /th dengan filter URL tetap aktif, pilihan disimpan',
    switched.url === `/th${LIST}` && switched.lang === 'th' && switched.stored === 'th' && thChips === idChips && idChips === 2 && THAI.test(switched.heading) && switched.label === 'เลือกภาษา (ไทย)',
    `${switched.url} · ${thChips} chip · ${switched.heading}`)
  const footer = await evaluate(`[...document.querySelectorAll('.site-footer__language a')].map((a) => ({ text: a.textContent.trim(), href: a.getAttribute('href'), current: a.getAttribute('aria-current') }))`)
  check('Pemilih bahasa footer: tautan Indonesia & ไทย ke halaman yang sama, bahasa sekarang ditandai',
    JSON.stringify(footer) === JSON.stringify([{ text: 'Indonesia', href: LIST, current: null }, { text: 'ไทย', href: `/th${LIST}`, current: 'true' }]), footer.map((link) => `${link.text} ${link.href}`).join(' · '))
  await evaluate(`[...document.querySelectorAll('.site-footer__language a')].find((a) => a.lang === 'id').click()`); await sleep(1500)
  const back = await evaluate(`({ url: location.pathname + location.search, lang: document.documentElement.lang, stored: localStorage.getItem('hdx-lang') })`)
  check('Footer "Indonesia": kembali ke halaman yang sama tanpa awalan, pilihan disimpan', back.url === LIST && back.lang === 'id' && back.stored === 'id', JSON.stringify(back))
  await evaluate(`localStorage.setItem('hdx-lang', 'th')`)
  await main.go('/recipes?q=cake', 2200)
  const remembered = await main.url()
  await evaluate(`localStorage.setItem('hdx-lang', 'id')`)
  await main.go('/th/recipes', 2200)
  const explicitTh = await main.url()
  check('Pilihan diingat: pemilih Thai yang membuka alamat tanpa awalan diarahkan ke /th halaman yang sama; alamat /th tetap dihormati',
    remembered === '/th/recipes?q=cake' && explicitTh === '/th/recipes', `${remembered} · ${explicitTh}`)

  // ================= 3. Notifikasi saran bahasa =================
  const toast = (tab) => tab.evaluate(`(() => {
    const el = document.querySelector('.lang-suggest')
    if (!el) return null
    const r = el.getBoundingClientRect()
    const by = (id) => document.getElementById(id)?.textContent.trim()
    const close = el.querySelector('.lang-suggest__close')
    const action = el.querySelector('.lang-suggest__action')
    const cs = getComputedStyle(el)
    return { role: el.getAttribute('role'), modal: el.getAttribute('aria-modal'), lang: el.lang, tabIndex: el.tabIndex, title: by(el.getAttribute('aria-labelledby')), text: by(el.getAttribute('aria-describedby')),
      english: el.querySelector('.lang-suggest__english')?.textContent.trim(), englishLang: el.querySelector('.lang-suggest__english')?.lang,
      action: action?.textContent.trim(), actionHref: action?.getAttribute('href'), close: close?.getAttribute('aria-label'), closeTop: close && close.getBoundingClientRect().top - r.top, closeRight: close && r.right - close.getBoundingClientRect().right,
      left: r.left, bottom: innerHeight - r.bottom, width: r.width, height: r.height, font: cs.fontFamily, animation: cs.animationName, zIndex: Number(cs.zIndex),
      footerPad: parseFloat(getComputedStyle(document.querySelector('.site-footer')).paddingBottom), fontLink: !!document.getElementById('font-th'), all: el.textContent }
  })()`)

  const thVisitor = await freshTab({ languages: ['th-TH', 'th', 'en-US'] })
  await thVisitor.go('/wildlife/fish', 500)
  const shown = await thVisitor.waitFor(`document.querySelector('.lang-suggest')`, 6000)
  await sleep(500)
  const s = await toast(thVisitor)
  check('Saran bahasa (bahasa browser th): muncul di versi Indonesia sebagai dialog non-modal berlabel, bisa difokus, lang="th"',
    shown && s?.role === 'dialog' && s.modal === 'false' && s.lang === 'th' && s.tabIndex === -1 && s.title === SUGGEST_TH.title && s.text === SUGGEST_TH.text, s && `${s.title} · ${s.text}`)
  check('Saran bahasa: satu baris Inggris (lang="en"), tombol "✓ เปลี่ยนเป็นภาษาไทย" ke halaman yang sama di /th, tombol X di pojok kanan atas',
    s?.english === SUGGEST_TH.english && s.englishLang === 'en' && s.action === `✓${SUGGEST_TH.button}` && s.actionHref === '/th/wildlife/fish' && s.close === SUGGEST_TH.close && s.closeTop <= 16 && s.closeRight <= 16,
    s && `${s.english} · ${s.action} · ${s.actionHref} · X ${s.close}`)
  check('Saran bahasa: tidak menyebut deteksi lokasi pengunjung', s && !/ตำแหน่ง|ตรวจพบ|location|detect|lokasi|negara/i.test(s.all), s?.all)
  check(`Saran bahasa: pojok kiri bawah${width < 560 ? ' (selebar layar di ponsel)' : ', lebar ≤ 22rem'}, di atas konten tapi di bawah toolbar & drawer, font Thai dimuat untuknya`,
    s && s.left <= 24 && s.bottom >= 0 && s.bottom <= 24 && (width < 560 ? s.width >= width - 32 : s.width <= 352) && s.zIndex > 1 && s.zIndex < 300 && s.fontLink && /Anuphan/.test(s.font),
    s && `kiri ${Math.round(s.left)} · bawah ${Math.round(s.bottom)} · lebar ${Math.round(s.width)} · z ${s.zIndex}`)
  check('Saran bahasa: footer diberi ruang setinggi notifikasi (akhir halaman tidak tertutup)', s && s.footerPad >= s.height, s && `${s.footerPad}px ≥ ${Math.round(s.height)}px`)
  check('Saran bahasa: animasi masuk halus (fade + geser) saat gerak tidak dikurangi', s?.animation === 'lang-suggest-in', s?.animation)
  await thVisitor.evaluate(`document.activeElement.blur(); document.body.focus()`)
  await thVisitor.press('Tab', 'Tab', 9)
  await thVisitor.press('Tab', 'Tab', 9)
  const focusInToast = await thVisitor.evaluate(`!!document.activeElement.closest('.lang-suggest')`)
  await thVisitor.press('Escape', 'Escape', 27)
  const afterEsc = await thVisitor.evaluate(`({ gone: !document.querySelector('.lang-suggest'), dismissed: localStorage.getItem('hdx-lang-hint-dismissed'), focus: document.activeElement?.id })`)
  check('Saran bahasa: tercapai dengan Tab (awal urutan fokus), Escape menutup, fokus pindah ke konten, penutupan disimpan',
    focusInToast && afterEsc.gone && afterEsc.dismissed === '1' && afterEsc.focus === 'konten', JSON.stringify({ focusInToast, ...afterEsc }))
  await thVisitor.go('/wildlife/fish', 3200)
  check('Saran bahasa: setelah ditutup tidak muncul lagi (dimuat ulang)', !(await toast(thVisitor)))

  const accept = await freshTab({ languages: ['th-TH', 'th'] })
  await accept.go('/recipes?q=cake', 500)
  await accept.waitFor(`document.querySelector('.lang-suggest__action')`, 6000)
  await accept.evaluate(`document.querySelector('.lang-suggest__action').click()`); await sleep(1500)
  const accepted = await accept.evaluate(`({ url: location.pathname + location.search, lang: document.documentElement.lang, stored: localStorage.getItem('hdx-lang') })`)
  await sleep(2500)
  const acceptedToast = await toast(accept)
  check('Saran bahasa: tombol pindah membuka halaman yang sama di /th (dengan query), pilihan disimpan, notifikasi tidak muncul lagi',
    accepted.url === '/th/recipes?q=cake' && accepted.lang === 'th' && accepted.stored === 'th' && !acceptedToast, JSON.stringify(accepted))

  const lao = await freshTab({ languages: ['lo-LA', 'lo'] })
  await lao.go('/', 500)
  check('Saran bahasa: bahasa browser Lao (lo) juga mendapat saran versi Thai', await lao.waitFor(`document.querySelector('.lang-suggest[lang="th"]')`, 6000))

  const geoTab = await freshTab({ geo: 'TH' })
  await geoTab.go('/crops', 500)
  const geoShown = await geoTab.waitFor(`document.querySelector('.lang-suggest[lang="th"]')`, 6000)
  const geoFirst = geoTab.geoRequests
  await geoTab.go('/crops', 3200)
  const geoAgain = await toast(geoTab)
  check('Saran bahasa: negara TH dari api/geo (x-vercel-ip-country) memunculkan saran walau bahasa browser Inggris; api/geo hanya dipanggil sekali per sesi',
    geoShown && geoFirst === 1 && geoTab.geoRequests === 1 && !!geoAgain, `muncul ${geoShown} · ${geoTab.geoRequests} request`)
  const geoLa = await freshTab({ geo: 'LA' })
  await geoLa.go('/', 500)
  check('Saran bahasa: negara LA juga mendapat saran versi Thai', await geoLa.waitFor(`document.querySelector('.lang-suggest[lang="th"]')`, 6000))

  const noHint = await freshTab({ geo: 'ID' })
  await noHint.go('/', 3500)
  const plain = await freshTab()
  await plain.go('/wildlife', 3500)
  check('Saran bahasa: tidak muncul untuk bahasa browser & negara lain (termasuk saat api/geo tidak tersedia di dev)', !(await toast(noHint)) && !(await toast(plain)) && noHint.geoRequests === 1)

  const idVisitor = await freshTab({ languages: ['id-ID', 'id'] })
  await idVisitor.go('/th/wildlife', 500)
  await idVisitor.waitFor(`document.querySelector('.lang-suggest')`, 6000)
  await sleep(500)
  const sid = await toast(idVisitor)
  check('Saran bahasa di versi Thai untuk bahasa browser id: teks Indonesia (lang="id") + baris Inggris, tombol ke halaman yang sama tanpa awalan',
    sid?.lang === 'id' && sid.title === SUGGEST_ID.title && sid.english === SUGGEST_ID.english && sid.action === `✓${SUGGEST_ID.button}` && sid.actionHref === '/wildlife' && sid.close === SUGGEST_ID.close,
    sid && `${sid.title} · ${sid.text} · ${sid.action}`)
  await idVisitor.evaluate(`document.querySelector('.lang-suggest__close').click()`); await sleep(400)
  const closedById = await idVisitor.evaluate(`({ gone: !document.querySelector('.lang-suggest'), dismissed: localStorage.getItem('hdx-lang-hint-dismissed'), url: location.pathname })`)
  check('Saran bahasa: tombol X menutup (tetap di halaman), penutupan disimpan', closedById.gone && closedById.dismissed === '1' && closedById.url === '/th/wildlife', JSON.stringify(closedById))

  const chooser = await freshTab({ languages: ['th-TH', 'th'] })
  await chooser.go('/', 500)
  await chooser.waitFor(`document.querySelector('.lang-suggest')`, 6000)
  await chooser.evaluate(`[...document.querySelectorAll('.site-footer__language a')].find((a) => a.lang === 'id').click()`); await sleep(800)
  const chose = await chooser.evaluate(`({ gone: !document.querySelector('.lang-suggest'), stored: localStorage.getItem('hdx-lang') })`)
  check('Saran bahasa: memilih bahasa lewat pemilih bahasa (termasuk bahasa yang sama) menutup saran dan disimpan', chose.gone && chose.stored === 'id', JSON.stringify(chose))

  const reduced = await freshTab({ languages: ['th-TH', 'th'], reducedMotion: true })
  await reduced.go('/', 500)
  await reduced.waitFor(`document.querySelector('.lang-suggest')`, 6000)
  const reducedAnim = await reduced.evaluate(`(() => { const cs = getComputedStyle(document.querySelector('.lang-suggest')); return { name: cs.animationName, duration: parseFloat(cs.animationDuration) } })()`)
  check('Saran bahasa: prefers-reduced-motion → hanya fade tanpa gerak (dan durasi dipangkas)', reducedAnim.name === 'lang-suggest-fade' && reducedAnim.duration < 0.05, JSON.stringify(reducedAnim))

  // Log debug Vercel Web Analytics hanya muncul di mode dev, jadi diabaikan.
  const problems = tabs.flatMap((tab) => tab.logs).filter((line) => !/\[vite\] connect|React DevTools|\[Vercel Web Analytics\]/.test(line))
  check('Console bersih selama uji (tanpa error & tanpa peringatan teks i18n yang hilang)', problems.length === 0, problems.slice(0, 3).join(' | '))
  for (const tab of tabs) await tab.close()
  return results
}

async function main() {
  try {
    await fetch(`${BASE_URL}/`)
  } catch {
    throw new Error(`Dev server tidak bisa dibuka di ${BASE_URL}. Jalankan "npm run dev" dulu.`)
  }
  const chrome = await startChrome(PORT)
  let failed = 0
  let total = 0
  try {
    for (const width of WIDTHS.length ? WIDTHS : [1280]) {
      console.log(`\n=== Dua bahasa (Indonesia & Thai) — lebar ${width}px`)
      const results = await runSuite(width)
      total += results.length
      failed += results.filter((ok) => !ok).length
    }
  } finally {
    chrome.stop()
  }
  console.log(`\n${total - failed}/${total} lulus`)
  process.exitCode = failed ? 1 : 0
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
