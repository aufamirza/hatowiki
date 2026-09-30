#!/usr/bin/env node
/**
 * Uji SEO tiga bahasa:
 * - Di browser (dev server, Chrome headless): tiap halaman memasang judul, meta description, canonical, og:title,
 *   og:description, og:url, og:locale, dan tautan hreflang (id, th, en, x-default → Inggris) sesuai halaman & bahasanya;
 *   semuanya ikut berganti saat pindah halaman lewat router dan saat bahasa diganti; halaman tidak ditemukan diberi
 *   noindex.
 * - Seluruh situs (src/seo/pageMeta.js): tiap halaman di tiap bahasa punya judul & deskripsi sendiri, deskripsi paling
 *   panjang 160 karakter dan berbeda antarbahasa.
 * - Hasil build (dist/, jalankan `npm run build` dulu): satu HTML statis per halaman & bahasa dengan meta tag dan atribut
 *   lang yang sudah diisi (sama dengan yang dipasang di browser), sitemap.xml dengan hreflang, robots.txt, dan rewrite
 *   vercel.json yang tidak menimpa berkas statis serta jatuh ke index.html bahasanya.
 *
 * Pemakaian (dev server harus sudah jalan, dan dist/ hasil build terbaru):
 *   npm run build && npm run dev
 *   node scripts/qa/seo.test.mjs          → lebar 1280
 *
 * Variabel lingkungan: BASE_URL (bawaan http://localhost:5173), CHROME_PATH (lokasi Chrome/Edge).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { openTab, sleep, startChrome } from './cdp.mjs'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173'
const WIDTHS = process.argv.slice(2).map(Number).filter(Boolean)
const PORT = 9860 + Math.floor(Math.random() * 30)
const ROOT = new URL('../../', import.meta.url)
const DIST = fileURLToPath(new URL('dist/', ROOT))
const SITE = 'https://www.hatowiki.site'
const LOCALES = [
  { id: 'id', prefix: '', ogLocale: 'id_ID' },
  { id: 'th', prefix: '/th', ogLocale: 'th_TH' },
  { id: 'en', prefix: '/en', ogLocale: 'en_US' },
]
// Judul & deskripsi yang diharapkan, ditulis ulang di sini supaya uji tidak memakai kode aplikasi untuk memeriksa dirinya.
const EXPECTED = {
  '/': {
    id: ['Hatowiki | Wiki Komunitas Heartopia', 'Wiki komunitas Heartopia berbahasa Indonesia: ikan, serangga, burung, hewan, resep, tanaman, collectibles, dan bahan masak, dengan jadwal, lokasi, dan harga.'],
    th: ['Hatowiki | วิกิชุมชน Heartopia', 'วิกิชุมชน Heartopia ภาษาไทย: ปลา แมลง นก สัตว์ สูตรอาหาร พืชผล วัตถุดิบธรรมชาติ และวัตถุดิบทำอาหาร พร้อมช่วงเวลาที่ปรากฏ สภาพอากาศ สถานที่ และราคา'],
    en: ['Hatowiki | Heartopia Community Wiki', 'A community wiki for Heartopia: fish, bugs, birds, animals, recipes, crops, collectibles, and ingredients, with schedules, weather, locations, and prices.'],
  },
  '/wildlife/fish': {
    id: ['Fish | Hatowiki', 'Daftar 124 ikan Heartopia beserta level, lokasi, waktu muncul, cuaca, dan harga jualnya. Cari dan filter untuk menemukan ikan yang kamu butuhkan.'],
    th: ['Fish | Hatowiki', 'รวมปลาใน Heartopia ทั้ง 124 ชนิด พร้อมเลเวล สถานที่ ช่วงเวลาที่ปรากฏ สภาพอากาศ และราคาขาย ค้นหาและกรองเพื่อหาปลาที่ต้องการได้เลย'],
    en: ['Fish | Hatowiki', 'All 124 Heartopia fish with their level, location, schedule, weather, and sell price. Search and filter to find the fish you need.'],
  },
  '/wildlife/fish/sea-bass': {
    id: ['Sea Bass | Hatowiki', 'Sea Bass, ikan level 1 di Heartopia. Lokasi: All Seas & Ocean. Waktu muncul: Semua waktu. Cuaca: Semua cuaca. Harga jual: 75–600 koin.'],
    th: ['Sea Bass | Hatowiki', 'Sea Bass ปลาเลเวล 1 ใน Heartopia · สถานที่: All Seas & Ocean · ช่วงเวลาที่ปรากฏ: ทุกช่วงเวลา · สภาพอากาศ: ทุกสภาพอากาศ · ราคาขาย: 75–600 เหรียญ'],
    en: ['Sea Bass | Hatowiki', 'Sea Bass: a level 1 fish in Heartopia. Location: All Seas & Ocean. Appears: Any time. Weather: Any weather. Sells for 75–600 coins.'],
  },
  '/recipes/tiramisu': {
    id: ['Tiramisu | Hatowiki', 'Tiramisu, resep level 6 di Heartopia. Energi: +65–130. Bahan: Coffee Beans, Cheese, Milk, Egg. Harga jual: 530–4.240 koin.'],
    th: ['Tiramisu | Hatowiki', 'Tiramisu สูตรอาหารเลเวล 6 ใน Heartopia · พลังงาน: +65–130 · ส่วนผสม: Coffee Beans, Cheese, Milk, Egg · ราคาขาย: 530–4,240 เหรียญ'],
    en: ['Tiramisu | Hatowiki', 'Tiramisu: a level 6 recipe in Heartopia. Energy: +65–130. Ingredients: Coffee Beans, Cheese, Milk, Egg. Sells for 530–4,240 coins.'],
  },
  '/ingredients/egg': {
    id: ['Egg (Bahan Masak) | Hatowiki', 'Egg, bahan masak di Heartopia. Harga beli: 100 koin. Didapat dari: Toko Massimo. Dipakai di 46 resep.'],
    th: ['Egg (วัตถุดิบทำอาหาร) | Hatowiki','Egg วัตถุดิบทำอาหารใน Heartopia · ราคาซื้อ: 100 เหรียญ · หาได้จาก: ร้าน Massimo · ใช้ในสูตรอาหาร 46 สูตร'],
    en: ['Egg (Ingredients) | Hatowiki', "Egg: a cooking ingredient in Heartopia. Buy price: 100 coins. Obtained from: Massimo's store. Used in 46 recipes."],
  },
}
const urlOf = (route, locale) => SITE + (route === '/' ? locale.prefix || '/' : locale.prefix + route)
const alternatesOf = (route) => [...LOCALES.map((locale) => [locale.id, urlOf(route, locale)]), ['x-default', urlOf(route, LOCALES[2])]]

// Meta tag dari HTML mentah (tanpa menjalankan JavaScript), seperti yang dibaca crawler.
function readHead(html) {
  const decode = (text) => text?.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  const attr = (pattern) => decode(html.match(pattern)?.[1])
  return {
    lang: attr(/<html lang="([^"]*)"/),
    title: decode(html.match(/<title>([^<]*)<\/title>/)?.[1]),
    description: attr(/<meta name="description" content="([^"]*)"/),
    canonical: attr(/<link rel="canonical" href="([^"]*)"/),
    ogLocale: attr(/<meta property="og:locale" content="([^"]*)"/),
    ogUrl: attr(/<meta property="og:url" content="([^"]*)"/),
    ogTitle: attr(/<meta property="og:title" content="([^"]*)"/),
    ogDescription: attr(/<meta property="og:description" content="([^"]*)"/),
    ogImage: attr(/<meta property="og:image" content="([^"]*)"/),
    alternates: [...html.matchAll(/<link rel="alternate" hreflang="([^"]*)" href="([^"]*)"/g)].map((match) => [match[1], decode(match[2])]),
    app: /<div id="root"><\/div>/.test(html) && /<script type="module"[^>]*src="\/assets\//.test(html),
  }
}

const HEAD_PROBE = `(() => {
  const content = (selector) => document.head.querySelector(selector)?.getAttribute('content') ?? null
  return {
    lang: document.documentElement.lang, title: document.title, description: content('meta[name="description"]'),
    canonical: document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
    ogLocale: content('meta[property="og:locale"]'), ogUrl: content('meta[property="og:url"]'), ogTitle: content('meta[property="og:title"]'),
    ogDescription: content('meta[property="og:description"]'), ogImage: content('meta[property="og:image"]'), robots: content('meta[name="robots"]'),
    alternates: [...document.head.querySelectorAll('link[rel="alternate"][hreflang]')].map((link) => [link.getAttribute('hreflang'), link.getAttribute('href')]),
  }
})()`

// Sama untuk HTML statis & browser: judul, deskripsi, lang, canonical, Open Graph, hreflang sebuah halaman.
function headProblems(head, route, locale, [title, description]) {
  const problems = []
  const expect = (name, actual, wanted) => { if (actual !== wanted) problems.push(`${name}: "${actual}"`) }
  expect('lang', head.lang, locale.id)
  expect('title', head.title, title)
  expect('description', head.description, description)
  expect('canonical', head.canonical, urlOf(route, locale))
  expect('og:url', head.ogUrl, urlOf(route, locale))
  expect('og:locale', head.ogLocale, locale.ogLocale)
  expect('og:title', head.ogTitle, title)
  if (route !== '/') expect('og:description', head.ogDescription, description)
  expect('og:image', head.ogImage, `${SITE}/og-image.jpg`)
  expect('hreflang', JSON.stringify(head.alternates), JSON.stringify(alternatesOf(route)))
  return problems
}

async function runSuite(width) {
  const results = []
  const check = (name, ok, detail) => {
    results.push(Boolean(ok))
    console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${name}${detail ? `  — ${detail}` : ''}`)
  }
  const tab = await openTab(PORT, width)
  const { send, evaluate } = tab
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })
  await send('Storage.clearDataForOrigin', { origin: BASE_URL, storageTypes: 'local_storage,session_storage' })
  const go = async (route, wait = 1800) => {
    await send('Page.navigate', { url: BASE_URL + route })
    await sleep(wait)
  }

  // ================= 1. Meta tag di browser =================
  const routes = Object.keys(EXPECTED)
  for (const locale of LOCALES) {
    const problems = []
    for (const route of routes) {
      await go(locale.prefix + (route === '/' ? (locale.prefix ? '' : '/') : route), locale.id === 'id' ? 1500 : 2000)
      const found = headProblems(await evaluate(HEAD_PROBE), route, locale, EXPECTED[route][locale.id])
      if (found.length) problems.push(`${route} → ${found.join('; ')}`)
    }
    check(`Browser, bahasa ${locale.id}: judul, deskripsi, canonical, og:title/description/url/locale, og:image, dan hreflang (id, th, en, x-default → en) benar di ${routes.length} halaman`,
      problems.length === 0, problems.slice(0, 2).join(' | ') || EXPECTED['/wildlife/fish/sea-bass'][locale.id][1])
  }

  // Pindah halaman lewat router & ganti bahasa: meta ikut berganti tanpa memuat ulang.
  await go('/en/wildlife/fish')
  await evaluate('window.__spa = true')
  await evaluate(`document.querySelector('a.entry-card[href="/en/wildlife/fish/sea-bass"]').click()`)
  await sleep(900)
  const afterCard = await evaluate(HEAD_PROBE)
  const cardProblems = headProblems(afterCard, '/wildlife/fish/sea-bass', LOCALES[2], EXPECTED['/wildlife/fish/sea-bass'].en)
  await evaluate(`[...document.querySelectorAll('.site-footer__language a')].find((a) => a.lang === 'th').click()`)
  await sleep(1800)
  const afterSwitch = await evaluate(HEAD_PROBE)
  const switchProblems = headProblems(afterSwitch, '/wildlife/fish/sea-bass', LOCALES[1], EXPECTED['/wildlife/fish/sea-bass'].th)
  const stillSpa = await evaluate('window.__spa === true')
  check('Pindah halaman lewat router (kartu → detail) dan ganti bahasa: judul & semua meta ikut diperbarui tanpa memuat ulang, tautan hreflang tidak dobel',
    cardProblems.length === 0 && switchProblems.length === 0 && stillSpa && afterSwitch.alternates.length === 4, [...cardProblems, ...switchProblems].join('; ') || `${afterCard.title} → ${afterSwitch.description}`)

  await go('/en/wildlife/fish/nope')
  const missing = await evaluate(HEAD_PROBE)
  await go('/th/tidak-ada')
  const unknown = await evaluate(HEAD_PROBE)
  await evaluate(`document.querySelector('.site-header .brand').click()`)
  await sleep(900)
  const backHome = await evaluate(HEAD_PROBE)
  check('Halaman tidak ditemukan: judul & deskripsi "tidak ditemukan" dalam bahasanya dan noindex; kembali ke halaman yang ada, noindex dilepas',
    missing.title === 'Fish not found | Hatowiki' && missing.robots === 'noindex' && missing.canonical === `${SITE}/en/wildlife/fish/nope` && unknown.title === 'ไม่พบหน้านี้ | Hatowiki' && unknown.robots === 'noindex' && backHome.robots === null && backHome.title === EXPECTED['/'].th[0],
    `${missing.title} [${missing.robots}] · ${unknown.title} [${unknown.robots}] · ${backHome.title} [${backHome.robots}]`)

  // ================= 2. Seluruh situs: unik, ≤ 160 karakter, berbeda per bahasa =================
  const site = await evaluate(`(async () => {
    const { getPageMeta, listRoutes, MAX_DESCRIPTION } = await import('/src/seo/pageMeta.js')
    const messages = { id: (await import('/src/i18n/messages/id.json')).default, th: (await import('/src/i18n/messages/th.json')).default, en: (await import('/src/i18n/messages/en.json')).default }
    const routes = listRoutes()
    const out = { routes: routes.length, max: MAX_DESCRIPTION, longest: 0, shortest: Infinity, tooLong: [], notFound: [], duplicates: [], sameAcrossLanguages: [], byRoute: {} }
    const perLocale = {}
    for (const locale of Object.keys(messages)) {
      const titles = new Map(), descriptions = new Map()
      perLocale[locale] = {}
      for (const route of routes) {
        const meta = getPageMeta(route, locale, messages[locale])
        perLocale[locale][route] = meta
        if (!meta.found) out.notFound.push(locale + route)
        if (meta.description.length > MAX_DESCRIPTION) out.tooLong.push(locale + route)
        out.longest = Math.max(out.longest, meta.description.length)
        out.shortest = Math.min(out.shortest, meta.description.length)
        if (titles.has(meta.title)) out.duplicates.push(locale + ' judul ' + route + ' = ' + titles.get(meta.title))
        if (descriptions.has(meta.description)) out.duplicates.push(locale + ' deskripsi ' + route + ' = ' + descriptions.get(meta.description))
        titles.set(meta.title, route); descriptions.set(meta.description, route)
      }
    }
    for (const route of routes) {
      const texts = Object.keys(messages).map((locale) => perLocale[locale][route].description)
      if (new Set(texts).size !== texts.length) out.sameAcrossLanguages.push(route)
    }
    out.sample = Object.fromEntries(['/wildlife/bugs/blue-morpho', '/wildlife/animals/capybara', '/crops/tomato', '/collectibles/apple'].map((route) => [route, Object.keys(messages).map((locale) => perLocale[locale][route].description)]))
    out.all = Object.fromEntries(Object.keys(messages).map((locale) => [locale, Object.fromEntries(routes.map((route) => [route, [perLocale[locale][route].title, perLocale[locale][route].description]]))]))
    return out
  })()`)
  check(`Seluruh situs: ${site.routes} halaman × 3 bahasa, judul & deskripsi unik per halaman di tiap bahasa`, site.notFound.length === 0 && site.duplicates.length === 0, [...site.notFound, ...site.duplicates].slice(0, 3).join(' | '))
  check(`Deskripsi paling panjang ${site.max} karakter (terpanjang ${site.longest}, terpendek ${site.shortest}) dan berbeda di tiap bahasa`,
    site.tooLong.length === 0 && site.shortest >= 40 && site.sameAcrossLanguages.length === 0, [...site.tooLong, ...site.sameAcrossLanguages].slice(0, 4).join(' '))
  const specific = site.sample
  check('Deskripsi spesifik dari data: serangga (level, lokasi, waktu, harga), hewan (lokasi, cuaca & makanan favorit), tanaman (benih, waktu tumbuh, harga), bahan alam (lokasi, nilai jual)',
    /serangga level 7.*Lokasi: Spirit-Oak Pine Forest.*Waktu muncul: Dawn, Day, Dusk.*Harga jual: 225–1\.800 koin/.test(specific['/wildlife/bugs/blue-morpho'][0]) &&
      /Location: Crater Lake, Ruins\. Favorite weather: Rainbow, Rainy\. Favorite food: Tomato, Grape, Raspberry\./.test(specific['/wildlife/animals/capybara'][2]) &&
      /Harga benih: 10 koin\. Waktu tumbuh: 15 menit\. Harga jual: 30–70 koin\./.test(specific['/crops/tomato'][0]) &&
      /สถานที่: Residential Area · มูลค่าขาย: 28 เหรียญ/.test(specific['/collectibles/apple'][1]),
    specific['/wildlife/bugs/blue-morpho'][0])

  // ================= 3. Hasil build: HTML statis, sitemap, robots, rewrite =================
  const built = existsSync(`${DIST}index.html`)
  check('dist/ ada (hasil `npm run build`)', built, built ? '' : 'jalankan "npm run build" dulu')
  if (built) {
    const fileOf = (path) => `${DIST}${path.replace(/^\//, '')}${path === '/' ? '' : '/'}index.html`
    const countPages = (dir) => readdirSync(dir, { withFileTypes: true }).reduce((sum, item) => sum + (item.isDirectory() ? countPages(`${dir}${item.name}/`) : item.name === 'index.html' ? 1 : 0), 0)
    const perLocale = { id: countPages(DIST) - countPages(`${DIST}th/`) - countPages(`${DIST}en/`), th: countPages(`${DIST}th/`), en: countPages(`${DIST}en/`) }
    check(`HTML statis: ${site.routes} halaman per bahasa (dist/…, dist/th/…, dist/en/…)`, Object.values(perLocale).every((count) => count === site.routes), JSON.stringify(perLocale))

    const staticProblems = []
    for (const locale of LOCALES) {
      for (const route of routes) {
        const file = fileOf(locale.prefix + (route === '/' ? (locale.prefix ? '' : '/') : route))
        if (!existsSync(file)) { staticProblems.push(`${file} tidak ada`); continue }
        const head = readHead(readFileSync(file, 'utf8'))
        const found = headProblems(head, route, locale, EXPECTED[route][locale.id])
        if (!head.app) found.push('skrip aplikasi hilang')
        if (found.length) staticProblems.push(`${locale.id}${route} → ${found.join('; ')}`)
      }
    }
    check(`HTML statis (dibaca tanpa JavaScript): lang, judul, deskripsi, canonical, Open Graph, dan hreflang benar di ${routes.length} contoh halaman × 3 bahasa; aplikasi tetap dimuat`,
      staticProblems.length === 0, staticProblems.slice(0, 2).join(' | '))

    // Semua berkas statis sama dengan yang dipasang aplikasi di browser (tidak basi).
    const stale = []
    for (const locale of LOCALES) {
      for (const [route, [title, description]] of Object.entries(site.all[locale.id])) {
        const head = readHead(readFileSync(fileOf(locale.prefix + (route === '/' ? (locale.prefix ? '' : '/') : route)), 'utf8'))
        if (head.title !== title || head.description !== description || head.lang !== locale.id || head.canonical !== urlOf(route, locale)) stale.push(`${locale.id}${route}`)
      }
    }
    check(`Semua ${site.routes * 3} HTML statis sama dengan meta yang dipasang aplikasi (judul, deskripsi, lang, canonical)`, stale.length === 0, `${stale.length} berbeda: ${stale.slice(0, 3).join(' ')}`)

    const sitemap = readFileSync(`${DIST}sitemap.xml`, 'utf8')
    const entries = [...sitemap.matchAll(/<url>\s*<loc>([^<]*)<\/loc>([\s\S]*?)<\/url>/g)].map((match) => ({ loc: match[1], links: [...match[2].matchAll(/<xhtml:link rel="alternate" hreflang="([^"]*)" href="([^"]*)"/g)].map((link) => [link[1], link[2]]) }))
    const seaBass = entries.filter((entry) => entry.loc.endsWith('/wildlife/fish/sea-bass'))
    check(`sitemap.xml: ${entries.length} alamat lengkap (${site.routes} halaman × 3 bahasa), tiap alamat dengan hreflang id, th, en, dan x-default`,
      entries.length === site.routes * 3 && new Set(entries.map((entry) => entry.loc)).size === entries.length && entries.every((entry) => entry.loc.startsWith(`${SITE}/`) && entry.links.length === 4) &&
        seaBass.length === 3 && seaBass.every((entry) => JSON.stringify(entry.links) === JSON.stringify(alternatesOf('/wildlife/fish/sea-bass'))) && sitemap.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'),
      seaBass.map((entry) => entry.loc).join(' '))
    const robots = readFileSync(`${DIST}robots.txt`, 'utf8')
    check('robots.txt: semua crawler diizinkan dan menunjuk ke sitemap.xml', /^User-agent: \*\nAllow: \/\n/.test(robots) && !/Disallow: \S/.test(robots) && robots.includes(`Sitemap: ${SITE}/sitemap.xml`), robots.replace(/\n+/g, ' | '))

    // Vercel: berkas statis didahulukan; rewrite hanya untuk alamat tanpa berkas (yang pertama cocok).
    const vercel = JSON.parse(readFileSync(new URL('vercel.json', ROOT), 'utf8'))
    const served = (path) => {
      if (existsSync(fileOf(path))) return { file: fileOf(path), by: 'statis' }
      const rule = vercel.rewrites.find((item) => new RegExp(`^${item.source.replace('/:path*', '(?:/.*)?')}$`).test(path))
      return rule ? { file: `${DIST}${rule.destination.slice(1)}`, by: `rewrite ${rule.destination}` } : { file: null, by: 'tidak ada' }
    }
    const servedHead = (path) => { const { file, by } = served(path); return { by, ...(file && existsSync(file) ? readHead(readFileSync(file, 'utf8')) : {}) } }
    const cases = {
      '/th/wildlife/fish/sea-bass': servedHead('/th/wildlife/fish/sea-bass'),
      '/en/recipes/tiramisu': servedHead('/en/recipes/tiramisu'),
      '/th/wildlife/fish/nope': servedHead('/th/wildlife/fish/nope'),
      '/en/nope': servedHead('/en/nope'),
      '/nope': servedHead('/nope'),
      '/wildlife/fish?waktu=Day': servedHead('/wildlife/fish'),
    }
    check('Vercel: rewrite tidak menimpa HTML statis; alamat yang tidak ada di daftar halaman jatuh ke index.html versi bahasanya',
      cases['/th/wildlife/fish/sea-bass'].by === 'statis' && cases['/th/wildlife/fish/sea-bass'].title === 'Sea Bass | Hatowiki' && cases['/th/wildlife/fish/sea-bass'].lang === 'th' &&
        cases['/en/recipes/tiramisu'].by === 'statis' && cases['/en/recipes/tiramisu'].lang === 'en' && cases['/wildlife/fish?waktu=Day'].by === 'statis' &&
        cases['/th/wildlife/fish/nope'].by === 'rewrite /th/index.html' && cases['/th/wildlife/fish/nope'].lang === 'th' && cases['/th/wildlife/fish/nope'].title === EXPECTED['/'].th[0] &&
        cases['/en/nope'].by === 'rewrite /en/index.html' && cases['/en/nope'].lang === 'en' && cases['/nope'].by === 'rewrite /index.html' && cases['/nope'].lang === 'id',
      Object.entries(cases).map(([path, head]) => `${path}: ${head.by} (${head.lang})`).join(' · '))
  }

  const problems = tab.logs.filter((line) => !/\[vite\] connect|React DevTools|\[Vercel Web Analytics\]/.test(line))
  check('Console bersih selama uji', problems.length === 0, problems.slice(0, 3).join(' | '))
  await tab.close()
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
      console.log(`\n=== SEO tiga bahasa (meta tag, HTML statis, sitemap) — lebar ${width}px`)
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
