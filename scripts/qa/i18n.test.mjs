#!/usr/bin/env node
/**
 * Uji tiga bahasa (Indonesia, Thai, Inggris) di Chrome headless (lewat Chrome DevTools Protocol):
 * - Routing /en: versi Inggris di /en dengan slug yang sama (lang="en", teks antarmuka Inggris tanpa sisa Indonesia/Thai,
 *   tautan internal tetap di /en, angka en-US, tanpa font Thai); deskripsi dari scripts/translations/<kind>.en.json =
 *   teks asli yang salah ketiknya dibetulkan (descriptionOriginal tetap apa adanya), deskripsi berbahasa Spanyol
 *   diterjemahkan & ditandai, yang disembunyikan tetap tersembunyi; isian manual data/manual/descriptions.json dipakai
 *   sebagai deskripsi asli (sumber "in-game").
 * - Routing /th: versi Indonesia tanpa awalan, versi Thai di /th dengan slug yang sama; semua halaman (beranda, hub, daftar,
 *   detail, 404) berbahasa Thai (lang="th", judul & deskripsi dasar situs, tanpa teks antarmuka Indonesia, semua tautan
 *   internal tetap di /th); /id/... diarahkan ke alamat tanpa awalan; rewrite vercel.json melayani /th/... tapi tidak
 *   /api; navigasi, tombol kembali, dan pencarian global tetap di /th.
 * - Teks & data: kunci teks antarmuka id & th sama; deskripsi Thai diambil dari scripts/translations/<kind>.th.json
 *   (lengkap untuk semua entri yang punya deskripsi Indonesia, tercatat sebagai terjemahan otomatis yang belum ditinjau),
 *   deskripsi yang disembunyikan di versi Indonesia juga tersembunyi di Thai; angka th-TH dengan angka Arab; font Thai
 *   (Anuphan) hanya dimuat di /th; teks & font Thai tidak dimuat sama sekali untuk pengunjung biasa di versi Indonesia.
 * - Pemilih bahasa: bola dunia di toolbar (disclosure, keyboard, Escape) dan tautan di footer ("Indonesia", "ไทย",
 *   "English"), membuka halaman yang sama termasuk filter di URL, pilihan diingat (alamat tanpa awalan diarahkan ke /th
 *   atau /en untuk yang memilih Thai atau Inggris).
 * - Notifikasi saran bahasa, aturan di src/i18n/suggestLocale.js (tabel aturan diuji langsung, lalu di halaman): bahasa
 *   browser th/lo atau negara TH/LA → Thai; id atau negara ID → Indonesia; ms → tidak ada saran; en → Inggris hanya
 *   kalau negara dari api/geo.js (dicegat di uji) tersedia dan bukan ID; bahasa lain → Inggris kecuali negara ID; saran
 *   hanya muncul kalau berbeda dari bahasa halaman. Isi & atribut lang, dialog non-modal di pojok kiri bawah yang bisa
 *   difokus, Escape & tombol X menutup dan diingat, memilih bahasa (tombol, pemilih) menutupnya, animasi masuk mengikuti
 *   prefers-reduced-motion, footer diberi ruang supaya konten tidak tertutup; console bersih.
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
const EN_TITLE = 'Hatowiki | Heartopia Community Wiki'
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
const SUGGEST_EN = {
  title: 'Hello! 👋',
  text: 'Hatowiki is also available in English. Would you like to switch?',
  button: 'Switch to English',
  close: 'Close',
}
// Aturan saran bahasa: [bahasa browser, negara (null = tidak tersedia), bahasa yang disarankan].
const SUGGEST_RULES = [
  [['th-TH', 'th', 'en'], null, 'th'],
  [['lo-LA'], null, 'th'],
  [['en-US', 'en', 'th'], 'US', 'th'],
  [['en-US', 'en'], 'TH', 'th'],
  [['ja'], 'LA', 'th'],
  [['id-ID', 'id'], null, 'id'],
  [['id'], 'TH', 'id'],
  [['en-US', 'id'], null, 'id'],
  [['en-US', 'en'], 'ID', 'id'],
  [['fr-FR', 'fr'], 'ID', 'id'],
  [['ms-MY', 'ms'], null, null],
  [['ms'], 'TH', null],
  [['en-US', 'ms'], 'US', null],
  [['en-US', 'en'], null, null],
  [['en-GB'], 'GB', 'en'],
  [['en-US', 'en'], 'SG', 'en'],
  [['en', 'fr'], null, null],
  [['ja-JP', 'ja'], null, 'en'],
  [['fr', 'en'], null, 'en'],
  [['de-DE'], 'DE', 'en'],
  [['zh-CN', 'zh', 'en'], 'MY', 'en'],
  [[], null, null],
  [[], 'US', 'en'],
]
// Teks antarmuka Indonesia yang tidak boleh tersisa di halaman Thai (nama entri, lokasi, istilah game tetap Inggris).
const ID_UI_WORDS = /\b(Beranda|Lihat semua|Lihat daftar|Kembali|Harga jual|Harga beli|Nilai jual|Lokasi|Cuaca|Menampilkan|Deskripsi|Sumber data|dari|membuka tab baru|Bahan|Waktu|Urutan|Filter Lanjutan|Semua|Resep|Ikan|Serangga|Burung|Hewan|Tanaman|koin|energi|Syarat level|Toko)\b/
// Teks antarmuka Indonesia yang tidak boleh tersisa di halaman Inggris (kata yang juga kata Inggris tidak dimasukkan).
const ID_WORDS_IN_EN = /\b(Beranda|Lihat semua|Lihat daftar|Kembali|Harga jual|Harga beli|Nilai jual|Lokasi|Cuaca|Menampilkan|Deskripsi|Sumber data|dari|membuka tab baru|Bahan|Waktu|Urutan|Filter Lanjutan|Semua|Resep|Ikan|Serangga|Burung|Hewan|Tanaman|koin|energi|Syarat level|Toko|saat|hanya|selama)\b/
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
    thaiLoaded: performance.getEntriesByType('resource').some((r) => /messages\\/(th|en)\\.json|\\.(th|en)\\.json|Anuphan|anuphan/i.test(r.name)) })`)
  check('Versi Indonesia (/) tetap lang="id" dengan judul dasar Indonesia', idHome.lang === 'id' && idHome.title === ID_TITLE, `${idHome.lang} · ${idHome.title}`)
  check('Versi Indonesia tidak memuat teks & deskripsi Thai/Inggris maupun font Thai (browser berbahasa Inggris tanpa data negara)', !idHome.font && !idHome.thaiLoaded, JSON.stringify(idHome))

  // ================= 1a. Routing /en, teks antarmuka, deskripsi Inggris =================
  await main.go('/en', 2500)
  const enHome = await evaluate(`(() => {
    const m = (s) => document.querySelector(s)?.getAttribute('content')
    return { lang: document.documentElement.lang, title: document.title, path: location.pathname, font: !!document.getElementById('font-th'),
      body: getComputedStyle(document.body).fontFamily, badge: document.querySelector('.hero__badge')?.textContent.trim(), description: m('meta[name="description"]'),
      ogLocale: m('meta[property="og:locale"]'), ogTitle: m('meta[property="og:title"]'), canonical: document.querySelector('link[rel="canonical"]')?.href,
      thaiLoaded: performance.getEntriesByType('resource').some((r) => /messages\\/th\\.json|\\.th\\.json|Anuphan/i.test(r.name)),
      labels: [...document.querySelectorAll('.category-card__label, .now-group__label')].length, names: [...document.querySelectorAll('.category-card__title')].map((e) => e.textContent.trim()) }
  })()`)
  check('/en: halaman Inggris (lang="en", judul & deskripsi dasar situs Inggris, og:locale en_US, canonical /en)',
    enHome.lang === 'en' && enHome.path === '/en' && enHome.title === EN_TITLE && enHome.ogTitle === EN_TITLE && /^A community wiki for Heartopia/.test(enHome.description) && enHome.ogLocale === 'en_US' && enHome.canonical?.endsWith('/en') && enHome.badge === 'Unofficial community project',
    `${enHome.title} · ${enHome.ogLocale} · ${enHome.badge}`)
  check('/en: tanpa font & teks Thai; nama kategori tidak diulang sebagai label ("Fish", bukan "Fish Fish")',
    !enHome.font && !enHome.thaiLoaded && !/Anuphan/.test(enHome.body) && enHome.labels === 0 && enHome.names.includes('Fish') && enHome.names.includes('Recipes'), `${enHome.names.join(', ')} · label ${enHome.labels}`)

  const enPages = []
  for (const route of ROUTES) {
    await main.go(`/en${route === '/' ? '' : route}`)
    enPages.push({
      route,
      ...(await evaluate(`(() => {
        const text = document.querySelector('.site').innerText
        const internal = [...document.querySelectorAll('a[href^="/"]:not([hreflang])')].map((a) => a.getAttribute('href')).filter((href) => !href.startsWith('/images'))
        const labels = [...document.querySelectorAll('[aria-label], [title], [placeholder], [alt]')].map((el) => [el.getAttribute('aria-label'), el.getAttribute('title'), el.getAttribute('placeholder')].filter(Boolean).join(' ')).join(' | ')
        // Nama bahasa "ไทย" di pemilih bahasa memang beraksara Thai.
        const thai = [...document.querySelectorAll('.site *')].filter((el) => !el.closest('[lang="th"]') && [...el.childNodes].some((n) => n.nodeType === 3 && /[฀-๿]/.test(n.textContent))).length
        return { lang: document.documentElement.lang, path: location.pathname, title: document.title, h1: document.querySelector('h1')?.textContent.trim() ?? '',
          text, labels, thai, badLinks: internal.filter((href) => href !== '/en' && !href.startsWith('/en/') && !href.startsWith('/en?')) }
      })()`)),
    })
  }
  const idLeftEn = enPages.map((page) => ({ route: page.route, hit: (page.text + ' ' + page.labels).match(ID_WORDS_IN_EN)?.[0] })).filter((page) => page.hit)
  check(`/en: ${ROUTES.length} halaman (beranda, hub, daftar, detail, 404) berbahasa Inggris dengan slug yang sama`,
    enPages.every((page) => page.lang === 'en' && page.path === `/en${page.route === '/' ? '' : page.route}`), enPages.filter((page) => page.lang !== 'en').map((page) => page.route).join(', '))
  check('/en: tidak ada teks antarmuka Indonesia atau Thai yang tersisa (teks, aria-label, title, placeholder)', idLeftEn.length === 0 && enPages.every((page) => page.thai === 0),
    [...idLeftEn.map((page) => `${page.route}: "${page.hit}"`), ...enPages.filter((page) => page.thai).map((page) => `${page.route}: ${page.thai} teks Thai`)].join(', '))
  check('/en: semua tautan internal tetap di /en (toolbar, footer, kartu, breadcrumb, detail; selain pemilih bahasa)', enPages.every((page) => page.badLinks.length === 0),
    enPages.filter((page) => page.badLinks.length).map((page) => `${page.route}: ${page.badLinks.slice(0, 3).join(' ')}`).join(', '))
  const enNotFound = enPages.find((page) => page.route === '/nope')
  const enFishNotFound = enPages.find((page) => page.route === '/wildlife/fish/nope')
  check('/en: halaman 404 umum & detail tidak ditemukan berbahasa Inggris; judul tab memakai nama entri/katalog',
    enNotFound.h1 === 'Page not found' && enFishNotFound.h1 === 'Fish not found' && enFishNotFound.title === 'Fish not found | Hatowiki' && enPages.find((page) => page.route === '/wildlife/fish').title === 'Fish | Hatowiki' && enPages.find((page) => page.route === '/wildlife/fish/sea-bass').title === 'Sea Bass | Hatowiki',
    `${enNotFound.h1} · ${enFishNotFound.h1}`)
  const enList = enPages.find((page) => page.route === '/wildlife/bugs').text
  const enRecipes = enPages.find((page) => page.route === '/recipes').text
  check('/en: teks daftar alami ("Showing 101 of 101 bugs", jumlah per section "entries", tunggal "1 entry")',
    /Showing 101 of 101 bugs/.test(enList.replace(/\s+/g, ' ')) && /\b\d+ entries\b/.test(enList) && !/\b1 entries\b/.test(enList + enRecipes), enList.replace(/\s+/g, ' ').match(/Showing[^.]{0,40}/)?.[0])

  // Deskripsi Inggris: teks asli dengan salah ketik dibetulkan; descriptionOriginal tidak berubah.
  const enData = await evaluate(`(async () => {
    const kinds = ${JSON.stringify(KINDS)}
    const corrections = (await import('/scripts/translations/english-corrections.json')).default
    const out = { kinds: {}, fixes: 0, fixedEntries: 0, typosLeft: [], originalChanged: [] }
    const TYPOS = /\\b(easilg|Widelg|widelg|ferocitg|preg|theg|murkg|highlg|verg|furrg|damselflg|fairg|personalitg|ang|angone|grag|mgsterious|passerbg|meticulouslg|Butterflg|evenlg|silkg|worrg|gour|lagers|spicg|tog|tupe|cuan|wau|sparckles|mandits|appearence|Iost)\\b|Mid-AIJtumn|Oct0PUS|Stag away|´|bUt|(?<=[a-z,] )(Shell|Still|Sharp|Uses|Used|Unique|Will|What|Pink|Plain|Style)\\b/
    for (const [kind, path] of Object.entries(kinds)) {
      const entries = Object.values(await import(path)).find((v) => Array.isArray(v) && v[0]?.slug)
      const { _meta, ...texts } = (await import('/scripts/translations/' + kind + '.en.json')).default
      const fixes = corrections.fixes[kind] ?? {}
      const translated = corrections.translations[kind] ?? {}
      out.kinds[kind] = {
        entries: entries.length,
        texts: Object.keys(texts).length,
        missing: entries.filter((e) => e.description && !texts[e.slug]).map((e) => e.slug),
        leakedHidden: entries.filter((e) => !e.description && texts[e.slug]).map((e) => e.slug),
        unknown: Object.keys(texts).filter((slug) => !entries.some((e) => e.slug === slug)),
        // Entri tanpa pembetulan harus sama persis dengan teks sumber; entri berbahasa lain harus memakai terjemahannya.
        changedWithoutRecord: entries.filter((e) => texts[e.slug] && !fixes[e.slug] && !translated[e.slug] && texts[e.slug] !== e.descriptionOriginal).map((e) => e.slug),
        unchangedWithRecord: entries.filter((e) => fixes[e.slug] && texts[e.slug] === e.descriptionOriginal).map((e) => e.slug),
        foreign: entries.filter((e) => e.descriptionSourceLang).map((e) => ({ slug: e.slug, ok: texts[e.slug] === translated[e.slug] && _meta.translated?.[e.slug] === e.descriptionSourceLang })),
        meta: _meta && _meta.language === 'en' && _meta.corrections === Object.values(fixes).reduce((n, list) => n + list.length, 0) && _meta.correctedEntries === Object.keys(fixes).length,
      }
      out.fixes += Object.values(fixes).reduce((n, list) => n + list.length, 0)
      out.fixedEntries += Object.keys(fixes).length
      out.typosLeft.push(...Object.entries(texts).filter(([, text]) => TYPOS.test(text)).map(([slug, text]) => kind + '/' + slug + ': ' + text.match(TYPOS)[0]))
      // Salah ketiknya harus tetap ada di descriptionOriginal (data tidak diubah).
      for (const [slug, list] of Object.entries(fixes)) {
        const original = entries.find((e) => e.slug === slug)?.descriptionOriginal ?? ''
        if (!list.every(([from]) => original.includes(from) || list.some(([a, b]) => a !== from && original.includes(a)))) out.originalChanged.push(kind + '/' + slug)
      }
    }
    return out
  })()`)
  const enRows = Object.entries(enData.kinds)
  const enTotal = enRows.reduce((sum, [, row]) => sum + row.texts, 0)
  check(`Deskripsi Inggris: ${enTotal} teks, lengkap untuk semua entri yang punya deskripsi, tidak ada slug asing`,
    enRows.every(([, row]) => row.missing.length === 0 && row.unknown.length === 0), enRows.map(([kind, row]) => `${kind} ${row.texts}/${row.entries}${row.missing.length ? ` kurang ${row.missing.join(' ')}` : ''}`).join(', '))
  check(`Deskripsi Inggris: ${enData.fixes} pembetulan salah ketik di ${enData.fixedEntries} entri tercatat di english-corrections.json; teks lain sama persis dengan sumber`,
    enData.fixes > 100 && enRows.every(([, row]) => row.changedWithoutRecord.length === 0 && row.unchangedWithRecord.length === 0 && row.meta),
    enRows.flatMap(([kind, row]) => [...row.changedWithoutRecord, ...row.unchangedWithRecord].map((slug) => `${kind}/${slug}`)).join(', '))
  check('Deskripsi Inggris: tidak ada sisa salah ketik yang dikenal (pola y→g, OCR, huruf besar di tengah kalimat, apostrof aksen)', enData.typosLeft.length === 0, enData.typosLeft.slice(0, 5).join(' | '))
  check('descriptionOriginal di file data tetap apa adanya (salah ketiknya masih ada di sana)', enData.originalChanged.length === 0, enData.originalChanged.slice(0, 5).join(', '))
  check('Deskripsi Inggris: yang disembunyikan di versi Indonesia juga tidak ada; teks sumber berbahasa Spanyol diterjemahkan & ditandai di _meta',
    enRows.every(([, row]) => row.leakedHidden.length === 0) && enData.kinds.recipes.foreign.length === 2 && enRows.every(([, row]) => row.foreign.every((item) => item.ok)),
    JSON.stringify(enData.kinds.recipes.foreign))
  const enDetail = async (route) => { await main.go(route); return evaluate(`document.querySelector('.entry-detail__description')?.textContent.trim()`) }
  const enShown = {
    whitefish: await enDetail('/en/wildlife/fish/common-whitefish'),
    moonfish: await enDetail('/en/wildlife/fish/moonfish'),
    violet: await enDetail('/en/recipes/violet-roll-cake'),
    hidden: await enDetail('/en/recipes/mandarin-milkshake'),
    hiddenBug: await enDetail('/en/wildlife/bugs/colorful-brick-large-red-damselfly'),
    none: await enDetail('/en/wildlife/fish/asian-arowana'),
  }
  check('Detail /en: deskripsi dengan salah ketik yang sudah dibetulkan ("easily", "Mid-Autumn")',
    enShown.whitefish === "It has a slender body and won't move easily once it finds a place it likes." && /Mid-Autumn Festival moon/.test(enShown.moonfish), `${enShown.whitefish} | ${enShown.moonfish}`)
  check('Detail /en: deskripsi asal Spanyol tampil dalam bahasa Inggris; yang disembunyikan & yang tidak ada di sumber "No description available yet."',
    enShown.violet === "A purple cake like soft mist. It's sure to bring you sweet dreams." && [enShown.hidden, enShown.hiddenBug, enShown.none].every((text) => text === 'No description available yet.'),
    `${enShown.violet} | ${enShown.hidden} | ${enShown.none}`)
  await main.go('/en/recipes/tiramisu')
  const enNumbers = await evaluate(`({ prices: [...document.querySelectorAll('.panel--hero .market-value__amount')].map((e) => e.firstChild.textContent), text: document.querySelector('.site').innerText })`)
  await main.go('/en/wildlife/fish/sea-bass')
  const enHint = await evaluate(`document.querySelector('.availability__hint')?.textContent`)
  await main.go('/en/ingredients/yellow-sugar')
  const enObtained = await evaluate(`[...document.querySelectorAll('.spec')].find((s) => s.textContent.includes('Obtained from'))?.querySelector('dd').innerText.replace(/\\n/g, ' ')`)
  check('/en: angka en-US ("4,240"), jam "06:00–12:00", dan teks data (tempat membeli bahan) berbahasa Inggris',
    enNumbers.prices.includes('4,240') && enHint === '06:00–12:00' && enObtained === "Doris's store only in Rainbow weather", `${enNumbers.prices.join(' ')} · ${enHint} · ${enObtained}`)

  // Isian manual (data/manual/descriptions.json): daftar lengkap, dan kolom "en" yang terisi dipakai sebagai deskripsi.
  const manual = await evaluate(`(async () => {
    const kinds = ${JSON.stringify(KINDS)}
    const { _meta, ...rows } = (await import('/data/manual/descriptions.json')).default
    const out = { source: _meta?.source, kinds: {}, wrong: [] }
    for (const [kind, path] of Object.entries(kinds)) {
      const entries = Object.values(await import(path)).find((v) => Array.isArray(v) && v[0]?.slug)
      const expected = entries.filter((e) => !e.description).map((e) => e.slug)
      const listed = Object.keys(rows[kind] ?? {})
      out.kinds[kind] = listed.length
      if (JSON.stringify(expected) !== JSON.stringify(listed)) out.wrong.push(kind)
      for (const [slug, row] of Object.entries(rows[kind] ?? {})) {
        if (!row.name || !row.reason || ['en', 'id', 'th'].some((key) => typeof row[key] !== 'string')) out.wrong.push(kind + '/' + slug)
      }
    }
    return out
  })()`)
  const manualTotal = Object.values(manual.kinds).reduce((sum, count) => sum + count, 0)
  check(`Isian manual: data/manual/descriptions.json memuat persis ${manualTotal} entri tanpa deskripsi (nama, alasan, kolom en/id/th), sumber "in-game"`,
    manual.source === 'in-game' && manual.wrong.length === 0 && manualTotal > 0 && manual.kinds.fish === 13, `${JSON.stringify(manual.kinds)} ${manual.wrong.join(' ')}`)
  const sync = readFileSync(new URL('scripts/heartodex-sync.mjs', ROOT), 'utf8')
  check('Skrip sinkron tidak pernah menulis ke data/manual (aturannya tercatat di skrip)', /data\/manual\/descriptions\.json/.test(sync) && !/writeFile\([^\n]*manual/i.test(sync))

  // Isian dicoba tanpa mengubah berkasnya: modul JSON-nya dicegat dan diganti versi yang sebagian kolomnya terisi.
  const manualTab = await freshTab()
  const manualRows = JSON.parse(readFileSync(new URL('data/manual/descriptions.json', ROOT), 'utf8'))
  manualRows.fish['asian-arowana'] = { ...manualRows.fish['asian-arowana'], en: 'A shimmering dragon of the river.', id: 'Naga sungai yang berkilauan.', th: '' }
  manualRows.recipes['mandarin-milkshake'] = { ...manualRows.recipes['mandarin-milkshake'], en: 'Chunks of fresh mandarin bring zest to this milkshake.' }
  await manualTab.send('Fetch.enable', { patterns: [{ urlPattern: '*data/manual/descriptions.json*' }] })
  manualTab.on('Fetch.requestPaused', ({ requestId }) => {
    manualTab.send('Fetch.fulfillRequest', {
      requestId,
      responseCode: 200,
      responseHeaders: [{ name: 'Content-Type', value: 'text/javascript' }],
      body: Buffer.from(`export default ${JSON.stringify(manualRows)}`).toString('base64'),
    })
  })
  const manualText = async (route) => { await manualTab.go(route, 2200); return manualTab.evaluate(`document.querySelector('.entry-detail__description')?.textContent.trim()`) }
  const filled = {
    en: await manualText('/en/wildlife/fish/asian-arowana'),
    id: await manualText('/wildlife/fish/asian-arowana'),
    th: await manualText('/th/wildlife/fish/asian-arowana'),
    hiddenEn: await manualText('/en/recipes/mandarin-milkshake'),
    hiddenId: await manualText('/recipes/mandarin-milkshake'),
    other: await manualText('/en/wildlife/fish/lionhead'),
  }
  check('Isian manual: kolom "en" yang terisi tampil sebagai deskripsi di /en (juga untuk entri yang disembunyikan), mengalahkan data sumber',
    filled.en === 'A shimmering dragon of the river.' && filled.hiddenEn === 'Chunks of fresh mandarin bring zest to this milkshake.' && filled.other === 'No description available yet.', `${filled.en} | ${filled.hiddenEn}`)
  check('Isian manual: versi Indonesia & Thai memakai terjemahan di berkas yang sama; yang belum diterjemahkan tetap "belum tersedia"',
    filled.id === 'Naga sungai yang berkilauan.' && filled.th === 'ยังไม่มีคำอธิบาย' && filled.hiddenId === 'Deskripsi belum tersedia.', `${filled.id} | ${filled.th} | ${filled.hiddenId}`)

  // Tab utama kembali ke depan (tab yang tersembunyi tidak menjalankan requestAnimationFrame).
  await main.send('Page.bringToFront')

  // ================= 1b. Routing /th, teks antarmuka, data =================

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
    const [{ default: id }, { default: th }, { default: en }] = await Promise.all([import('/src/i18n/messages/id.json'), import('/src/i18n/messages/th.json'), import('/src/i18n/messages/en.json')])
    const skip = (k) => k.startsWith('dataText.') || k.endsWith('.unit')
    const idKeys = keys(id).filter((k) => !skip(k)), thKeys = keys(th).filter((k) => !skip(k)), enKeys = keys(en).filter((k) => !skip(k))
    // Saran versi Inggris tidak punya baris Inggris tambahan, jadi kunci itu sengaja kosong di en.json; pemisah
    // keterangan di deskripsi meta (seo.separator) memang hanya spasi di versi Indonesia & Inggris.
    const emptyOf = (messages, list, allowed = []) => list.filter((k) => k !== 'seo.separator' && !allowed.includes(k) && !String(k.split('.').reduce((o, p) => o?.[p], messages) ?? '').trim())
    const kinds = ${JSON.stringify(KINDS)}
    const out = { idKeys: idKeys.length, missingTh: idKeys.filter((k) => !thKeys.includes(k)), extraTh: thKeys.filter((k) => !idKeys.includes(k)), emptyTh: emptyOf(th, thKeys),
      missingEn: idKeys.filter((k) => !enKeys.includes(k)), extraEn: enKeys.filter((k) => !idKeys.includes(k)), emptyEn: emptyOf(en, enKeys, ['suggestion.english']), emptyId: emptyOf(id, idKeys),
      dataTextEn: Object.keys(th.dataText).filter((k) => !en.dataText[k]), kinds: {} }
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
    coverage.missingTh.length === 0 && coverage.extraTh.length === 0 && coverage.emptyTh.length === 0 && coverage.emptyId.length === 0, [...coverage.missingTh, ...coverage.extraTh, ...coverage.emptyTh, ...coverage.emptyId].join(', '))
  check(`Teks antarmuka: ${coverage.idKeys} kunci id punya pasangan en (tidak ada yang kurang, lebih, atau kosong), termasuk teks data (tempat membeli bahan)`,
    coverage.missingEn.length === 0 && coverage.extraEn.length === 0 && coverage.emptyEn.length === 0 && coverage.dataTextEn.length === 0, [...coverage.missingEn, ...coverage.extraEn, ...coverage.emptyEn, ...coverage.dataTextEn].join(', '))
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
  // Rewrite hanya dipakai kalau tidak ada berkas statis (Vercel mendahulukan berkas); yang pertama cocok yang berlaku.
  const rewriteOf = (path) => vercel.rewrites.find((rule) => new RegExp(`^${rule.source.replace('/:path*', '(?:/.*)?')}$`).test(path))?.destination ?? null
  const redirects = vercel.redirects.map((r) => `${r.source}>${r.destination}`).join()
  const fallbacks = ['/th/wildlife/fish/nope', '/th', '/en/recipes/nope', '/en', '/nope/x', '/wildlife/fish/nope', '/api/geo', '/thailand'].map(rewriteOf)
  check('vercel.json: alamat tanpa berkas statis jatuh ke index.html bahasanya (/th/... → /th/index.html, /en/... → /en/index.html, lainnya → /index.html, bukan /api); /id diarahkan permanen',
    JSON.stringify(fallbacks) === JSON.stringify(['/th/index.html', '/th/index.html', '/en/index.html', '/en/index.html', '/index.html', '/index.html', null, '/index.html']) && redirects === '/id>/,/id/:path*>/:path*' && vercel.redirects.every((r) => r.permanent),
    `${fallbacks.join(' ')} · ${redirects}`)
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
  check('Pemilih bahasa: "Indonesia", "ไทย" & "English" (lang & hreflang sesuai, bahasa sekarang aria-current) ke halaman yang sama termasuk filter',
    JSON.stringify(opened.links) === JSON.stringify([
      { text: 'Indonesia', href: LIST, lang: 'id', hreflang: 'id', current: 'true' },
      { text: 'ไทย', href: `/th${LIST}`, lang: 'th', hreflang: 'th', current: null },
      { text: 'English', href: `/en${LIST}`, lang: 'en', hreflang: 'en', current: null },
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
  check('Pemilih bahasa footer: tautan Indonesia, ไทย & English ke halaman yang sama, bahasa sekarang ditandai',
    JSON.stringify(footer) === JSON.stringify([{ text: 'Indonesia', href: LIST, current: null }, { text: 'ไทย', href: `/th${LIST}`, current: 'true' }, { text: 'English', href: `/en${LIST}`, current: null }]), footer.map((link) => `${link.text} ${link.href}`).join(' · '))
  await evaluate(`[...document.querySelectorAll('.site-footer__language a')].find((a) => a.lang === 'en').click()`); await sleep(1500)
  const toEnglish = await evaluate(`({ url: location.pathname + location.search, lang: document.documentElement.lang, stored: localStorage.getItem('hdx-lang'), label: document.querySelector('.language-menu__button').getAttribute('aria-label'), heading: document.querySelector('.list-status__count').textContent, chips: document.querySelectorAll('.active-chip').length })`)
  check('Pilih "English": halaman yang sama di /en dengan filter URL tetap aktif, pilihan disimpan',
    toEnglish.url === `/en${LIST}` && toEnglish.lang === 'en' && toEnglish.stored === 'en' && toEnglish.chips === 2 && /^Showing \d+ of 124 fish$/.test(toEnglish.heading.trim()) && toEnglish.label === 'Choose language (English)',
    `${toEnglish.url} · ${toEnglish.chips} chip · ${toEnglish.heading}`)
  await evaluate(`[...document.querySelectorAll('.site-footer__language a')].find((a) => a.lang === 'id').click()`); await sleep(1500)
  const back = await evaluate(`({ url: location.pathname + location.search, lang: document.documentElement.lang, stored: localStorage.getItem('hdx-lang') })`)
  check('Footer "Indonesia": kembali ke halaman yang sama tanpa awalan, pilihan disimpan', back.url === LIST && back.lang === 'id' && back.stored === 'id', JSON.stringify(back))
  await evaluate(`localStorage.setItem('hdx-lang', 'th')`)
  await main.go('/recipes?q=cake', 2200)
  const remembered = await main.url()
  await evaluate(`localStorage.setItem('hdx-lang', 'id')`)
  await main.go('/th/recipes', 2200)
  const explicitTh = await main.url()
  await evaluate(`localStorage.setItem('hdx-lang', 'en')`)
  await main.go('/recipes?q=cake', 2200)
  const rememberedEn = await main.url()
  await main.go('/th/recipes', 2200)
  const explicitThForEn = await main.url()
  await main.go('/id/crops', 2200)
  const fromIdForEn = await main.url()
  await evaluate(`localStorage.setItem('hdx-lang', 'id')`)
  check('Pilihan diingat: pemilih Thai/Inggris yang membuka alamat tanpa awalan diarahkan ke /th atau /en halaman yang sama; alamat berawalan tetap dihormati',
    remembered === '/th/recipes?q=cake' && explicitTh === '/th/recipes' && rememberedEn === '/en/recipes?q=cake' && explicitThForEn === '/th/recipes' && fromIdForEn === '/en/crops',
    `${remembered} · ${explicitTh} · ${rememberedEn} · ${explicitThForEn} · ${fromIdForEn}`)

  // ================= 3. Notifikasi saran bahasa =================
  // Tabel aturan (src/i18n/suggestLocale.js), diuji langsung: bahasa browser + negara → bahasa yang disarankan.
  const rules = await evaluate(`(async () => {
    const { suggestLocale, needsCountry } = await import('/src/i18n/suggestLocale.js')
    return ${JSON.stringify(SUGGEST_RULES)}.map(([languages, country, expected]) => ({ languages, country, expected, got: suggestLocale(languages, country), needs: needsCountry(languages) }))
  })()`)
  const wrongRules = rules.filter((rule) => rule.got !== rule.expected)
  check(`Aturan saran bahasa: ${SUGGEST_RULES.length} kombinasi bahasa browser & negara menghasilkan saran yang benar (th/lo & TH/LA → Thai, id & ID → Indonesia, ms → tidak ada, en → Inggris hanya kalau negara diketahui & bukan ID, bahasa lain → Inggris kecuali ID)`,
    wrongRules.length === 0, wrongRules.map((rule) => `${rule.languages.join(',') || '(kosong)'} + ${rule.country} → ${rule.got} (harusnya ${rule.expected})`).join(' | '))
  check('Aturan saran bahasa: negara hanya ditanyakan kalau bahasa browser tidak memuat th, lo, id, atau ms',
    rules.every((rule) => rule.needs === !rule.languages.some((tag) => /^(th|lo|id|ms)(-|$)/i.test(tag))), rules.filter((rule) => rule.needs === rule.languages.some((tag) => /^(th|lo|id|ms)(-|$)/i.test(tag))).map((rule) => rule.languages.join(',')).join(' | '))
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
  check('Saran bahasa: browser berbahasa Inggris tidak mendapat saran kalau negaranya ID atau data negara tidak tersedia (api/geo tidak ada di dev)', !(await toast(noHint)) && !(await toast(plain)) && noHint.geoRequests === 1)

  // Bahasa Inggris: hanya kalau negara diketahui dan bukan ID.
  const english = await freshTab({ geo: 'US' })
  await english.go('/recipes?q=cake', 500)
  await english.waitFor(`document.querySelector('.lang-suggest')`, 6000)
  await sleep(500)
  const sen = await toast(english)
  const enFontLoaded = await english.evaluate(`!!document.getElementById('font-th')`)
  check('Saran bahasa Inggris (browser en + negara US): "Hello! 👋", teks & tombol "✓ Switch to English" ke halaman yang sama di /en, tombol X, tanpa baris Inggris tambahan, lang="en"',
    sen?.lang === 'en' && sen.role === 'dialog' && sen.title === SUGGEST_EN.title && sen.text === SUGGEST_EN.text && sen.action === `✓${SUGGEST_EN.button}` && sen.actionHref === '/en/recipes?q=cake' && sen.close === SUGGEST_EN.close && sen.english === undefined && !enFontLoaded,
    sen && `${sen.title} · ${sen.text} · ${sen.action} · ${sen.actionHref} · X ${sen.close}`)
  check('Saran bahasa Inggris: tidak menyebut deteksi lokasi pengunjung', sen && !/location|detect|country|region/i.test(sen.all), sen?.all)
  await english.evaluate(`document.querySelector('.lang-suggest__action').click()`); await sleep(1500)
  const acceptedEn = await english.evaluate(`({ url: location.pathname + location.search, lang: document.documentElement.lang, stored: localStorage.getItem('hdx-lang'), gone: !document.querySelector('.lang-suggest') })`)
  check('Saran bahasa Inggris: tombol pindah membuka halaman yang sama di /en (dengan query) dan pilihan disimpan',
    acceptedEn.url === '/en/recipes?q=cake' && acceptedEn.lang === 'en' && acceptedEn.stored === 'en' && acceptedEn.gone, JSON.stringify(acceptedEn))

  const japanese = await freshTab({ languages: ['ja-JP', 'ja'] })
  await japanese.go('/wildlife', 500)
  const jaShown = await japanese.waitFor(`document.querySelector('.lang-suggest[lang="en"]')`, 6000)
  const french = await freshTab({ languages: ['fr-FR', 'fr', 'en'] })
  await french.go('/th/crops', 500)
  const frShown = await french.waitFor(`document.querySelector('.lang-suggest[lang="en"] .lang-suggest__action[href="/en/crops"]')`, 6000)
  check('Saran bahasa: bahasa browser lain (ja, fr) mendapat saran Inggris walau data negara tidak tersedia, juga di halaman Thai', jaShown && frShown, `ja ${jaShown} · fr ${frShown}`)
  const japaneseInId = await freshTab({ languages: ['ja-JP', 'ja'], geo: 'ID' })
  await japaneseInId.go('/', 3500)
  const jaIdNone = !(await toast(japaneseInId))
  await japaneseInId.go('/th', 500)
  const jaIdOnThai = await japaneseInId.waitFor(`document.querySelector('.lang-suggest[lang="id"]')`, 6000)
  check('Saran bahasa: bahasa browser lain di negara ID tidak disarankan pindah dari versi Indonesia, dan disarankan Indonesia di halaman Thai', jaIdNone && jaIdOnThai, `${jaIdNone} · ${jaIdOnThai}`)

  const malay = await freshTab({ languages: ['ms-MY', 'ms', 'en'], geo: 'TH' })
  await malay.go('/', 3500)
  check('Saran bahasa: bahasa browser Melayu (ms) tidak disarankan pindah dari versi Indonesia (negara tidak ditanyakan)', !(await toast(malay)) && malay.geoRequests === 0, `${malay.geoRequests} request`)

  const sameLanguage = [
    await freshTab({ languages: ['th-TH', 'th'], geo: 'TH' }),
    await freshTab({ geo: 'US' }),
    await freshTab({ languages: ['id-ID', 'id'], geo: 'ID' }),
  ]
  await sameLanguage[0].go('/th/wildlife', 3500)
  await sameLanguage[1].go('/en/wildlife', 3500)
  await sameLanguage[2].go('/wildlife', 3500)
  const sameToasts = [await toast(sameLanguage[0]), await toast(sameLanguage[1]), await toast(sameLanguage[2])]
  check('Saran bahasa: tidak muncul kalau bahasa yang disarankan sama dengan bahasa halaman (Thai di /th, Inggris di /en, Indonesia di /)', sameToasts.every((item) => !item), sameToasts.map((item) => item?.lang ?? '-').join(' '))

  const idOnEnglish = await freshTab({ languages: ['id-ID', 'id'] })
  await idOnEnglish.go('/en/wildlife', 500)
  await idOnEnglish.waitFor(`document.querySelector('.lang-suggest')`, 6000)
  await sleep(400)
  const sidEn = await toast(idOnEnglish)
  check('Saran bahasa di versi Inggris untuk bahasa browser id: teks Indonesia (lang="id") + baris Inggris, tombol ke halaman yang sama tanpa awalan',
    sidEn?.lang === 'id' && sidEn.title === SUGGEST_ID.title && sidEn.english === SUGGEST_ID.english && sidEn.action === `✓${SUGGEST_ID.button}` && sidEn.actionHref === '/wildlife', sidEn && `${sidEn.title} · ${sidEn.action} · ${sidEn.actionHref}`)

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
      console.log(`\n=== Tiga bahasa (Indonesia, Thai, Inggris) — lebar ${width}px`)
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
