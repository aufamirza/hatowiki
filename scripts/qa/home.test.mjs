#!/usr/bin/env node
/**
 * Uji beranda dan toolbar global di Chrome headless (lewat Chrome DevTools Protocol), untuk lebar 1280, 820, dan 390:
 * - Toolbar: pil melayang (sticky, semi transparan + blur, fallback solid, konten tidak tertutup); menu Wildlife & Wiki
 *   (Resep, Crops, Collectibles, Ingredients, Items, NPCs, Achievements) di desktop terbuka saat hover dengan jeda (kursor lewat tidak membuka),
 *   klik, keyboard (Enter, Space, Escape, panah), dan ketuk di layar sentuh; di ponsel menu pindah ke drawer (dialog
 *   modal: fokus terkunci, Escape, klik latar, tautan menutup drawer, scroll terkunci).
 * - Tema: pengunjung pertama selalu light walau sistem dark; pilihan dari tombol diingat.
 * - Pencarian global: hasil dari semua kategori (gambar, nama, label kategori, tautan) dicocokkan dengan data,
 *   keyboard (panah, Enter, Escape), klik mouse, tanpa hasil, dan dropdown tidak melebar ke samping.
 * - Beranda: klaim & tombol mati sudah hilang; hero dengan judul besar, tagline satu kalimat, dan kolom cari global
 *   (pencarian toolbar tersembunyi selama hero terlihat), pemandangan & hiasan dari aset lokal (tidak menutupi
 *   teks, dijeda di luar layar, mati saat prefers-reduced-motion); Waktu Server berupa pita siklus hari 24 jam (empat
 *   periode, penanda tiap server di posisi jamnya dengan nama & jam, label tidak saling menutupi di semua jam, pita
 *   vertikal di ponsel, daftar teks untuk pembaca layar) sementara detail wildlife tetap versi daftar; Muncul Sekarang
 *   (server bawaan SEA, ganti server, isi & urutan dari data, hanya entri section Base Game, "Lihat semua" ke daftar
 *   berfilter waktu, baris geser dengan snap di ponsel); kartu kategori bento (ukuran dari jumlah entri, tiap baris
 *   penuh, jumlah dari data termasuk entri event, gambar sedikit keluar dari kartu).
 * - Kartu taktil: kartu beranda, kartu daftar, dan kotak detail memakai garis tepi 1,5px & bayangan keras tanpa blur
 *   berwarna tint (bukan hitam); hover tidak mengangkat kartu, ditekan kartu turun & bayangannya mengecil.
 * - Gambar entri: kotak persegi (object-fit: contain) di Muncul Sekarang, contoh gambar kartu kategori, hiasan hero,
 *   dan thumbnail pencarian; gambar tinggi (Black Stork 400×846) tidak mengubah ukuran kotak; tile Muncul Sekarang
 *   sebaris sama tinggi, nama maks. 2 baris (teks lengkap di title), badge level di pojok gambar.
 * - Footer: tombol unduh App Store, Google Play, Steam (listing resmi, tab baru, noopener); tautan X (hanya ikon kecil,
 *   aria-label & title, teks sekunder, tab baru, noopener) di baris kredit; meta Open Graph & Twitter
 *   Card dengan gambar preview 1200×630, canonical per halaman.
 * - Animasi: transisi halaman & hasil filter, gerak gambar kartu per jenis saat hover (hanya opacity/transform, mati
 *   saat prefers-reduced-motion).
 * - Kontras teks AA (light & dark, termasuk toolbar di atas hero & footer), teks hitam pekat di light, halaman tidak
 *   melebar, console bersih.
 *
 * Pemakaian (dev server harus sudah jalan):
 *   npm run dev
 *   node scripts/qa/home.test.mjs          → lebar 1280, 820, 390
 *   node scripts/qa/home.test.mjs 390      → lebar tertentu
 * (npm run test:ui menjalankan uji ini setelah uji halaman daftar.)
 *
 * Variabel lingkungan: BASE_URL (bawaan http://localhost:5173), CHROME_PATH (lokasi Chrome/Edge).
 */
import { openTab, sleep, startChrome } from './cdp.mjs'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173'
const WIDTHS = process.argv.slice(2).map(Number).filter(Boolean)
const PORT = 9800 + Math.floor(Math.random() * 150)
// Mulai lebar ini toolbar memakai menu desktop (sama dengan breakpoint di Layout.css).
const DESKTOP_MIN = 760

// Server & periode menurut sumber (lihat src/data/gameTime.js), ditulis ulang di sini supaya uji tidak memakai
// kode aplikasi untuk memeriksa dirinya sendiri.
const SERVERS = [
  { id: 'america', name: 'America', offset: -5, utc: 'UTC−5' },
  { id: 'global', name: 'Global', offset: 1, utc: 'UTC+1' },
  { id: 'sea', name: 'SEA', offset: 7, utc: 'UTC+7' },
  { id: 'tw-hk-mo', name: 'TW HK MO', offset: 8, utc: 'UTC+8' },
  { id: 'asia', name: 'Asia', offset: 9, utc: 'UTC+9' },
]
const periodAt = (hour) => (hour < 6 ? 'Night' : hour < 12 ? 'Dawn' : hour < 18 ? 'Day' : 'Dusk')
const serverClock = (offset, date = new Date()) => {
  const shifted = new Date(date.getTime() + offset * 3_600_000)
  const hours = shifted.getUTCHours()
  return { hours, clock: `${String(hours).padStart(2, '0')}:${String(shifted.getUTCMinutes()).padStart(2, '0')}` }
}

// Kode di halaman: data semua katalog, label & tautan yang diharapkan, dan normalisasi teks pencarian.
const LOAD_DATA = `
  const [{ fish }, { bugs }, { birds }, { animals }, { recipes }, { crops }, { collectibles }, { ingredients }, { hobbyItems }, { npcs }, { achievements }] = await Promise.all(
    ['/src/data/wildlife/fish.js', '/src/data/wildlife/bugs.js', '/src/data/wildlife/birds.js', '/src/data/wildlife/animals.js', '/src/data/recipes/recipes.js', '/src/data/crops/crops.js', '/src/data/collectibles/collectibles.js', '/src/data/ingredients/ingredients.js', '/src/data/hobbyItems/hobbyItems.js', '/src/data/npcs/npcs.js', '/src/data/achievements/achievements.js'].map((p) => import(p)),
  )
  const CATALOGS = [
    { slug: 'fish', name: 'Fish', label: 'Ikan', noun: 'ikan', entries: fish, list: '/wildlife/fish' },
    { slug: 'bugs', name: 'Bugs', label: 'Serangga', noun: 'serangga', entries: bugs, list: '/wildlife/bugs' },
    { slug: 'birds', name: 'Birds', label: 'Burung', noun: 'burung', entries: birds, list: '/wildlife/birds' },
    { slug: 'animals', name: 'Animals', label: 'Hewan', noun: 'hewan', entries: animals, list: '/wildlife/animals' },
    { slug: 'recipes', name: 'Recipes', label: 'Resep', noun: 'resep', entries: recipes, list: '/recipes' },
    { slug: 'crops', name: 'Crops', label: 'Tanaman', noun: 'tanaman', entries: crops, list: '/crops' },
    { slug: 'collectibles', name: 'Collectibles', label: 'Bahan Alam', noun: 'bahan alam', entries: collectibles, list: '/collectibles' },
    { slug: 'ingredients', name: 'Ingredients', label: 'Bahan Masak', noun: 'bahan masak', entries: ingredients, list: '/ingredients' },
    { slug: 'items', name: 'Items', label: 'Benda Pakai', noun: 'benda pakai', entries: hobbyItems, list: '/items' },
    { slug: 'npcs', name: 'NPCs', label: 'Penduduk Kota', noun: 'NPC', entries: npcs, list: '/npcs' },
    { slug: 'achievements', name: 'Achievements', label: 'Pencapaian', noun: 'pencapaian', entries: achievements, list: '/achievements' },
  ]
  const ALL = CATALOGS.flatMap((c) => c.entries.map((e) => ({ name: e.name, label: c.label, href: c.list + '/' + e.slug })))
  const norm = (t) => t.normalize('NFD').replace(/\\p{Diacritic}/gu, '').toLowerCase().replace(/['’]/g, '').replace(/[^\\p{L}\\p{N}]+/gu, ' ').trim()
`

// Kode di halaman: geometri tile Muncul Sekarang (kotak persegi, gambar utuh di dalamnya, nama ≤ 2 baris, badge di
// pojok kiri atas gambar) dan tinggi tile per baris. `swapTall` = ganti gambar tile pertama ke gambar tinggi dulu.
const NOW_TILES = (swapTall) => `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  const section = document.getElementById('muncul-sekarang')
  section.scrollIntoView(); await wait(300)
  const first = section.querySelector('.now-tile')
  const before = first.getBoundingClientRect().height
  if (${swapTall}) {
    const img = first.querySelector('img')
    img.loading = 'eager'; img.setAttribute('width', '400'); img.setAttribute('height', '846'); img.src = '/images/birds/black-stork.webp'
    await new Promise((r) => (img.complete && img.naturalWidth ? r() : (img.onload = img.onerror = r))); await wait(150)
  }
  const tiles = [...section.querySelectorAll('.now-tile')].map((t) => {
    const r = t.getBoundingClientRect()
    const stage = t.querySelector('.now-tile__stage').getBoundingClientRect()
    const img = t.querySelector('.now-tile__image')
    const ir = img.getBoundingClientRect()
    const name = t.querySelector('.now-tile__name')
    const nr = name.getBoundingClientRect()
    const badge = t.querySelector('.card-badge--level')?.getBoundingClientRect()
    return {
      group: t.closest('.now-group').dataset.wildlife,
      top: Math.round(r.top), h: r.height,
      stageSquare: Math.abs(stage.width - stage.height) <= 1,
      imgSquare: Math.abs(ir.width - ir.height) <= 1 && getComputedStyle(img).objectFit === 'contain',
      imgInside: ir.left >= stage.left - 0.5 && ir.right <= stage.right + 0.5 && ir.top >= stage.top - 0.5 && ir.bottom <= stage.bottom + 0.5,
      lines: Math.round(nr.height / parseFloat(getComputedStyle(name).lineHeight)),
      title: name.title === name.textContent.trim(),
      badgeCorner: !!badge && badge.left - stage.left <= 12 && badge.top - stage.top <= 12 && badge.bottom < stage.top + stage.height / 3,
    }
  })
  const rows = new Map()
  for (const t of tiles) rows.set(t.group + '|' + t.top, [...(rows.get(t.group + '|' + t.top) ?? []), t.h])
  const after = first.getBoundingClientRect().height
  return {
    count: tiles.length,
    square: tiles.every((t) => t.stageSquare && t.imgSquare && t.imgInside),
    names: tiles.every((t) => t.lines <= 2 && t.title),
    badges: tiles.every((t) => t.badgeCorner),
    rows: rows.size,
    rowSpread: Math.max(...[...rows.values()].map((hs) => Math.max(...hs) - Math.min(...hs))),
    heightChange: Math.abs(after - before),
  }
})()`

// Kode di halaman: kontras teks terhadap latar efektif (warna latar leluhur + titik warna gradien, dikomposit).
// Mengembalikan elemen teks terburuk di dalam `scope`, dengan batas 3:1 untuk teks besar dan 4,5:1 selainnya.
const CONTRAST_PROBE = `
  const COLOR_RE = /(rgba?\\([^)]*\\)|color\\(srgb[^)]*\\))/g
  const parse = (css) => {
    const nums = (css.match(/[\\d.]+/g) || []).map(Number)
    if (css.startsWith('color(srgb')) return [nums[0] * 255, nums[1] * 255, nums[2] * 255, nums[3] ?? 1]
    return [nums[0], nums[1], nums[2], nums[3] ?? 1]
  }
  const over = (top, below) => {
    const a = top[3]
    return [0, 1, 2].map((i) => top[i] * a + below[i] * (1 - a)).concat(1)
  }
  const backgrounds = (el) => {
    const layers = []
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n)
      const bg = parse(cs.backgroundColor)
      const stops = (cs.backgroundImage.match(COLOR_RE) || []).map(parse)
      layers.push({ bg, stops })
      if (bg[3] >= 1) break
    }
    let colors = [[255, 255, 255, 1]]
    for (const { bg, stops } of layers.reverse()) {
      if (bg[3] > 0) colors = colors.map((c) => over(bg, c))
      if (stops.length) colors = colors.flatMap((c) => stops.map((s) => over(s, c)))
    }
    return colors
  }
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
  const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }
  const worstContrast = (scope) => {
    let worst = null
    let count = 0
    for (const el of scope.querySelectorAll('*')) {
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
      if (!own || el.closest('[aria-hidden="true"], .visually-hidden, svg')) continue
      const rect = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      if (rect.width < 2 || rect.height < 2 || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue
      const size = parseFloat(cs.fontSize)
      const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700)
      const color = parse(cs.color)
      const r = Math.min(...backgrounds(el).map((bg) => ratio(over(color, bg), bg)))
      const need = large ? 3 : 4.5
      count++
      if (!worst || r / need < worst.ratio / worst.need) worst = { ratio: r, need, text: el.textContent.trim().slice(0, 40), cls: el.className?.baseVal ?? el.className }
    }
    return { worst, count }
  }
`

async function runSuite(width) {
  const tab = await openTab(PORT, width)
  const { send, evaluate } = tab
  // Tema awal mengikuti sistem; uji dimulai dari light supaya hasilnya sama di mesin mana pun.
  const LIGHT = { name: 'prefers-color-scheme', value: 'light' }
  await send('Emulation.setEmulatedMedia', { features: [LIGHT] })
  const results = []
  const desktop = width >= DESKTOP_MIN
  const check = (name, ok, detail) => {
    results.push(ok)
    console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${name}${detail ? `  — ${detail}` : ''}`)
  }
  const go = async (route) => { await send('Page.navigate', { url: BASE_URL + route }); await sleep(1600) }
  const press = async (key, code, vk, text, modifiers = 0) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, modifiers, ...(text ? { text } : {}) })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, modifiers })
    await sleep(150)
  }
  const KEY = {
    down: () => press('ArrowDown', 'ArrowDown', 40),
    up: () => press('ArrowUp', 'ArrowUp', 38),
    right: () => press('ArrowRight', 'ArrowRight', 39),
    end: () => press('End', 'End', 35),
    enter: () => press('Enter', 'Enter', 13, '\r'),
    escape: () => press('Escape', 'Escape', 27),
    tab: () => press('Tab', 'Tab', 9),
    shiftTab: () => press('Tab', 'Tab', 9, undefined, 8),
  }
  const mouseClick = async (point) => {
    if (!point) return
    const { x, y } = point
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
    await sleep(30)
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
    await sleep(300)
  }
  const centerOf = (expr) => evaluate(`(() => { const el = ${expr}; if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })()`)
  const overflowX = () => evaluate(`document.documentElement.scrollWidth - innerWidth`)
  const type = async (text) => { for (const char of text) { await send('Input.insertText', { text: char }); await sleep(40) } await sleep(200) }
  const pageInfo = () => evaluate(`({ path: location.pathname + location.search, title: document.querySelector('h1')?.textContent.trim() })`)
  const visible = (selector) => evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' })()`)
  const toggleTheme = async () => { await evaluate(`document.querySelector('.icon-button[aria-label^="Ganti ke mode"]').click()`); await sleep(700) }

  // ================= 1. Toolbar sticky di semua halaman =================
  for (const route of ['/', '/wildlife/fish', '/recipes/tiramisu']) {
    await go(route)
    const sticky = await evaluate(`(async () => {
      const header = document.querySelector('.site-header')
      const cs = getComputedStyle(header)
      scrollTo(0, 1400); await new Promise((r) => setTimeout(r, 250))
      const top = header.getBoundingClientRect().top
      const scrolled = scrollY
      scrollTo(0, 0)
      return { position: cs.position, cssTop: cs.top, top, scrolled, brand: document.querySelector('.site-header .brand')?.getAttribute('href'), theme: !!document.querySelector('.site-header .icon-button[aria-label^="Ganti ke mode"]') }
    })()`)
    check(`Toolbar sticky di ${route}: tetap di atas saat digulir, ada logo & tombol tema`, sticky.position === 'sticky' && sticky.cssTop === '0px' && sticky.top === 0 && sticky.scrolled > 300 && sticky.brand === '/' && sticky.theme, `scrollY ${sticky.scrolled}, top ${sticky.top}`)
  }

  // Toolbar melayang: pil (sudut membulat penuh) sedikit di bawah tepi atas, semi transparan + blur, fallback latar solid
  // di luar @supports; di beranda hero dimulai di belakang pil, di halaman lain konten dimulai di bawah pil.
  for (const route of ['/', '/wildlife/fish']) {
    await go(route)
    const pill = await evaluate(`(() => {
      const inner = document.querySelector('.site-header__inner')
      const r = inner.getBoundingClientRect()
      const cs = getComputedStyle(inner)
      const rules = [...document.styleSheets].flatMap((sheet) => { try { return [...sheet.cssRules] } catch { return [] } })
      const supports = rules.filter((rule) => rule instanceof CSSSupportsRule && /backdrop-filter/.test(rule.conditionText))
      const solid = rules.some((rule) => rule.selectorText === '.site-header__inner' && /toolbar-bg-solid/.test(rule.style.background))
      const first = document.querySelector('.site-main > *')?.getBoundingClientRect()
      return {
        top: r.top, bottom: r.bottom, height: r.height, radius: parseFloat(cs.borderTopLeftRadius),
        alpha: (cs.backgroundColor.match(/[\\d.]+/g) || []).map(Number)[3] ?? 1,
        blur: /blur\\(/.test(cs.backdropFilter || cs.webkitBackdropFilter || ''),
        fallback: solid && supports.some((rule) => [...rule.cssRules].some((inside) => inside.selectorText === '.site-header__inner')),
        contentTop: first ? first.top : null,
        passThrough: getComputedStyle(document.querySelector('.site-header')).pointerEvents === 'none' && cs.pointerEvents === 'auto',
      }
    })()`)
    const contentOk = route === '/' ? pill.contentTop === 0 : pill.contentTop >= pill.bottom - 0.5
    check(
      `Toolbar pil di ${route}: ${desktop ? 12 : 8}px dari tepi atas, sudut membulat penuh, semi transparan + blur (fallback solid), ${route === '/' ? 'hero di belakang pil' : 'konten di bawah pil'}`,
      Math.abs(pill.top - (desktop ? 12 : 8)) <= 1 && pill.height <= (desktop ? 60.5 : 52.5) && pill.radius >= pill.height / 2 - 1 && pill.alpha < 1 && pill.blur && pill.fallback && pill.passThrough && contentOk,
      JSON.stringify(pill),
    )
  }

  // ================= 1b. Tema: default light, pilihan diingat =================
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] })
  await go('/')
  await evaluate(`localStorage.removeItem('hdx-theme')`)
  await go('/')
  const firstVisit = await evaluate(`({ theme: document.documentElement.dataset.theme, stored: localStorage.getItem('hdx-theme') })`)
  await toggleTheme()
  await go('/wildlife/fish')
  const remembered = await evaluate(`document.documentElement.dataset.theme`)
  await toggleTheme()
  await go('/')
  const backToLight = await evaluate(`({ theme: document.documentElement.dataset.theme, stored: localStorage.getItem('hdx-theme') })`)
  await evaluate(`localStorage.removeItem('hdx-theme')`)
  await send('Emulation.setEmulatedMedia', { features: [LIGHT] })
  check(
    'Tema: pengunjung pertama selalu light walau sistem dark; pilihan dari tombol diingat setelah muat ulang',
    firstVisit.theme === 'light' && firstVisit.stored === null && remembered === 'dark' && backToLight.theme === 'light' && backToLight.stored === 'light',
    JSON.stringify({ firstVisit, remembered, backToLight }),
  )

  // ================= 2. Menu Wildlife & Wiki (desktop) atau drawer (ponsel) =================
  await go('/')
  const navState = await evaluate(`({
    nav: getComputedStyle(document.querySelector('.site-nav')).display,
    menuButton: getComputedStyle(document.querySelector('.site-header .menu-button')).display,
    searchToggle: getComputedStyle(document.querySelector('.global-search__toggle')).display,
    searchInput: document.querySelector('.global-search input').getBoundingClientRect().width,
  })`)
  if (desktop) {
    check('Desktop: menu Wildlife & Wiki tampil, tombol menu seluler & tombol ikon cari tersembunyi, kolom cari tampil', navState.nav === 'flex' && navState.menuButton === 'none' && navState.searchToggle === 'none' && navState.searchInput > 150, JSON.stringify(navState))

    await evaluate(`document.querySelector('.nav-menu__button').click()`); await sleep(300)
    const menu = await evaluate(`(() => {
      const button = document.querySelector('.nav-menu__button')
      const panel = document.getElementById(button.getAttribute('aria-controls'))
      const links = [...(panel?.querySelectorAll('.nav-menu__link') ?? [])]
      const r = panel?.getBoundingClientRect()
      return {
        expanded: button.getAttribute('aria-expanded'),
        items: links.map((a) => ({ name: a.querySelector('.nav-menu__name').textContent, href: a.getAttribute('href'), icon: !!a.querySelector('.nav-menu__icon svg') })),
        all: panel?.querySelector('.nav-menu__all')?.getAttribute('href'),
        inView: r && r.left >= 0 && r.right <= innerWidth,
      }
    })()`)
    check(
      'Menu Wildlife: klik membuka dropdown Fish, Bugs, Birds, Animals (tautan + ikon kategori) dan "Semua kategori"',
      menu.expanded === 'true' && menu.items.map((i) => `${i.name}>${i.href}`).join() === 'Fish>/wildlife/fish,Bugs>/wildlife/bugs,Birds>/wildlife/birds,Animals>/wildlife/animals' && menu.items.every((i) => i.icon) && menu.all === '/wildlife' && menu.inView,
      menu.items.map((i) => i.name).join(', '),
    )
    await KEY.escape()
    let focus = await evaluate(`({ open: !!document.querySelector('.nav-menu__panel'), focused: document.activeElement === document.querySelector('.nav-menu__button') })`)
    check('Menu Wildlife: Escape menutup dan fokus kembali ke tombol', !focus.open && focus.focused)
    await KEY.down()
    focus = await evaluate(`(document.activeElement.matches('.nav-menu__link') ? document.activeElement.querySelector('.nav-menu__name').textContent : document.activeElement.tagName)`)
    check('Menu Wildlife: panah bawah di tombol membuka menu & fokus ke Fish', focus === 'Fish', focus)
    await KEY.down(); await KEY.down()
    focus = await evaluate(`(document.activeElement.matches('.nav-menu__link') ? document.activeElement.querySelector('.nav-menu__name').textContent : document.activeElement.tagName)`)
    await KEY.up()
    const afterUp = await evaluate(`(document.activeElement.matches('.nav-menu__link') ? document.activeElement.querySelector('.nav-menu__name').textContent : document.activeElement.tagName)`)
    check('Menu Wildlife: panah bawah/atas berpindah antartautan', focus === 'Birds' && afterUp === 'Bugs', `${focus} → ${afterUp}`)
    await KEY.enter(); await sleep(1200)
    let page = await pageInfo()
    const closed = await evaluate(`!document.querySelector('.nav-menu__panel') && document.querySelector('.nav-menu__button').classList.contains('active')`)
    check('Menu Wildlife: Enter membuka Bugs, menu tertutup, tombol Wildlife aktif', page.path === '/wildlife/bugs' && page.title === 'Bugs' && closed, page.path)
    await evaluate(`document.querySelector('.nav-menu__button').click()`); await sleep(250)
    // Titik yang benar-benar di luar panel: tepi kanan halaman sejajar judul (judul bisa tertutup panel di layar lebar).
    const outside = await evaluate(`(() => { const h = document.querySelector('h1').getBoundingClientRect(); return { x: innerWidth - 8, y: h.top + h.height / 2 } })()`)
    await mouseClick(outside)
    const outsideState = await evaluate(`({ open: !!document.querySelector('.nav-menu__panel'), path: location.pathname })`)
    check('Menu Wildlife: klik di luar menutup menu (tanpa pindah halaman)', !outsideState.open && outsideState.path === '/wildlife/bugs', outsideState.path)
    // Menu Wiki: Resep, Crops, Collectibles, Ingredients, Items, NPCs, Achievements (tanpa tautan "Semua"); Resep tidak lagi
    // berupa tautan terpisah di toolbar.
    const buttons = await evaluate(`[...document.querySelectorAll('.site-nav .nav-menu__button')].map((b) => b.textContent.trim())`)
    const plainLinks = await evaluate(`[...document.querySelectorAll('.site-nav > a')].map((a) => a.textContent.trim())`)
    await evaluate(`[...document.querySelectorAll('.nav-menu__button')].find((b) => b.textContent.trim() === 'Wiki').click()`); await sleep(300)
    const wiki = await evaluate(`(() => {
      const button = [...document.querySelectorAll('.nav-menu__button')].find((b) => b.textContent.trim() === 'Wiki')
      const panel = document.getElementById(button.getAttribute('aria-controls'))
      const r = panel?.getBoundingClientRect()
      return {
        expanded: button.getAttribute('aria-expanded'),
        items: [...(panel?.querySelectorAll('.nav-menu__link') ?? [])].map((a) => ({ name: a.querySelector('.nav-menu__name').textContent, meta: a.querySelector('.nav-menu__meta').textContent, href: a.getAttribute('href'), icon: !!a.querySelector('.nav-menu__icon svg') })),
        all: !!panel?.querySelector('.nav-menu__all'),
        inView: r && r.left >= 0 && r.right <= innerWidth,
      }
    })()`)
    const counts = await evaluate(`(async () => { ${LOAD_DATA} return Object.fromEntries(CATALOGS.map((c) => [c.slug, c.entries.length])) })()`)
    check(
      'Toolbar: menu Wildlife & Wiki (tanpa tautan Resep terpisah); Wiki berisi Resep, Crops, Collectibles, Ingredients, Items, NPCs, Achievements (nama Inggris + label Indonesia & jumlah entri)',
      buttons.join() === 'Wildlife,Wiki' && plainLinks.length === 0 && wiki.expanded === 'true' && !wiki.all && wiki.inView && wiki.items.every((i) => i.icon) &&
        wiki.items.map((i) => `${i.name}|${i.meta}>${i.href}`).join() === `Recipes|Resep · ${counts.recipes} entri>/recipes,Crops|Tanaman · ${counts.crops} entri>/crops,Collectibles|Bahan Alam · ${counts.collectibles} entri>/collectibles,Ingredients|Bahan Masak · ${counts.ingredients} entri>/ingredients,Items|Benda Pakai · ${counts.items} entri>/items,NPCs|Penduduk Kota · ${counts.npcs} entri>/npcs,Achievements|Pencapaian · ${counts.achievements} entri>/achievements`,
      wiki.items.map((i) => `${i.name} (${i.meta})`).join(', '),
    )
    // Escape menutup menu dan mengembalikan fokus ke tombol Wiki; panah bawah membuka lagi & fokus ke tautan pertama.
    await KEY.escape()
    await KEY.down()
    const wikiFocus = await evaluate(`(document.activeElement.matches('.nav-menu__link') ? document.activeElement.querySelector('.nav-menu__name').textContent : document.activeElement.tagName)`)
    await KEY.down()
    await KEY.enter(); await sleep(1200)
    page = await pageInfo()
    const wikiActive = await evaluate(`[...document.querySelectorAll('.nav-menu__button')].map((b) => b.textContent.trim() + ':' + b.classList.contains('active')).join()`)
    check('Menu Wiki: keyboard (panah bawah) lalu Enter membuka Crops, tombol Wiki aktif & Wildlife tidak', wikiFocus === 'Recipes' && page.path === '/crops' && page.title === 'Crops' && wikiActive === 'Wildlife:false,Wiki:true', `${wikiFocus} → ${page.path} (${wikiActive})`)
    await evaluate(`[...document.querySelectorAll('.nav-menu__button')].find((b) => b.textContent.trim() === 'Wiki').click()`); await sleep(300)
    await evaluate(`[...document.querySelectorAll('.nav-menu__link')].find((a) => a.getAttribute('href') === '/recipes').click()`); await sleep(1200)
    page = await pageInfo()
    const resepActive = await evaluate(`[...document.querySelectorAll('.nav-menu__button')].find((b) => b.textContent.trim() === 'Wiki').classList.contains('active')`)
    check('Menu Wiki: Resep membuka /recipes dan tombol Wiki ditandai aktif', page.path === '/recipes' && resepActive, page.path)

    // ----- Hover dengan mouse: jeda buka & tutup; klik, keyboard, dan ketuk tetap jalan -----
    const buttonPoint = (label) => evaluate(`(() => { const b = [...document.querySelectorAll('.nav-menu__button')].find((x) => x.textContent.trim() === ${JSON.stringify(label)}); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })()`)
    const menuState = () => evaluate(`[...document.querySelectorAll('.nav-menu__button')].map((b) => b.textContent.trim() + ':' + b.getAttribute('aria-expanded')).join()`)
    const moveTo = ({ x, y }) => send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
    const away = { x: Math.round(width / 2), y: 640 }
    const CLOSED = 'Wildlife:false,Wiki:false'
    await go('/wildlife')
    await moveTo(away); await sleep(400)
    const wildlifePoint = await buttonPoint('Wildlife')
    const wikiPoint = await buttonPoint('Wiki')
    // Kursor hanya lewat (keluar sebelum jeda habis) → menu tidak terbuka.
    await moveTo(wikiPoint); await sleep(40); await moveTo(away); await sleep(400)
    const passBy = await menuState()
    // Kursor diam di tombol → belum terbuka seketika, terbuka setelah jeda singkat.
    await moveTo(wildlifePoint); await sleep(30)
    const early = await menuState()
    await sleep(320)
    const hovered = await menuState()
    check('Menu hover (mouse): kursor yang hanya lewat tidak membuka menu; kursor diam membuka menu setelah jeda singkat',
      passBy === CLOSED && early === CLOSED && hovered === 'Wildlife:true,Wiki:false', `${passBy} | ${early} | ${hovered}`)
    // Turun ke tautan di panel (melewati celah tombol–panel) → tetap terbuka.
    const linkPoint = await evaluate(`(() => { const a = document.querySelector('.nav-menu__panel .nav-menu__link'); const r = a.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })()`)
    await moveTo({ x: wildlifePoint.x, y: Math.round((wildlifePoint.y + linkPoint.y) / 2) }); await sleep(60)
    await moveTo(linkPoint); await sleep(450)
    const onPanel = await menuState()
    // Pindah ke tombol Wiki → Wiki terbuka, Wildlife langsung tertutup (satu panel saja).
    await moveTo(wikiPoint); await sleep(320)
    const switched = { state: await menuState(), panels: await evaluate(`document.querySelectorAll('.nav-menu__panel').length`) }
    // Kursor keluar → masih terbuka sesaat, lalu tertutup setelah jeda.
    await moveTo(away); await sleep(60)
    const stillOpen = await menuState()
    await sleep(450)
    const closedAfter = await menuState()
    check('Menu hover: tetap terbuka saat kursor turun ke panel; pindah ke Wiki menutup Wildlife; tertutup setelah jeda saat kursor keluar',
      onPanel === 'Wildlife:true,Wiki:false' && switched.state === 'Wildlife:false,Wiki:true' && switched.panels === 1 && stillOpen === 'Wildlife:false,Wiki:true' && closedAfter === CLOSED,
      `${onPanel} | ${switched.state} (${switched.panels} panel) | ${stillOpen} | ${closedAfter}`)
    // Hover lalu klik: klik tidak menutup menu yang baru dibuka hover, menu tetap terbuka walau kursor keluar; klik lagi menutup.
    await moveTo(wildlifePoint); await sleep(320)
    await mouseClick(wildlifePoint)
    const afterClick = await menuState()
    await moveTo(away); await sleep(500)
    const pinned = await menuState()
    await mouseClick(wildlifePoint)
    const afterSecond = await menuState()
    check('Menu hover + klik: klik tidak menutup menu yang dibuka hover dan menu tetap terbuka saat kursor keluar; klik berikutnya menutup',
      afterClick === 'Wildlife:true,Wiki:false' && pinned === 'Wildlife:true,Wiki:false' && afterSecond === CLOSED, `${afterClick} | ${pinned} | ${afterSecond}`)
    // Keyboard: Space & Enter di tombol membuka/menutup, Escape menutup.
    await evaluate(`[...document.querySelectorAll('.nav-menu__button')].find((b) => b.textContent.trim() === 'Wildlife').focus()`)
    await press(' ', 'Space', 32, ' ')
    const spaceOpen = await menuState()
    await KEY.escape()
    const escClosed = await menuState()
    await KEY.enter()
    const enterOpen = await menuState()
    await KEY.enter()
    const enterClosed = await menuState()
    check('Menu keyboard: Space & Enter di tombol membuka-menutup, Escape menutup',
      spaceOpen === 'Wildlife:true,Wiki:false' && escClosed === CLOSED && enterOpen === 'Wildlife:true,Wiki:false' && enterClosed === CLOSED, `${spaceOpen} | ${escClosed} | ${enterOpen} | ${enterClosed}`)
    // Layar sentuh: ketuk membuka (tanpa hover) dan menu tidak tertutup sendiri; ketuk lagi menutup.
    await moveTo(away); await sleep(400)
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
    const tap = async ({ x, y }) => {
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await sleep(450)
    }
    await tap(wildlifePoint)
    const tapOpen = await menuState()
    await sleep(500)
    const tapStill = await menuState()
    await tap(wildlifePoint)
    const tapClosed = await menuState()
    await send('Emulation.setTouchEmulationEnabled', { enabled: false })
    check('Menu sentuh: ketuk membuka dan menu tidak tertutup sendiri; ketuk lagi menutup',
      tapOpen === 'Wildlife:true,Wiki:false' && tapStill === tapOpen && tapClosed === CLOSED, `${tapOpen} | ${tapStill} | ${tapClosed}`)
  } else {
    check('Ponsel: menu desktop & kolom cari tersembunyi, tombol menu & tombol cari tampil', navState.nav === 'none' && navState.menuButton === 'grid' && navState.searchToggle === 'grid' && navState.searchInput === 0, JSON.stringify(navState))
    const toolbarFits = await evaluate(`(() => { const r = [...document.querySelectorAll('.site-header__inner > *, .site-header__tools > *')].map((e) => e.getBoundingClientRect()); return r.every((b) => b.right <= innerWidth && b.left >= 0) && document.querySelector('.site-header').getBoundingClientRect().height <= 64 })()`)
    check('Ponsel: toolbar satu baris, semua tombol muat di layar', toolbarFits)

    const readDrawer = () => evaluate(`(() => {
      const dialog = document.querySelector('[role="dialog"].drawer__panel')
      const button = document.querySelector('.site-header .menu-button')
      if (!dialog) return { open: false, expanded: button.getAttribute('aria-expanded'), locked: document.documentElement.classList.contains('is-drawer-open'), focusOnButton: document.activeElement === button }
      const r = dialog.getBoundingClientRect()
      return {
        open: true,
        modal: dialog.getAttribute('aria-modal'),
        label: document.getElementById(dialog.getAttribute('aria-labelledby'))?.textContent,
        expanded: button.getAttribute('aria-expanded'),
        links: [...dialog.querySelectorAll('a')].map((a) => ({ text: (a.querySelector('.drawer__name') ?? a).textContent.trim(), href: a.getAttribute('href'), icon: !!a.querySelector('.drawer__icon svg') })),
        focusInside: dialog.contains(document.activeElement),
        focusClose: document.activeElement === dialog.querySelector('.drawer__close'),
        inView: r.left >= 0 && r.right <= innerWidth + 0.5 && r.top >= 0,
        locked: getComputedStyle(document.documentElement).overflow === 'hidden',
        overflow: document.documentElement.scrollWidth - innerWidth,
      }
    })()`)
    await evaluate(`document.querySelector('.site-header .menu-button').click()`); await sleep(450)
    let drawer = await readDrawer()
    check('Drawer: tombol menu membuka dialog modal berlabel, fokus ke tombol tutup, scroll halaman terkunci', drawer.open && drawer.modal === 'true' && drawer.label === 'Menu' && drawer.expanded === 'true' && drawer.focusClose && drawer.locked && drawer.inView && drawer.overflow <= 0, JSON.stringify({ label: drawer.label, locked: drawer.locked, overflow: drawer.overflow }))
    const expectedLinks = 'Beranda>/,Fish>/wildlife/fish,Bugs>/wildlife/bugs,Birds>/wildlife/birds,Animals>/wildlife/animals,Semua kategori wildlife>/wildlife,Recipes>/recipes,Crops>/crops,Collectibles>/collectibles,Ingredients>/ingredients,Items>/items,NPCs>/npcs,Achievements>/achievements'
    const drawerGroups = await evaluate(`[...document.querySelectorAll('.drawer__group')].map((g) => g.textContent.trim()).join()`)
    check('Drawer: tautan Beranda, grup Wildlife (Fish, Bugs, Birds, Animals, Semua kategori), grup Wiki (Resep, Crops, Collectibles, Ingredients, Items, NPCs, Achievements), dengan ikon', drawer.links.map((l) => `${l.text}>${l.href}`).join() === expectedLinks && drawer.links.filter((l) => l.href !== '/wildlife').every((l) => l.icon) && drawerGroups === 'Wildlife,Wiki', drawer.links.map((l) => l.text).join(', '))
    // Tab dari elemen terakhir kembali ke elemen pertama (dan sebaliknya).
    await evaluate(`[...document.querySelectorAll('.drawer__panel a')].at(-1).focus()`)
    await KEY.tab()
    const wrapped = await evaluate(`document.activeElement === document.querySelector('.drawer__close')`)
    await KEY.shiftTab()
    const wrappedBack = await evaluate(`document.activeElement === [...document.querySelectorAll('.drawer__panel a')].at(-1)`)
    check('Drawer: fokus terkunci (Tab & Shift+Tab berputar di dalam drawer)', wrapped && wrappedBack)
    await KEY.escape()
    drawer = await readDrawer()
    check('Drawer: Escape menutup, scroll dibuka lagi, fokus kembali ke tombol menu', !drawer.open && drawer.expanded === 'false' && !drawer.locked && drawer.focusOnButton)
    await evaluate(`document.querySelector('.site-header .menu-button').click()`); await sleep(450)
    await mouseClick({ x: 20, y: 400 })
    drawer = await readDrawer()
    check('Drawer: klik latar gelap menutup drawer', !drawer.open)
    await evaluate(`document.querySelector('.site-header .menu-button').click()`); await sleep(450)
    await mouseClick(await centerOf(`[...document.querySelectorAll('.drawer__link')].find((a) => a.textContent.includes('Birds'))`))
    await sleep(1000)
    drawer = await readDrawer()
    let page = await pageInfo()
    check('Drawer: memilih Birds membuka /wildlife/birds dan drawer tertutup', page.path === '/wildlife/birds' && page.title === 'Birds' && !drawer.open && !drawer.locked, page.path)
    await evaluate(`document.querySelector('.site-header .menu-button').click()`); await sleep(450)
    await evaluate(`[...document.querySelectorAll('.drawer__link')].find((a) => a.textContent.includes('Resep')).click()`); await sleep(1000)
    page = await pageInfo()
    check('Drawer: memilih Resep membuka /recipes', page.path === '/recipes' && !(await readDrawer()).open, page.path)
    await evaluate(`document.querySelector('.site-header .menu-button').click()`); await sleep(450)
    await evaluate(`[...document.querySelectorAll('.drawer__link')].find((a) => a.getAttribute('href') === '/collectibles').click()`); await sleep(1000)
    page = await pageInfo()
    check('Drawer: memilih Collectibles membuka /collectibles', page.path === '/collectibles' && page.title === 'Collectibles' && !(await readDrawer()).open, page.path)
    // Drawer terbuka lalu layar melebar ke ukuran desktop → drawer ditutup otomatis.
    await evaluate(`document.querySelector('.site-header .menu-button').click()`); await sleep(400)
    await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 900, deviceScaleFactor: 1, mobile: false }); await sleep(400)
    drawer = await readDrawer()
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 }); await sleep(400)
    check('Drawer: tertutup sendiri saat layar melebar ke desktop', !drawer.open && !drawer.locked)
  }

  // ================= 3. Pencarian global (toolbar) =================
  // Di beranda pencarian toolbar tersembunyi selama hero terlihat (lihat 3b), jadi diuji di halaman Wildlife.
  await go('/')
  await evaluate(`localStorage.removeItem('hdx-server')`)
  await go('/wildlife')
  const openSearch = async () => {
    if (!desktop) {
      const expanded = await evaluate(`document.querySelector('.global-search__toggle').getAttribute('aria-expanded')`)
      if (expanded !== 'true') { await evaluate(`document.querySelector('.global-search__toggle').click()`); await sleep(700) }
    } else {
      await evaluate(`document.querySelector('.global-search input').focus()`)
    }
    await evaluate(`document.querySelector('.global-search input').select()`)
  }
  const readSearch = () => evaluate(`(() => {
    const input = document.querySelector('.global-search input')
    const list = document.getElementById(input.getAttribute('aria-controls') ?? '')
    const dropdown = document.querySelector('.global-search__dropdown')
    const r = dropdown?.getBoundingClientRect()
    return {
      value: input.value,
      expanded: input.getAttribute('aria-expanded'),
      active: input.getAttribute('aria-activedescendant'),
      focused: document.activeElement === input,
      role: input.getAttribute('role'),
      options: list ? [...list.querySelectorAll('[role="option"]')].map((o) => {
        const img = o.querySelector('img')
        const box = img?.getBoundingClientRect()
        return { square: !!box && Math.abs(box.width - box.height) <= 1 && getComputedStyle(img).objectFit === 'contain', id: o.id, name: o.querySelector('.search-option__name').textContent, label: o.querySelector('.search-option__kind').textContent.trim(), href: o.dataset.href, selected: o.getAttribute('aria-selected'), img: !!img && img.complete && img.naturalWidth > 0 && img.getAttribute('alt') === '', icon: !!o.querySelector('.search-option__kind svg') }
      }) : [],
      empty: document.querySelector('.global-search__empty')?.textContent.trim() ?? null,
      more: document.querySelector('.global-search__more')?.textContent.trim() ?? null,
      status: document.querySelector('.global-search [role="status"]')?.textContent,
      inView: !r || (r.left >= 0 && r.right <= innerWidth + 0.5),
      overflow: document.documentElement.scrollWidth - innerWidth,
    }
  })()`)
  const expectedSearch = (query) => evaluate(`(async () => {
    ${LOAD_DATA}
    const q = norm(${JSON.stringify(query)})
    const hits = ALL.filter((e) => norm(e.name).includes(q))
    return { total: hits.length, keys: hits.map((e) => e.name + '|' + e.label + '|' + e.href) }
  })()`)

  if (!desktop) {
    await evaluate(`document.querySelector('.global-search__toggle').click()`); await sleep(350)
    const panel = await evaluate(`({ shown: document.querySelector('.global-search__panel').getBoundingClientRect().height > 0, focused: document.activeElement === document.querySelector('.global-search input'), expanded: document.querySelector('.global-search__toggle').getAttribute('aria-expanded') })`)
    check('Ponsel: tombol cari membuka baris pencarian dan langsung fokus ke kolom', panel.shown && panel.focused && panel.expanded === 'true')
  }
  await openSearch()
  await type('bass')
  let search = await readSearch()
  let expected = await expectedSearch('bass')
  const keysOf = (options) => options.map((o) => `${o.name}|${o.label}|${o.href}`)
  check(
    'Cari "bass": hasil dari data semua kategori (nama, label kategori, tautan), maks. 8, dengan gambar & ikon',
    search.role === 'combobox' && search.expanded === 'true' && search.options.length === Math.min(8, expected.total) && keysOf(search.options).every((k) => expected.keys.includes(k)) && search.options.every((o) => o.img && o.icon && o.square),
    `${search.options.length} dari ${expected.total}: ${search.options.map((o) => `${o.name} (${o.label})`).join(', ')}`,
  )
  check('Cari "bass": hasil pertama aktif (aria-activedescendant) & jumlah hasil diumumkan', search.active === search.options[0]?.id && search.options[0]?.selected === 'true' && search.status === `${expected.total} hasil`, search.status)
  check('Dropdown pencarian di dalam layar, halaman tidak melebar', search.inView && search.overflow <= 0, `${search.overflow}px`)
  await KEY.down()
  search = await readSearch()
  const second = search.options[1]
  check('Panah bawah memindahkan hasil aktif ke hasil kedua', second && search.active === second.id && second.selected === 'true' && search.focused, search.active)
  await KEY.up(); await KEY.up()
  search = await readSearch()
  check('Panah atas dari hasil pertama berputar ke hasil terakhir', search.active === search.options.at(-1)?.id, search.active)
  await KEY.down(); await KEY.down()
  search = await readSearch()
  const target = search.options.find((o) => o.id === search.active)
  await KEY.enter(); await sleep(1300)
  let page = await pageInfo()
  let after = await evaluate(`({ value: document.querySelector('.global-search input').value, open: !!document.querySelector('.global-search__dropdown'), focusMain: document.activeElement?.id === 'konten' })`)
  check('Enter membuka hasil aktif, kolom dikosongkan & ditutup, fokus pindah ke konten', page.path === target?.href && page.title === target?.name && after.value === '' && !after.open && after.focusMain, `${target?.name} → ${page.path}`)

  // Satu nama dari tiap kategori (11) ditemukan dengan label kategorinya.
  const samples = await evaluate(`(async () => { ${LOAD_DATA} return CATALOGS.map((c) => { const e = c.entries[Math.floor(c.entries.length / 2)]; return { name: e.name, label: c.label, href: c.list + '/' + e.slug } }) })()`)
  const found = []
  for (const sample of samples) {
    await openSearch()
    await type(sample.name.toLowerCase())
    search = await readSearch()
    const hit = search.options.find((o) => o.name === sample.name)
    found.push(hit && hit.label === sample.label && hit.href === sample.href ? `${sample.name} ✓` : `${sample.name} ✗ (${hit?.label} ${hit?.href})`)
    await KEY.escape(); await KEY.escape()
  }
  check('Tiap kategori bisa dicari (ikan, serangga, burung, hewan, resep, tanaman, bahan alam, bahan masak, benda pakai, NPC, pencapaian) dengan label yang benar', found.every((f) => f.endsWith('✓')) && found.length === 11, found.join(', '))
  // Entri event (Prickly Pear, section Echo of Ancients) juga masuk pencarian.
  await openSearch()
  await type('prickly')
  search = await readSearch()
  check('Pencarian global mencakup Crops & Collectibles, termasuk entri event (Prickly Pear)', search.options.some((o) => o.name === 'Prickly Pear' && o.label === 'Tanaman' && o.href === '/crops/prickly-pear'), search.options.map((o) => `${o.name} (${o.label})`).join(', '))
  await KEY.escape(); await KEY.escape()

  await openSearch()
  await type('fox')
  await KEY.escape()
  search = await readSearch()
  check('Escape pertama menutup daftar hasil, teks tetap', search.expanded === 'false' && search.options.length === 0 && search.value === 'fox' && search.focused)
  await KEY.down()
  search = await readSearch()
  check('Panah bawah membuka daftar lagi', search.expanded === 'true' && search.options.length > 0)
  await KEY.escape(); await KEY.escape()
  search = await readSearch()
  check('Escape kedua mengosongkan kolom', search.value === '' && search.expanded === 'false')
  if (!desktop) {
    await KEY.escape()
    const closedPanel = await evaluate(`({ hidden: document.querySelector('.global-search__panel').getBoundingClientRect().height === 0, focusToggle: document.activeElement === document.querySelector('.global-search__toggle') })`)
    check('Ponsel: Escape ketiga menutup baris pencarian, fokus kembali ke tombol cari', closedPanel.hidden && closedPanel.focusToggle)
  }

  await openSearch()
  await type('zzzz')
  search = await readSearch()
  check('Cari "zzzz": pesan tanpa hasil, tanpa listbox', search.options.length === 0 && /Tidak ada nama yang cocok/.test(search.empty ?? '') && search.status === 'Tidak ada hasil', search.empty)

  await evaluate(`document.querySelector('.global-search input').select()`)
  await type('capy')
  await mouseClick(await evaluate(`(() => { const o = document.querySelector('.search-option'); if (!o) return null; const r = o.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })()`))
  await sleep(1000)
  page = await pageInfo()
  check('Klik hasil dengan mouse membuka halamannya (Capybara)', page.path === '/wildlife/animals/capybara' && page.title === 'Capybara', page.path)

  await openSearch()
  await type('tea')
  await evaluate(`document.querySelector('.global-search input').focus()`)
  await KEY.tab()
  search = await readSearch()
  check('Tab keluar dari kolom menutup daftar hasil', search.expanded === 'false' && !search.focused)

  // ================= 3b. Kolom cari besar di hero =================
  await go('/')
  const heroSearch = await evaluate(`(() => {
    const box = document.querySelector('.hero .global-search--hero')
    const input = box?.querySelector('input')
    const r = input?.getBoundingClientRect()
    return {
      exists: !!input, role: input?.getAttribute('role'), label: !!(input && document.querySelector('label[for="' + input.id + '"]')),
      width: Math.round(r?.width ?? 0), height: Math.round(r?.height ?? 0), toggle: !!box?.querySelector('.global-search__toggle'),
      heroButtons: document.querySelectorAll('.hero .btn, .hero__actions').length,
    }
  })()`)
  check('Hero: tombol diganti satu kolom pencarian besar (combobox berlabel, tanpa tombol ikon)',
    heroSearch.exists && heroSearch.role === 'combobox' && heroSearch.label && heroSearch.height >= 52 && heroSearch.width >= (desktop ? 480 : 280) && !heroSearch.toggle && heroSearch.heroButtons === 0, JSON.stringify(heroSearch))
  const toolbarSearchAt = (y) => evaluate(`(async () => { scrollTo(0, ${y}); await new Promise((r) => setTimeout(r, 500)); const cs = getComputedStyle(document.querySelector('.site-header .global-search')); return cs.visibility + '/' + cs.opacity })()`)
  const heroBottom = await evaluate(`Math.round(document.querySelector('.hero').getBoundingClientRect().bottom + scrollY)`)
  const atTop = await toolbarSearchAt(0)
  const pastHero = await toolbarSearchAt(heroBottom + 40)
  const backTop = await toolbarSearchAt(0)
  await go('/wildlife/fish')
  const otherPage = await evaluate(`(() => { const cs = getComputedStyle(document.querySelector('.site-header .global-search')); return cs.visibility + '/' + cs.opacity })()`)
  check('Beranda: pencarian toolbar tersembunyi selama hero terlihat, muncul setelah hero dilewati; halaman lain selalu tampil',
    atTop === 'hidden/0' && pastHero === 'visible/1' && backTop === 'hidden/0' && otherPage === 'visible/1', `${atTop} → ${pastHero} → ${backTop}; /wildlife/fish ${otherPage}`)
  await go('/')
  await evaluate(`document.querySelector('.global-search--hero input').focus()`)
  await type('bass')
  const heroResults = await evaluate(`(() => {
    const input = document.querySelector('.global-search--hero input')
    const list = document.getElementById(input.getAttribute('aria-controls') ?? '')
    const options = [...(list?.querySelectorAll('[role="option"]') ?? [])]
    options.at(-1)?.scrollIntoView({ block: 'nearest' })
    const last = options.at(-1)?.getBoundingClientRect()
    const hit = last && document.elementFromPoint(last.left + last.width / 2, last.top + last.height / 2)
    return { count: options.length, first: options[0]?.dataset.href, name: options[0]?.querySelector('.search-option__name').textContent, lastVisible: !!hit && options.at(-1).contains(hit), expanded: input.getAttribute('aria-expanded') }
  })()`)
  const expectedBass = await expectedSearch('bass')
  await KEY.enter(); await sleep(1300)
  page = await pageInfo()
  check('Hero: kolom cari memakai pencarian global (hasil "bass" dari data, daftar tidak terpotong hero), Enter membuka hasil pertama',
    heroResults.expanded === 'true' && heroResults.count === Math.min(8, expectedBass.total) && heroResults.lastVisible && page.path === heroResults.first && page.title === heroResults.name, `${heroResults.count} hasil → ${page.path}`)

  // ================= 4. Beranda: isi & klaim yang dihapus =================
  await go('/')
  const content = await evaluate(`(() => {
    const home = document.querySelector('.home')
    const text = home.textContent
    return {
      banned: ['Terlengkap', '200+', '1300+', 'Discord', 'Panduan Lengkap', 'Peta Interaktif', 'Kode Hadiah', 'Tugas Harian', 'Progres Saya'].filter((w) => text.includes(w)),
      buttons: home.querySelectorAll('button').length,
      deadLinks: [...home.querySelectorAll('a')].filter((a) => !a.getAttribute('href') || a.getAttribute('href').startsWith('#')).length,
      sections: [...home.querySelectorAll(':scope > section')].map((s) => s.querySelector('h1, h2')?.textContent.trim()),
      footnote: !!home.querySelector('.now-footnote') || /Urutan: yang waktu munculnya/.test(document.getElementById('muncul-sekarang').textContent),
    }
  })()`)
  check('Beranda: klaim tanpa bukti & fitur palsu hilang, tanpa tombol mati atau tautan kosong', content.banned.length === 0 && content.buttons === 0 && content.deadLinks === 0, content.banned.join(', ') || `${content.buttons} tombol, ${content.deadLinks} tautan kosong`)
  check('Beranda: urutan section Hero, Waktu Server, Semua Kategori, lalu Muncul Sekarang (kategori di atas)', content.sections.join(' | ') === 'Hatowiki | Waktu Server | Semua Kategori | Muncul Sekarang', content.sections.join(' | '))
  check('Muncul Sekarang: tanpa teks keterangan urutan di bawah section', !content.footnote)
  const heroText = await evaluate(`(async () => {
    ${LOAD_DATA}
    const count = (slug) => CATALOGS.find((c) => c.slug === slug).entries.length
    const h1 = document.querySelector('.hero h1')
    return {
      title: h1.textContent.trim(), size: parseFloat(getComputedStyle(h1).fontSize), family: getComputedStyle(h1).fontFamily,
      lead: document.querySelector('.hero__lead').textContent.replace(/\\u00a0/g, ' ').trim(),
      expected: 'Jadwal, lokasi, dan harga ' + count('fish') + ' ikan, ' + count('bugs') + ' serangga, ' + count('birds') + ' burung, dan ' + count('recipes') + ' resep Heartopia, dalam bahasa Indonesia.',
    }
  })()`)
  check('Hero: judul "Hatowiki" besar (Fraunces), tagline satu kalimat spesifik dengan jumlah entri dari data',
    heroText.title === 'Hatowiki' && heroText.size >= (desktop ? 96 : 60) && /Fraunces/.test(heroText.family) && heroText.lead === heroText.expected, `${heroText.size}px; "${heroText.lead}"`)

  // ================= 5. Hero =================
  // Cache dimatikan supaya gambar yang sudah dimuat bagian lain (mis. Muncul Sekarang) tidak terbaca sebagai unduhan hero.
  await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true })
  await go('/')
  const hero = await evaluate(`(() => {
    const heroEl = document.querySelector('.hero')
    const scene = heroEl.querySelector('.hero-scene')
    const creatures = [...scene.querySelectorAll('.hero-creature')].map((c) => {
      const img = c.querySelector('img')
      const r = c.getBoundingClientRect()
      return { src: img.getAttribute('src'), alt: img.getAttribute('alt'), shown: getComputedStyle(c).display !== 'none', square: Math.abs(r.width - r.height) <= 1 && getComputedStyle(img).objectFit === 'contain', loaded: img.complete && img.naturalWidth > 0, lazy: img.loading === 'lazy', size: !!img.getAttribute('width') && !!img.getAttribute('height'), rect: [r.left, r.top, r.right, r.bottom], anim: getComputedStyle(c).animationName }
    })
    const textRects = [...heroEl.querySelectorAll('.hero__badge, h1, .hero__lead, .global-search--hero input')].map((e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom] })
    const overlaps = creatures.filter((c) => c.shown).filter((c) => textRects.some((t) => c.rect[0] < t[2] && c.rect[2] > t[0] && c.rect[1] < t[3] && c.rect[3] > t[1])).map((c) => c.src)
    const sun = heroEl.querySelector('.hero-scene__sun').getBoundingClientRect()
    const sunOverText = textRects.some((t) => sun.left < t[2] && sun.right > t[0] && sun.top < t[3] && sun.bottom > t[1])
    return {
      decorative: scene.getAttribute('aria-hidden') === 'true',
      background: getComputedStyle(heroEl).backgroundImage.startsWith('linear-gradient'),
      layers: scene.querySelectorAll('svg.hero-land path').length,
      creatures, overlaps, sunOverText,
      kinds: [...new Set(creatures.map((c) => c.src.split('/')[2]))].sort().join(),
      external: [...heroEl.querySelectorAll('img')].filter((i) => !i.getAttribute('src').startsWith('/images/')).length,
      h1: getComputedStyle(heroEl.querySelector('h1')).color,
    }
  })()`)
  check('Hero: latar pemandangan ilustratif (gradasi langit + SVG bukit & ombak), dekoratif (aria-hidden)', hero.decorative && hero.background && hero.layers >= 6, `${hero.layers} path`)
  check('Hero: hiasan ikan, serangga, burung dari aset lokal /images, alt kosong, width/height, lazy', hero.kinds === 'birds,bugs,fish' && hero.external === 0 && hero.creatures.every((c) => c.alt === '' && c.size && c.lazy), hero.kinds)
  const shownCreatures = hero.creatures.filter((c) => c.shown)
  check('Hero: hiasan yang tampil sudah termuat dan beranimasi', shownCreatures.length >= 3 && shownCreatures.every((c) => c.loaded && c.anim !== 'none'), `${shownCreatures.length} tampil`)
  check('Hero: tiap hiasan berupa kotak persegi, gambar utuh (object-fit: contain)', shownCreatures.every((c) => c.square))
  check('Hero: hiasan & matahari/bulan tidak menutupi teks atau kolom cari', hero.overlaps.length === 0 && !hero.sunOverText, hero.overlaps.join(', ') || (hero.sunOverText ? 'matahari' : ''))
  if (width < 1000) {
    const hiddenLoaded = hero.creatures.filter((c) => !c.shown && c.loaded).map((c) => c.src)
    check('Hero: hiasan yang disembunyikan di layar kecil tidak diunduh (lazy)', hero.creatures.some((c) => !c.shown) && hiddenLoaded.length === 0, hiddenLoaded.join(', '))
  }
  const paused = await evaluate(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms))
    scrollTo(0, document.documentElement.scrollHeight); await wait(400)
    const off = { attr: document.querySelector('.hero').hasAttribute('data-paused'), state: getComputedStyle(document.querySelector('.hero-land__wave--front')).animationPlayState }
    scrollTo(0, 0); await wait(400)
    return { off, on: document.querySelector('.hero').hasAttribute('data-paused') }
  })()`)
  check('Hero: animasi dijeda saat hero di luar layar, jalan lagi saat terlihat', paused.off.attr && paused.off.state === 'paused' && !paused.on, JSON.stringify(paused))
  await send('Emulation.setEmulatedMedia', { features: [LIGHT, { name: 'prefers-reduced-motion', value: 'reduce' }] }); await sleep(300)
  const reduced = await evaluate(`[...document.querySelectorAll('.hero-creature, .hero-cloud, .hero-land__wave--back, .hero-land__wave--front, .hero-scene__stars')].map((e) => getComputedStyle(e).animationName)`)
  await send('Emulation.setEmulatedMedia', { features: [LIGHT] }); await sleep(200)
  check('Hero: prefers-reduced-motion mematikan semua animasi latar', reduced.length > 0 && reduced.every((name) => name === 'none'), `${reduced.length} elemen`)
  check('Hero: teks hitam pekat di light mode', hero.h1 === 'rgb(0, 0, 0)', hero.h1)
  await send('Network.setCacheDisabled', { cacheDisabled: false }); await send('Network.disable')

  // ================= 6. Waktu Server (pita siklus hari) =================
  await go('/')
  const cycle = await evaluate(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms))
    const root = document.querySelector('.home-time .day-cycle')
    root.scrollIntoView({ block: 'center' }); await document.fonts.ready; await wait(400)
    const rect = (el) => el.getBoundingClientRect()
    const band = rect(root.querySelector('.day-cycle__band'))
    const vertical = root.classList.contains('day-cycle--vertical')
    const length = vertical ? band.height : band.width
    // Posisi (0–1) sepanjang pita, dari 00 (kiri/atas) ke 24 (kanan/bawah)
    const at = (x, y) => (vertical ? (y - band.top) / band.height : (x - band.left) / band.width)
    const segments = [...root.querySelectorAll('.day-cycle__period')].map((el) => {
      const r = rect(el)
      return { id: el.dataset.period, from: at(r.left, r.top), to: at(r.right, r.bottom), bg: getComputedStyle(el).backgroundImage }
    })
    const labels = [...root.querySelectorAll('.day-cycle__label')].map((el) => {
      const r = rect(el)
      const m = rect(root.querySelector('.day-cycle__marker[data-server="' + el.dataset.server + '"]'))
      const clock = el.querySelector('.day-cycle__clock')
      return {
        name: el.querySelector('.day-cycle__server').textContent.trim(),
        clock: clock.textContent.trim(),
        tabular: getComputedStyle(clock).fontVariantNumeric.includes('tabular-nums'),
        icon: !!el.querySelector('.day-cycle__server svg'),
        box: { left: r.left, right: r.right, top: r.top, bottom: r.bottom },
        size: vertical ? r.height : r.width,
        marker: at(m.left + m.width / 2, m.top + m.height / 2),
      }
    })
    const card = rect(root)
    const list = root.querySelector('.day-cycle__list')
    // Algoritma penyebaran label dengan ukuran label & panjang pita sebenarnya, untuk setiap 10 menit dalam sehari.
    const { spreadLabels } = await import('/src/components/dayCycleLayout.js')
    const OFFSETS = [-5, 1, 7, 8, 9]
    const sweep = []
    for (let minute = 0; minute < 1440; minute += 10) {
      const items = OFFSETS.map((offset, i) => ({ target: (((minute + offset * 60) % 1440 + 1440) % 1440) / 1440 * length, size: labels[i].size }))
      const centers = spreadLabels(items, length, 8)
      const order = items.map((item, i) => i).sort((a, b) => items[a].target - items[b].target || a - b)
      const bad = order.some((i, k) => {
        const inside = centers[i] - items[i].size / 2 >= -0.5 && centers[i] + items[i].size / 2 <= length + 0.5
        if (!inside) return true
        if (k === 0) return false
        const p = order[k - 1]
        return centers[i] - items[i].size / 2 < centers[p] + items[p].size / 2 - 0.5
      })
      if (bad) sweep.push(String(Math.floor(minute / 60)).padStart(2, '0') + ':' + String(minute % 60).padStart(2, '0'))
    }
    return {
      vertical, segments, labels, sweep,
      leaders: root.querySelectorAll('.day-cycle__leaders path').length,
      figureHidden: root.querySelector('.day-cycle__figure').getAttribute('aria-hidden') === 'true',
      listHidden: list.classList.contains('visually-hidden') && list.getBoundingClientRect().width <= 1,
      list: [...list.querySelectorAll('li')].map((li) => ({ text: li.textContent.replace(/\\s+/g, ' ').trim(), time: li.querySelector('time')?.getAttribute('datetime') })),
      card: { left: card.left, right: card.right, top: card.top, bottom: card.bottom },
      oldCards: document.querySelectorAll('.home .server-card').length,
    }
  })()`)
  const now = new Date()
  const bandOk = cycle.segments.map((s) => s.id).join() === 'Night,Dawn,Day,Dusk' &&
    cycle.segments.every((s, i) => Math.abs(s.from - i / 4) < 0.01 && Math.abs(s.to - (i + 1) / 4) < 0.01 && s.bg.includes('linear-gradient'))
  check('Waktu Server: 5 kotak lama diganti satu pita 24 jam — Night 00–06, Dawn 06–12, Day 12–18, Dusk 18–24 (masing-masing seperempat, bergradasi)',
    bandOk && cycle.oldCards === 0, cycle.segments.map((s) => `${s.id} ${(s.from * 24).toFixed(1)}–${(s.to * 24).toFixed(1)}`).join(', '))
  const markerDetail = []
  const markersOk = cycle.labels.length === 5 && cycle.labels.every((label, i) => {
    const server = SERVERS[i]
    const match = [serverClock(server.offset, now), serverClock(server.offset, new Date(now.getTime() - 60_000))].find((t) => t.clock === label.clock)
    if (!match) return false
    const [hours, minutes] = match.clock.split(':').map(Number)
    const expected = (hours * 60 + minutes) / 1440
    const segment = cycle.segments.find((s) => label.marker >= s.from - 0.002 && label.marker <= s.to + 0.002)
    markerDetail.push(`${label.name} ${label.clock} @${(label.marker * 24).toFixed(2)}j ${segment?.id}`)
    return label.name === server.name && Math.abs(label.marker - expected) < 0.004 && segment?.id === periodAt(hours) && label.tabular && label.icon
  })
  check('Waktu Server: penanda America, Global, SEA, TW HK MO, Asia di posisi jamnya & di bagian periode yang benar, label berisi nama & jam (tabular, ikon periode)', markersOk, markerDetail.join(' · '))
  const overlaps = []
  cycle.labels.forEach((a, i) => cycle.labels.slice(i + 1).forEach((b) => {
    if (a.box.left < b.box.right - 0.5 && b.box.left < a.box.right - 0.5 && a.box.top < b.box.bottom - 0.5 && b.box.top < a.box.bottom - 0.5) overlaps.push(`${a.name}/${b.name}`)
  }))
  const inCard = cycle.labels.every((l) => l.box.left >= cycle.card.left && l.box.right <= cycle.card.right && l.box.top >= cycle.card.top && l.box.bottom <= cycle.card.bottom)
  check('Waktu Server: label berdekatan (SEA, TW HK MO, Asia) tidak saling menutupi, tiap label bergaris ke penandanya, semua di dalam kotak',
    overlaps.length === 0 && cycle.leaders === 5 && inCard && cycle.card.right <= innerWidthOf(width), overlaps.join(', ') || `${cycle.leaders} garis`)
  check('Waktu Server: label tetap tidak bertumpuk & di dalam pita di setiap jam (simulasi tiap 10 menit, ukuran label asli)', cycle.sweep.length === 0, cycle.sweep.slice(0, 6).join(', '))
  check(`Waktu Server: pita ${width < 600 ? 'vertikal (ponsel, tidak melebar)' : 'horizontal'} di ${width}px`, cycle.vertical === width < 600, cycle.vertical ? 'vertikal' : 'horizontal')
  const listOk = cycle.list.length === 5 && cycle.list.every((item, i) => {
    const label = cycle.labels[i]
    const hours = Number(label?.clock.split(':')[0])
    return item.text === `${SERVERS[i].name} (${SERVERS[i].utc}): ${label.clock}, periode ${periodAt(hours)}` && item.time === label.clock
  })
  check('Waktu Server: pembaca layar mendapat daftar teks (server, UTC, jam, periode); gambar pita aria-hidden', listOk && cycle.figureHidden && cycle.listHidden, cycle.list.map((item) => item.text).join(' · '))

  // ================= 7. Muncul Sekarang =================
  const readNow = () => evaluate(`(async () => {
    ${LOAD_DATA}
    const section = document.getElementById('muncul-sekarang')
    const checked = section.querySelector('.server-picker input:checked')
    const period = section.querySelector('.now-status__badge').textContent.trim()
    const groups = [...section.querySelectorAll('.now-group')].map((g) => {
      const catalog = CATALOGS.find((c) => c.slug === g.dataset.wildlife)
      // Hanya entri section Base Game (entri event bisa sudah tidak bisa didapat).
      const matching = catalog.entries.map((e, i) => ({ e, i })).filter(({ e }) => e.section === 'Base Game' && e.schedule?.includes(period))
      const baseGame = catalog.entries.filter((e) => e.section === 'Base Game').length
      // Entri event di data yang jadwalnya juga cocok dengan periode ini (tidak boleh ikut).
      const eventSlugs = catalog.entries.filter((e) => e.section !== 'Base Game' && e.schedule?.includes(period)).map((e) => catalog.list + '/' + e.slug)
      const expected = [...matching].sort((a, b) => a.e.schedule.length - b.e.schedule.length || (a.e.level ?? Infinity) - (b.e.level ?? Infinity) || a.i - b.i).slice(0, 6).map(({ e }) => catalog.list + '/' + e.slug)
      return {
        slug: g.dataset.wildlife,
        title: g.querySelector('.now-group__title').firstChild.textContent,
        count: Number(g.querySelector('.now-group__count strong').textContent),
        expectedCount: matching.length,
        of: g.querySelector('.now-group__count').textContent.match(/dari (\\d+)/)?.[1],
        expectedOf: String(baseGame),
        tiles: [...g.querySelectorAll('.now-tile')].map((t) => t.getAttribute('href')),
        expected,
        eventSlugs,
        images: [...g.querySelectorAll('.now-tile img')].every((i) => i.getAttribute('width') && i.getAttribute('alt') === ''),
        all: g.querySelector('.now-group__all').getAttribute('href'),
      }
    })
    return {
      server: checked?.value,
      serverName: checked?.nextElementSibling.textContent,
      period,
      clock: section.querySelector('.now-status__clock').textContent,
      note: section.querySelector('.now-note').textContent,
      groups,
    }
  })()`)
  await evaluate(`localStorage.removeItem('hdx-server')`)
  await go('/')
  let nowState = await readNow()
  const seaNow = serverClock(7)
  check('Muncul Sekarang: server bawaan SEA (UTC+7) dengan periode saat ini', nowState.server === 'sea' && [periodAt(seaNow.hours), periodAt(serverClock(7, new Date(Date.now() - 60_000)).hours)].includes(nowState.period), `${nowState.serverName} ${nowState.clock} ${nowState.period}`)
  check('Muncul Sekarang: dikelompokkan Fish, Bugs, Birds', nowState.groups.map((g) => g.title).join() === 'Fish,Bugs,Birds')
  check(
    'Muncul Sekarang: jumlah per kategori & item (≤ 6, yang waktunya paling terbatas dulu) cocok dengan jadwal di data',
    nowState.groups.every((g) => g.count === g.expectedCount && g.tiles.join() === g.expected.join() && g.images),
    nowState.groups.map((g) => `${g.slug} ${g.count}/${g.expectedCount}, ${g.tiles.length} item`).join('; '),
  )
  // Entri event uji (semua periode) ditambahkan sementara ke data ikan: tidak boleh muncul, jumlahnya tidak berubah.
  const injected = await evaluate(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms))
    const { fish } = await import('/src/data/wildlife/fish.js')
    const fake = { ...fish[0], slug: 'uji-ikan-event', name: 'Ikan Event Uji', section: 'Echo of Ancients', category: 'Echo of Ancients', level: 1, schedule: ['Dawn', 'Day', 'Dusk', 'Night'] }
    fish.unshift(fake)
    const section = document.getElementById('muncul-sekarang')
    const current = section.querySelector('.server-picker input:checked')
    const other = [...section.querySelectorAll('.server-picker input')].find((i) => i !== current)
    other.click(); await wait(200); current.click(); await wait(300)
    const names = [...section.querySelectorAll('.now-tile__name')].map((n) => n.textContent)
    const of = section.querySelector('.now-group[data-wildlife="fish"] .now-group__count').textContent.match(/dari (\\d+)/)?.[1]
    fish.splice(fish.indexOf(fake), 1)
    other.click(); await wait(200); current.click(); await wait(200)
    return { shown: names.includes('Ikan Event Uji'), of, total: fish.length, baseGame: fish.filter((e) => e.section === 'Base Game').length }
  })()`)
  check(
    'Muncul Sekarang: hanya entri section Base Game ("dari N" = jumlah Base Game; entri event uji tidak muncul)',
    nowState.groups.every((g) => g.of === g.expectedOf) && !injected.shown && injected.of === String(injected.baseGame),
    `${nowState.groups.map((g) => `${g.slug} dari ${g.of}`).join(', ')}; entri event uji ${injected.shown ? 'MUNCUL' : 'tidak muncul'}`,
  )
  // Data asli kini punya entri event (Fish, Bugs, Birds) yang jadwalnya mencakup semua periode: tidak dihitung dan tidak tampil.
  check(
    'Muncul Sekarang: entri event asli di data (jadwal cocok) tidak dihitung dan tidak tampil',
    nowState.groups.every((g) => g.eventSlugs.length > 0 && g.count === g.expectedCount && !g.tiles.some((href) => g.eventSlugs.includes(href))),
    nowState.groups.map((g) => `${g.slug}: ${g.eventSlugs.length} entri event cocok, tampil ${g.count}`).join('; '),
  )
  check('Muncul Sekarang: "Lihat semua" ke daftar dengan filter waktu di URL', nowState.groups.every((g) => g.all === `/wildlife/${g.slug}?waktu=${nowState.period}`), nowState.groups.map((g) => g.all).join(' '))
  let tiles = await evaluate(NOW_TILES(false))
  check(
    'Muncul Sekarang: kotak gambar persegi, gambar utuh (contain), badge level di pojok gambar, nama ≤ 2 baris dengan title',
    tiles.count > 0 && tiles.square && tiles.badges && tiles.names,
    `${tiles.count} tile`,
  )
  check('Muncul Sekarang: semua tile dalam satu baris sama tinggi', tiles.rowSpread <= 1, `${tiles.rows} baris, selisih ${tiles.rowSpread.toFixed(1)}px`)
  tiles = await evaluate(NOW_TILES(true))
  check('Muncul Sekarang: gambar tinggi (Black Stork 400×846) tidak mengubah ukuran tile & baris', tiles.heightChange <= 0.5 && tiles.square && tiles.rowSpread <= 1, `perubahan ${tiles.heightChange.toFixed(1)}px`)
  await go('/')
  check('Muncul Sekarang: catatan bahwa cuaca tidak ikut dihitung', /Cuaca di game tidak bisa diketahui dari luar/.test(nowState.note) && /hanya berdasarkan waktu/.test(nowState.note))
  const rows = await evaluate(`[...document.querySelectorAll('#muncul-sekarang .now-grid')].map((grid) => {
    const cs = getComputedStyle(grid)
    const items = [...grid.children]
    return { flow: cs.gridAutoFlow, overflow: cs.overflowX, snap: cs.scrollSnapType, align: items.every((li) => getComputedStyle(li).scrollSnapAlign.includes('start')), scrolls: grid.scrollWidth > grid.clientWidth + 1, tops: new Set(items.map((li) => Math.round(li.getBoundingClientRect().top))).size }
  })`)
  if (width < 640) {
    check('Muncul Sekarang (ponsel): tiap kategori satu baris geser ke samping dengan snap per tile',
      rows.length === 3 && rows.every((r) => r.flow.startsWith('column') && r.overflow === 'auto' && r.snap.startsWith('x mandatory') && r.align && r.scrolls && r.tops === 1), JSON.stringify(rows[0]))
  } else {
    check('Muncul Sekarang: di layar lebar tile tersusun dalam grid (tanpa baris geser)', rows.every((r) => r.overflow === 'visible' && r.snap === 'none'), JSON.stringify(rows[0]))
  }
  const fishGroup = nowState.groups[0]
  await evaluate(`document.querySelector('.now-group[data-wildlife="fish"] .now-group__all').click()`); await sleep(1400)
  // Muncul Sekarang hanya menghitung Base Game; daftar ikan juga menampilkan section event di bawahnya, jadi yang
  // dicocokkan jumlah kartu di section Base Game (section pertama).
  const listed = await evaluate(`(() => {
    const first = document.querySelector('.list-section')
    const name = [...(first?.querySelector('.list-section__name')?.childNodes ?? [])].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim()
    return { path: location.pathname + location.search, section: name, cards: first?.querySelectorAll('.entry-card').length ?? 0, chip: [...document.querySelectorAll('.active-chip')].map((c) => c.textContent.trim()).join() }
  })()`)
  check('Klik "Lihat semua" Fish: daftar ikan terfilter waktu, section Base Game berisi jumlah yang sama', listed.path === fishGroup.all && listed.section === 'Base Game' && listed.cards === fishGroup.count && listed.chip.includes(nowState.period), `${listed.path} → Base Game ${listed.cards} kartu`)

  await go('/')
  await evaluate(`[...document.querySelectorAll('.server-picker__option')].find((l) => l.textContent.trim() === 'America').querySelector('input').click()`); await sleep(300)
  nowState = await readNow()
  const america = serverClock(-5)
  check(
    'Ganti server ke America: periode & daftar ikut berganti',
    nowState.server === 'america' && [periodAt(america.hours), periodAt(serverClock(-5, new Date(Date.now() - 60_000)).hours)].includes(nowState.period) && nowState.groups.every((g) => g.count === g.expectedCount && g.tiles.join() === g.expected.join() && g.all.endsWith(`waktu=${nowState.period}`)),
    `${nowState.period}: ${nowState.groups.map((g) => g.count).join('/')}`,
  )
  tiles = await evaluate(NOW_TILES(false))
  check(`Muncul Sekarang (America, ${nowState.period}): tile persegi & sebaris sama tinggi`, tiles.square && tiles.badges && tiles.names && tiles.rowSpread <= 1, `${tiles.count} tile`)
  await go('/')
  nowState = await readNow()
  check('Pilihan server disimpan di browser (tetap America setelah dimuat ulang)', nowState.server === 'america', nowState.server)
  await evaluate(`document.querySelector('.server-picker input:checked').focus()`)
  await KEY.right()
  nowState = await readNow()
  check('Pilihan server bisa diganti dengan keyboard (panah kanan → Global)', nowState.server === 'global', nowState.server)
  await evaluate(`localStorage.removeItem('hdx-server')`)

  // ================= 8. Kartu kategori =================
  await go('/')
  const categories = await evaluate(`(async () => {
    ${LOAD_DATA}
    const wait = (ms) => new Promise((r) => setTimeout(r, ms))
    const grid = document.querySelector('.category-grid')
    grid.scrollIntoView(); await wait(800)
    const imgs = [...grid.querySelectorAll('.category-card__sample')]
    await Promise.all(imgs.map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r }))))
    return [...grid.querySelectorAll('.category-card')].map((card) => {
      const catalog = CATALOGS.find((c) => c.slug === card.dataset.wildlife)
      const r = card.getBoundingClientRect()
      const art = [...card.querySelectorAll('.category-card__sample')].map((i) => i.getBoundingClientRect())
      return {
        title: card.querySelector('.category-card__title').firstChild.textContent,
        href: card.getAttribute('href'),
        list: catalog?.list,
        count: Number(card.querySelector('.category-card__count strong').textContent),
        expectedCount: catalog?.entries.length,
        noun: card.querySelector('.category-card__count').textContent.replace(/[\\d\\s]+/, '').trim(),
        expectedNoun: catalog?.noun,
        icon: !!card.querySelector('.category-card__icon svg'),
        size: card.dataset.size,
        desc: card.querySelector('.category-card__desc')?.textContent.trim().length ?? 0,
        samples: [...card.querySelectorAll('.category-card__sample')].filter((i) => i.naturalWidth > 0 && i.getAttribute('src').startsWith('/images/')).length,
        rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, area: r.width * r.height },
        // Seberapa jauh gambar keluar dari tepi atas / kanan kartu
        overTop: Math.max(0, ...art.map((a) => r.top - a.top)),
        overRight: Math.max(0, ...art.map((a) => a.right - r.right)),
        artRight: Math.max(...art.map((a) => a.right)),
      }
    })
  })()`)
  const EXPECTED_CARDS = 'Fish>/wildlife/fish,Bugs>/wildlife/bugs,Birds>/wildlife/birds,Animals>/wildlife/animals,Recipes>/recipes,Crops>/crops,Collectibles>/collectibles,Ingredients>/ingredients,Items>/items,NPCs>/npcs,Achievements>/achievements'
  check('Kategori: kartu Fish, Bugs, Birds, Animals, Recipes, Crops, Collectibles, Ingredients, Items, NPCs, Achievements dengan tautan ke daftarnya', categories.map((c) => `${c.title}>${c.href}`).sort().join() === EXPECTED_CARDS.split(',').sort().join(), categories.map((c) => c.title).join(', '))
  check('Kategori: jumlah entri dihitung dari data (termasuk entri event: Crops 19, Collectibles 40, Ingredients 32)', categories.every((c) => c.count === c.expectedCount && c.noun === c.expectedNoun) && categories.find((c) => c.title === 'Crops')?.count === 19 && categories.find((c) => c.title === 'Collectibles')?.count === 40 && categories.find((c) => c.title === 'Ingredients')?.count === 32, categories.map((c) => `${c.count} ${c.noun}`).join(', '))
  const titles = await evaluate(`[...document.querySelectorAll('.category-card')].map((card) => card.querySelector('.category-card__title').firstChild.textContent + '/' + card.querySelector('.category-card__label').textContent).join()`)
  check('Kategori: nama Inggris dengan subjudul Indonesia (Crops/Tanaman, Collectibles/Bahan Alam, Ingredients/Bahan Masak)', titles.includes('Crops/Tanaman') && titles.includes('Collectibles/Bahan Alam') && titles.includes('Ingredients/Bahan Masak'), titles)
  const SIZES = ['xl', 'md', 'md', 'md', 'md', 'sm', 'sm', 'sm', 'sm', 'sm', 'sm']
  check('Kategori (bento): urut dari entri terbanyak — terbanyak besar, empat berikutnya sedang, sisanya kecil',
    categories.every((c, i) => i === 0 || c.count <= categories[i - 1].count) && categories.map((c) => c.size).join() === SIZES.join(),
    categories.map((c) => `${c.title} ${c.count} ${c.size}`).join(', '))
  // Kartu seukuran (mis. empat kartu sedang) bisa berselisih pecahan piksel, jadi toleransinya 0,5% luas.
  check('Kategori (bento): kartu dengan entri lebih banyak tidak pernah lebih kecil', categories.every((c, i) => i === 0 || c.rect.area <= categories[i - 1].rect.area * 1.005),
    categories.map((c) => Math.round(c.rect.area / 1000)).join('/'))
  if (width >= 1080) {
    const [xl, md1, md2, md3, md4, ...small] = categories
    const near = (a, b) => Math.abs(a - b) <= 1
    check('Kategori (desktop bento): besar di kiri setinggi dua baris, 2×2 sedang di kanannya, enam kecil sebaris di bawah',
      near(xl.rect.top, md1.rect.top) && near(md1.rect.top, md2.rect.top) && near(md3.rect.top, md4.rect.top) && md3.rect.top > md1.rect.bottom && near(xl.rect.bottom, md3.rect.bottom) &&
        md1.rect.left > xl.rect.right && near(md1.rect.left, md3.rect.left) && near(md2.rect.right, md4.rect.right) &&
        small.length === 6 && new Set(small.map((c) => Math.round(c.rect.top))).size === 1 && small[0].rect.top > xl.rect.bottom,
      categories.map((c) => `${c.title} ${Math.round(c.rect.left)},${Math.round(c.rect.top)}`).join(' · '))
  }
  // Setiap baris penuh: kartu paling kanan tiap baris menempel ke tepi kanan grid.
  const rowEdges = new Map()
  for (const c of categories) rowEdges.set(Math.round(c.rect.top), Math.max(rowEdges.get(Math.round(c.rect.top)) ?? 0, c.rect.right))
  const gridRight = Math.max(...categories.map((c) => c.rect.right))
  check('Kategori (bento): tidak ada baris yang bolong (kartu terakhir tiap baris sampai tepi kanan)', [...rowEdges.values()].every((right) => Math.abs(right - gridRight) <= 1),
    [...rowEdges.entries()].map(([top, right]) => `${top}:${Math.round(right)}`).join(' '))
  const SAMPLES = { xl: 3, md: 2, sm: 1 }
  check('Kategori: ikon di semua kartu, deskripsi hanya di kartu besar, contoh gambar termuat (3/2/1 menurut ukuran)',
    categories.every((c) => c.icon && c.samples === SAMPLES[c.size] && (c.size === 'xl' ? c.desc > 20 : c.desc === 0)), categories.map((c) => `${c.size}:${c.samples}`).join(' '))
  // Diukur dari kotak gambar (termasuk rotasi hiasan & area transparan di sekitar gambar), jadi batasnya sedikit longgar.
  check('Kategori: gambar entri sedikit keluar dari tepi kartu (atas/kanan, kotak gambar maks. 40px) tanpa melebarkan halaman',
    categories.every((c) => (c.overTop > 0 || c.overRight > 0) && c.overTop <= 40 && c.overRight <= 40 && c.artRight <= innerWidthOf(width)),
    categories.map((c) => `${c.title} ↑${c.overTop.toFixed(0)} →${c.overRight.toFixed(0)}`).join(', '))
  const sampleBoxes = await evaluate(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms))
    // Kotak persegi diukur tanpa rotasi hiasan (lebar & tinggi layout).
    const read = () => [...document.querySelectorAll('.category-card')].map((card) => ({
      stage: card.getBoundingClientRect().height,
      boxes: [...card.querySelectorAll('.category-card__sample')].map((i) => Math.abs(i.offsetWidth - i.offsetHeight) <= 1 && getComputedStyle(i).objectFit === 'contain'),
    }))
    const before = read()
    const img = document.querySelector('.category-card__sample')
    img.setAttribute('width', '400'); img.setAttribute('height', '846'); img.src = '/images/birds/black-stork.webp'
    await new Promise((r) => (img.complete && img.naturalWidth ? r() : (img.onload = img.onerror = r))); await wait(150)
    const after = read()
    return { square: before.every((c) => c.boxes.every(Boolean)) && after.every((c) => c.boxes.every(Boolean)), stageChange: Math.max(...after.map((c, i) => Math.abs(c.stage - before[i].stage))) }
  })()`)
  check('Kategori: contoh gambar berupa kotak persegi (contain); gambar tinggi tidak mengubah ukuran kartu', sampleBoxes.square && sampleBoxes.stageChange <= 0.5, `perubahan ${sampleBoxes.stageChange.toFixed(1)}px`)

  // ================= 8b. Kartu taktil: garis tepi tipis + bayangan keras, ditekan turun =================
  await send('DOM.enable'); await send('CSS.enable')
  // Paksa :hover / :active lewat DevTools, lalu baca transform, bayangan, dan warna garis tepi.
  const tactile = async (selector) => {
    const { root } = (await send('DOM.getDocument', { depth: 0 })).result
    const { nodeId } = (await send('DOM.querySelector', { nodeId: root.nodeId, selector })).result
    if (!nodeId) return null
    // Warna hasil color-mix (oklab) diubah ke rgb lewat canvas; bayangan dipisah jadi warna + geometri.
    const read = () => evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)})
      const cs = getComputedStyle(el)
      const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
      const rgb = (css) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1); const d = ctx.getImageData(0, 0, 1, 1).data; return 'rgb(' + d[0] + ', ' + d[1] + ', ' + d[2] + ')' }
      const shadow = cs.boxShadow.match(/^(.*\\)) (-?[\\d.]+px -?[\\d.]+px [\\d.]+px -?[\\d.]+px)$/)
      // Garis 1,5px dibulatkan Chrome ke piksel layar (1px di DPR 1), jadi yang diperiksa tokennya + garis ≥ 1px.
      const token = getComputedStyle(document.documentElement).getPropertyValue('--card-edge-width').trim()
      return { border: token === '1.5px' && parseFloat(cs.borderTopWidth) >= 1 ? '1.5px' : cs.borderTopWidth, edge: rgb(cs.borderTopColor), bg: rgb(cs.backgroundColor), shadow: shadow ? rgb(shadow[1]) + ' ' + shadow[2] : cs.boxShadow, transform: cs.transform }
    })()`)
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).style.transition = 'none'`)
    const rest = await read()
    await send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['hover'] }); const hover = await read()
    await send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['hover', 'active'] }); const active = await read()
    await send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] })
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).style.transition = ''`)
    return { rest, hover, active }
  }
  // "rgb(r, g, b) 0px 3px 0px 0px" → { color, x, y, blur, spread }
  const hardShadow = (css) => {
    const m = css.match(/^(rgba?\([^)]*\)) (-?[\d.]+)px (-?[\d.]+)px ([\d.]+)px (-?[\d.]+)px$/)
    return m && { color: m[1], x: Number(m[2]), y: Number(m[3]), blur: Number(m[4]), spread: Number(m[5]) }
  }
  const notBlack = (css) => { const [r, g, b] = css.match(/[\d.]+/g).map(Number); return r + g + b > 120 }
  const luma = (css) => { const [r, g, b] = css.match(/[\d.]+/g).map(Number); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
  const tactileRows = []
  const clickable = [['kartu kategori', '.category-card'], ['tile Muncul Sekarang', '.now-tile']]
  for (const [name, selector] of clickable) {
    await evaluate(`document.querySelector('${selector}').scrollIntoView({ block: 'center' })`); await sleep(150)
    tactileRows.push([name, await tactile(selector), true])
  }
  tactileRows.push(['kotak Waktu Server', await tactile('.day-cycle'), false])
  await go('/wildlife/fish')
  tactileRows.push(['kartu daftar', await tactile('.entry-grid .entry-card'), true])
  await go('/wildlife/fish/sea-bass')
  tactileRows.push(['kotak detail', await tactile('.panel--info'), false])
  const tactileOk = tactileRows.every(([, t, pressable]) => {
    if (!t) return false
    const rest = hardShadow(t.rest.shadow)
    const pressed = hardShadow(t.active.shadow)
    const base = rest && rest.x === 0 && rest.y === 3 && rest.blur === 0 && notBlack(rest.color) && t.rest.border === '1.5px' && luma(t.rest.edge) < luma(t.rest.bg)
    if (!pressable) return base
    return base && t.hover.transform === 'none' && t.hover.edge !== t.rest.edge && t.active.transform === 'matrix(1, 0, 0, 1, 0, 2)' && pressed?.y === 1 && pressed.blur === 0
  })
  check('Kartu taktil (light): garis tepi 1,5px lebih gelap dari permukaan, bayangan keras 3px tanpa blur berwarna tint; hover tidak mengangkat, ditekan turun 2px & bayangan jadi 1px',
    tactileOk, tactileRows.map(([name, t]) => `${name}: ${t?.rest.border} ${t?.rest.shadow} → ${t?.active.transform} ${t?.active.shadow}`).join(' · '))
  await go('/')
  await toggleTheme()
  const darkCard = await tactile('.category-card')
  const darkShadow = darkCard && hardShadow(darkCard.rest.shadow)
  check('Kartu taktil (dark): bayangan keras tetap tanpa blur & bukan hitam', !!darkShadow && darkShadow.y === 3 && darkShadow.blur === 0 && notBlack(darkShadow.color) && darkCard.rest.border === '1.5px', darkCard?.rest.shadow)
  await evaluate(`localStorage.removeItem('hdx-theme')`)

  // ================= 9. Detail wildlife tetap versi daftar =================
  await go('/wildlife/fish/sea-bass')
  const detailTime = await evaluate(`({ rows: document.querySelectorAll('.panel--time .server-time__list .server-row').length, band: document.querySelectorAll('.day-cycle').length })`)
  check('Detail wildlife: Waktu Server tetap versi daftar (5 baris, tanpa pita siklus hari)', detailTime.rows === 5 && detailTime.band === 0, JSON.stringify(detailTime))

  // ================= 10. Kontras AA & tidak melebar, light & dark =================
  await go('/')
  for (const theme of ['light', 'dark']) {
    const current = await evaluate(`document.documentElement.dataset.theme`)
    if (current !== theme) await toggleTheme()
    const report = await evaluate(`(async () => {
      ${CONTRAST_PROBE}
      const wait = (ms) => new Promise((r) => setTimeout(r, ms))
      const out = {}
      out.home = worstContrast(document.querySelector('.home'))
      out.header = worstContrast(document.querySelector('.site-header'))
      out.footer = worstContrast(document.querySelector('.site-footer'))
      // Toolbar di atas hero: latar pil (semi transparan) dikomposit di atas warna langit hero (tanpa efek blur).
      scrollTo(0, 0); await wait(300)
      const inner = document.querySelector('.site-header__inner')
      const pill = parse(getComputedStyle(inner).backgroundColor)
      const hero = getComputedStyle(document.querySelector('.hero'))
      const sky = [parse(hero.backgroundColor), ...(hero.backgroundImage.match(COLOR_RE) || []).map(parse)].map((c) => over(c, [255, 255, 255, 1]))
      const texts = [...inner.querySelectorAll('.brand__name, .nav-menu__button')].filter((el) => el.getBoundingClientRect().width > 0)
      out.overHero = Math.min(...texts.flatMap((el) => { const color = parse(getComputedStyle(el).color); return sky.map((c) => { const bg = over(pill, c); return ratio(over(color, bg), bg) }) }))
      return out
    })()`)
    const parts = []
    if (desktop) {
      await evaluate(`document.querySelector('.nav-menu__button').click()`); await sleep(300)
      parts.push(['menu Wildlife', await evaluate(`(() => { ${CONTRAST_PROBE} return worstContrast(document.querySelector('.nav-menu__panel')) })()`)])
      await KEY.escape()
      await evaluate(`[...document.querySelectorAll('.nav-menu__button')].find((b) => b.textContent.trim() === 'Wiki').click()`); await sleep(300)
      parts.push(['menu Wiki', await evaluate(`(() => { ${CONTRAST_PROBE} return worstContrast(document.querySelector('.nav-menu__panel')) })()`)])
      await KEY.escape()
    } else {
      await evaluate(`document.querySelector('.site-header .menu-button').click()`); await sleep(450)
      parts.push(['drawer', await evaluate(`(() => { ${CONTRAST_PROBE} return worstContrast(document.querySelector('.drawer__panel')) })()`)])
      await KEY.escape()
    }
    await evaluate(`document.querySelector('.global-search--hero input').focus()`)
    await type('an')
    parts.push(['hasil pencarian', await evaluate(`(() => { ${CONTRAST_PROBE} return worstContrast(document.querySelector('.global-search__dropdown')) })()`)])
    await KEY.escape(); await KEY.escape()
    const all = [['beranda', report.home], ['toolbar', report.header], ['footer', report.footer], ...parts]
    const failing = all.filter(([, r]) => r.worst && r.worst.ratio < r.worst.need)
    check(`Kontras toolbar di atas hero (${theme}): teks pil ≥ 4,5:1 terhadap langit hero`, report.overHero >= 4.5, `${report.overHero.toFixed(2)}:1`)
    check(
      `Kontras teks AA (${theme}): beranda, toolbar, footer, ${desktop ? 'menu Wildlife & Wiki' : 'drawer'}, hasil pencarian`,
      failing.length === 0 && all.every(([, r]) => r.count > 0),
      all.map(([name, r]) => `${name} ${r.count} teks, terendah ${r.worst?.ratio.toFixed(2)}:1${r.worst && r.worst.ratio < r.worst.need ? ` ("${r.worst.text}" ${r.worst.cls})` : ''}`).join('; '),
    )
    const overflow = await evaluate(`(async () => { const w = (ms) => new Promise((r) => setTimeout(r, ms)); let worst = 0; for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo(0, y); await w(40); worst = Math.max(worst, document.documentElement.scrollWidth - innerWidth) } scrollTo(0, 0); return worst })()`)
    check(`Beranda (${theme}): tidak melebar ke samping`, overflow <= 0, `${overflow}px`)
  }
  await evaluate(`localStorage.removeItem('hdx-theme')`)

  // ================= 11. Footer: tombol unduh; meta Open Graph, Twitter Card & canonical =================
  await go('/')
  const stores = await evaluate(`[...document.querySelectorAll('.site-footer .store-link')].map((a) => ({ name: a.querySelector('.store-link__name').textContent, href: a.getAttribute('href'), target: a.target, rel: a.rel, icon: !!a.querySelector('svg path'), iconHidden: a.querySelector('svg')?.getAttribute('aria-hidden') === 'true', newTab: a.textContent.includes('(membuka tab baru)'), visible: a.getBoundingClientRect().width > 0 }))`)
  const STORE_LINKS = 'App Store>https://apps.apple.com/app/heartopia/id6746151928,Google Play>https://play.google.com/store/apps/details?id=com.xd.xdtglobal.gp,Steam>https://store.steampowered.com/app/4025700/Heartopia/'
  check('Footer: tombol unduh App Store, Google Play, Steam ke listing resmi, ikon merek + teks, tab baru dengan rel="noopener"',
    stores.map((store) => `${store.name}>${store.href}`).join() === STORE_LINKS && stores.every((store) => store.target === '_blank' && /\bnoopener\b/.test(store.rel) && store.icon && store.iconHidden && store.newTab && store.visible),
    stores.map((store) => store.name).join(', '))
  const social = await evaluate(`(() => {
    const a = document.querySelector('.site-footer__meta a[href="https://x.com/pingkendi"]')
    if (!a) return null
    const cs = getComputedStyle(a)
    const icon = a.querySelector('svg')
    return { text: a.textContent.replace(/\\s+/g, ' ').trim(), label: a.getAttribute('aria-label'), title: a.title, target: a.target, rel: a.rel, color: cs.color, muted: getComputedStyle(document.querySelector('.site-footer')).color, icon: !!icon?.querySelector('path') && icon.getAttribute('aria-hidden') === 'true', iconSize: icon?.getBoundingClientRect().width, credit: a.closest('.site-footer__bottom') !== null }
  })()`)
  check('Footer: tautan X hanya ikon kecil (teks sekunder) di baris kredit, aria-label & title "X (Twitter)", tab baru dengan rel="noopener"',
    !!social && social.text === '' && social.label?.startsWith('X (Twitter)') && social.title === 'X (Twitter)' && social.target === '_blank' && /\bnoopener\b/.test(social.rel) && social.color === social.muted && social.icon && social.iconSize <= 14 && social.credit,
    social && `${social.label} · ${social.color} · ${social.iconSize}px`)
  const meta = await evaluate(`(async () => {
    const m = (selector) => document.querySelector(selector)?.getAttribute('content') ?? null
    const image = m('meta[property="og:image"]')
    const res = await fetch(new URL(image).pathname)
    const blob = await res.blob()
    const bitmap = await createImageBitmap(blob)
    return {
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'), ogUrl: m('meta[property="og:url"]'), ogType: m('meta[property="og:type"]'),
      ogTitle: m('meta[property="og:title"]'), ogDesc: m('meta[property="og:description"]'), ogImage: image, ogSize: m('meta[property="og:image:width"]') + 'x' + m('meta[property="og:image:height"]'),
      ogAlt: m('meta[property="og:image:alt"]'), twCard: m('meta[name="twitter:card"]'), twImage: m('meta[name="twitter:image"]'), twTitle: m('meta[name="twitter:title"]'),
      twDesc: m('meta[name="twitter:description"]'), desc: m('meta[name="description"]'),
      file: { status: res.status, type: blob.type, bytes: blob.size, size: bitmap.width + 'x' + bitmap.height },
    }
  })()`)
  const IMAGE_URL = 'https://www.hatowiki.site/og-image.jpg'
  const topics = ['ikan', 'serangga', 'burung', 'hewan', 'resep', 'tanaman', 'collectibles', 'bahan masak']
  check('Meta: og:image & twitter:image URL absolut ke gambar 1200×630 JPEG di bawah 300 KB, Twitter Card summary_large_image, judul & alt terisi',
    meta.ogImage === IMAGE_URL && meta.twImage === IMAGE_URL && meta.ogSize === '1200x630' && meta.file.status === 200 && meta.file.type === 'image/jpeg' && meta.file.size === '1200x630' && meta.file.bytes < 300 * 1024 &&
      meta.twCard === 'summary_large_image' && meta.ogType === 'website' && !!meta.ogTitle && !!meta.twTitle && !!meta.ogAlt,
    JSON.stringify(meta.file))
  check('Meta: deskripsi situs, og:description & twitter:description menyebut semua kategori (ikan … bahan masak)',
    [meta.desc, meta.ogDesc, meta.twDesc].every((text) => topics.every((topic) => text?.toLowerCase().includes(topic))), meta.desc)
  await evaluate(`document.querySelector('.site-footer a[href="/wildlife/fish"]').click()`); await sleep(1000)
  const canonicalFish = await evaluate(`({ canonical: document.querySelector('link[rel="canonical"]').getAttribute('href'), ogUrl: document.querySelector('meta[property="og:url"]').getAttribute('content') })`)
  check('Canonical & og:url: https://www.hatowiki.site/ di beranda, mengikuti halaman setelah pindah (/wildlife/fish)',
    meta.canonical === 'https://www.hatowiki.site/' && meta.ogUrl === meta.canonical && canonicalFish.canonical === 'https://www.hatowiki.site/wildlife/fish' && canonicalFish.ogUrl === canonicalFish.canonical,
    `${meta.canonical} → ${canonicalFish.canonical}`)

  // ================= 12. Animasi secukupnya =================
  const frames = await evaluate(`(() => {
    const rules = [...document.styleSheets].flatMap((sheet) => { try { return [...sheet.cssRules] } catch { return [] } })
    const flat = rules.flatMap((rule) => (rule.cssRules ? [rule, ...rule.cssRules] : [rule]))
    return Object.fromEntries(flat.filter((rule) => rule instanceof CSSKeyframesRule).map((rule) => [rule.name, [...new Set([...rule.cssRules].flatMap((key) => [...key.style]))]]))
  })()`)
  const MOTION = ['page-enter', 'fade-in', 'card-swim', 'card-flutter', 'card-hop']
  check('Animasi baru (transisi halaman & hasil filter, gerak kartu) hanya memakai opacity & transform',
    MOTION.every((name) => frames[name]?.length && frames[name].every((prop) => prop === 'opacity' || prop === 'transform')), MOTION.map((name) => `${name}: ${frames[name]?.join('+')}`).join('; '))
  // Kelas animasi yang dipasang saat pindah halaman / hasil filter berubah (dicatat MutationObserver).
  const watchClass = (scope, cls, action) => evaluate(`(async () => {
    const seen = []
    const observer = new MutationObserver((list) => list.forEach((m) => { if (m.target.classList?.contains('${cls}')) seen.push(getComputedStyle(m.target).animationName) }))
    observer.observe(document.querySelector('${scope}'), { attributes: true, attributeFilter: ['class'], subtree: true })
    ${action}
    await new Promise((r) => setTimeout(r, 800))
    observer.disconnect()
    return seen
  })()`)
  const TYPE_BASS = `const input = document.querySelector('.list-search input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'bass'); input.dispatchEvent(new Event('input', { bubbles: true }))`
  await go('/wildlife')
  const pageAnim = await watchClass('.site', 'page-enter', `document.querySelector('.site-main a[href="/wildlife/fish"]').click()`)
  const resultAnim = await watchClass('.list-results', 'results-enter', TYPE_BASS)
  await send('Emulation.setEmulatedMedia', { features: [LIGHT, { name: 'prefers-reduced-motion', value: 'reduce' }] })
  await go('/wildlife')
  const pageReduced = await watchClass('.site', 'page-enter', `document.querySelector('.site-main a[href="/wildlife/fish"]').click()`)
  const resultReduced = await watchClass('.list-results', 'results-enter', TYPE_BASS)
  await send('Emulation.setEmulatedMedia', { features: [LIGHT] })
  check('Transisi: pindah halaman memudar masuk (page-enter), hasil filter yang berubah memudar (fade-in); mati saat prefers-reduced-motion',
    pageAnim.includes('page-enter') && resultAnim.includes('fade-in') && pageReduced.length > 0 && pageReduced.every((name) => name === 'none') && resultReduced.length > 0 && resultReduced.every((name) => name === 'none'),
    JSON.stringify({ pageAnim, resultAnim, pageReduced, resultReduced }))
  if (desktop) {
    const hoverCard = async (route) => {
      await go(route)
      const point = await centerOf(`document.querySelector('.entry-card')`)
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y }); await sleep(400)
      const state = await evaluate(`(() => { const card = document.querySelector('.entry-card'); const img = card.querySelector('.entry-card__image'); const cs = getComputedStyle(img); return { anim: cs.animationName, transform: cs.transform, card: getComputedStyle(card).transform } })()`)
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(width / 2), y: 2 }); await sleep(200)
      return state
    }
    const hovers = {}
    for (const [kind, route] of [['fish', '/wildlife/fish'], ['bugs', '/wildlife/bugs'], ['birds', '/wildlife/birds'], ['recipes', '/recipes'], ['crops', '/crops']]) hovers[kind] = await hoverCard(route)
    const scaled = (t) => /^matrix\(1\.06, 0, 0, 1\.06, 0, 0\)$/.test(t)
    check('Hover kartu: ikan berenang, serangga mengepak, burung melompat; resep & tanaman sedikit membesar; kartu tidak terangkat',
      hovers.fish.anim === 'card-swim' && hovers.bugs.anim === 'card-flutter' && hovers.birds.anim === 'card-hop' && hovers.recipes.anim === 'none' && scaled(hovers.recipes.transform) && hovers.crops.anim === 'none' && scaled(hovers.crops.transform) &&
        Object.values(hovers).every((h) => h.card === 'none'),
      Object.entries(hovers).map(([kind, h]) => `${kind}: ${h.anim} ${h.transform}`).join('; '))
    await send('Emulation.setEmulatedMedia', { features: [LIGHT, { name: 'prefers-reduced-motion', value: 'reduce' }] })
    const reducedHover = await hoverCard('/wildlife/fish')
    await send('Emulation.setEmulatedMedia', { features: [LIGHT] })
    check('Hover kartu saat prefers-reduced-motion: gambar diam', reducedHover.anim === 'none' && reducedHover.transform === 'none', JSON.stringify(reducedHover))
  }

  // Log debug Vercel Web Analytics hanya muncul di mode dev (tanpa request ke server), jadi diabaikan.
  const problems = tab.logs.filter((line) => !/\[vite\] connect|React DevTools|\[Vercel Web Analytics\]/.test(line))
  check('Console bersih selama uji', problems.length === 0, problems.join(' | '))
  await tab.close()
  return results
}

// Lebar viewport = lebar yang diuji (tanpa scrollbar di Chrome headless).
const innerWidthOf = (width) => width + 0.5

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
    for (const width of WIDTHS.length ? WIDTHS : [1280, 820, 390]) {
      console.log(`\n=== Beranda & toolbar — lebar ${width}px`)
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
