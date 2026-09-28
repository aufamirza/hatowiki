#!/usr/bin/env node
/**
 * Uji beranda dan toolbar global di Chrome headless (lewat Chrome DevTools Protocol), untuk lebar 1280, 820, dan 390:
 * - Toolbar: sticky di beberapa halaman; menu Wildlife (dropdown, klik & keyboard) dan menu Wiki (Resep, Crops,
 *   Collectibles) di desktop; di ponsel menu pindah ke drawer (dialog modal: fokus terkunci, Escape, klik latar, tautan
 *   menutup drawer, scroll terkunci).
 * - Pencarian global: hasil dari semua kategori (gambar, nama, label kategori, tautan) dicocokkan dengan data,
 *   keyboard (panah, Enter, Escape), klik mouse, tanpa hasil, dan dropdown tidak melebar ke samping.
 * - Beranda: klaim & tombol mati sudah hilang; hero dengan pemandangan & hiasan dari aset lokal (tidak menutupi
 *   teks, dijeda di luar layar, mati saat prefers-reduced-motion); Waktu Server 5 kotak (jam, UTC, periode, tata
 *   letak per lebar) sementara detail wildlife tetap versi daftar; Muncul Sekarang (server bawaan SEA, ganti server,
 *   isi & urutan dari data, hanya entri section Base Game, "Lihat semua" ke daftar berfilter waktu); kartu kategori
 *   (Wildlife + Resep, Crops, Collectibles) dengan jumlah dari data, termasuk entri event.
 * - Gambar entri: kotak persegi (object-fit: contain) di Muncul Sekarang, contoh gambar kartu kategori, hiasan hero,
 *   dan thumbnail pencarian; gambar tinggi (Black Stork 400×846) tidak mengubah ukuran kotak; tile Muncul Sekarang
 *   sebaris sama tinggi, nama maks. 2 baris (teks lengkap di title), badge level di pojok gambar.
 * - Kontras teks AA (light & dark), teks hitam pekat di light, halaman tidak melebar, console bersih.
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
  const [{ fish }, { bugs }, { birds }, { animals }, { recipes }, { crops }, { collectibles }] = await Promise.all(
    ['/src/data/wildlife/fish.js', '/src/data/wildlife/bugs.js', '/src/data/wildlife/birds.js', '/src/data/wildlife/animals.js', '/src/data/recipes/recipes.js', '/src/data/crops/crops.js', '/src/data/collectibles/collectibles.js'].map((p) => import(p)),
  )
  const CATALOGS = [
    { slug: 'fish', name: 'Fish', label: 'Ikan', noun: 'ikan', entries: fish, list: '/wildlife/fish' },
    { slug: 'bugs', name: 'Bugs', label: 'Serangga', noun: 'serangga', entries: bugs, list: '/wildlife/bugs' },
    { slug: 'birds', name: 'Birds', label: 'Burung', noun: 'burung', entries: birds, list: '/wildlife/birds' },
    { slug: 'animals', name: 'Animals', label: 'Hewan', noun: 'hewan', entries: animals, list: '/wildlife/animals' },
    { slug: 'recipes', name: 'Recipes', label: 'Resep', noun: 'resep', entries: recipes, list: '/recipes' },
    { slug: 'crops', name: 'Crops', label: 'Tanaman', noun: 'tanaman', entries: crops, list: '/crops' },
    { slug: 'collectibles', name: 'Collectibles', label: 'Bahan Alam', noun: 'bahan alam', entries: collectibles, list: '/collectibles' },
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
    // Menu Wiki: Resep, Crops, Collectibles (tanpa tautan "Semua"); Resep tidak lagi berupa tautan terpisah di toolbar.
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
      'Toolbar: menu Wildlife & Wiki (tanpa tautan Resep terpisah); Wiki berisi Resep, Crops, Collectibles (nama Inggris + label Indonesia & jumlah entri)',
      buttons.join() === 'Wildlife,Wiki' && plainLinks.length === 0 && wiki.expanded === 'true' && !wiki.all && wiki.inView && wiki.items.every((i) => i.icon) &&
        wiki.items.map((i) => `${i.name}|${i.meta}>${i.href}`).join() === `Recipes|Resep · ${counts.recipes} entri>/recipes,Crops|Tanaman · ${counts.crops} entri>/crops,Collectibles|Bahan Alam · ${counts.collectibles} entri>/collectibles`,
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
    const expectedLinks = 'Beranda>/,Fish>/wildlife/fish,Bugs>/wildlife/bugs,Birds>/wildlife/birds,Animals>/wildlife/animals,Semua kategori wildlife>/wildlife,Recipes>/recipes,Crops>/crops,Collectibles>/collectibles'
    const drawerGroups = await evaluate(`[...document.querySelectorAll('.drawer__group')].map((g) => g.textContent.trim()).join()`)
    check('Drawer: tautan Beranda, grup Wildlife (Fish, Bugs, Birds, Animals, Semua kategori), grup Wiki (Resep, Crops, Collectibles), dengan ikon', drawer.links.map((l) => `${l.text}>${l.href}`).join() === expectedLinks && drawer.links.filter((l) => l.href !== '/wildlife').every((l) => l.icon) && drawerGroups === 'Wildlife,Wiki', drawer.links.map((l) => l.text).join(', '))
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

  // ================= 3. Pencarian global =================
  await go('/')
  await evaluate(`localStorage.removeItem('hdx-server')`)
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

  // Satu nama dari tiap kategori ditemukan dengan label kategorinya.
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
  check('Tiap kategori bisa dicari (ikan, serangga, burung, hewan, resep, tanaman, bahan alam) dengan label yang benar', found.every((f) => f.endsWith('✓')) && found.length === 7, found.join(', '))
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
    }
  })()`)
  check('Beranda: klaim tanpa bukti & fitur palsu hilang, tanpa tombol mati atau tautan kosong', content.banned.length === 0 && content.buttons === 0 && content.deadLinks === 0, content.banned.join(', ') || `${content.buttons} tombol, ${content.deadLinks} tautan kosong`)
  check('Beranda: urutan section Hero, Waktu Server, Jelajahi Kategori, lalu Muncul Sekarang (kategori di atas)', content.sections.join(' | ') === 'Wiki Komunitas Heartopia | Waktu Server | Jelajahi Kategori | Muncul Sekarang', content.sections.join(' | '))

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
    const textRects = [...heroEl.querySelectorAll('.hero__badge, h1, .hero__lead, .hero__actions .btn')].map((e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom] })
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
  check('Hero: hiasan & matahari/bulan tidak menutupi teks atau tombol', hero.overlaps.length === 0 && !hero.sunOverText, hero.overlaps.join(', ') || (hero.sunOverText ? 'matahari' : ''))
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

  // ================= 6. Waktu Server (varian kotak) =================
  const cards = await evaluate(`(() => {
    const list = document.querySelector('.home-time .server-cards')
    const cs = getComputedStyle(list)
    return [...list.querySelectorAll('.server-card')].map((c) => {
      const r = c.getBoundingClientRect()
      const clock = c.querySelector('.server-card__clock')
      return {
        name: c.querySelector('.server-card__name').textContent,
        utc: c.querySelector('.server-card__offset').textContent,
        clock: clock.textContent,
        tabular: getComputedStyle(clock).fontVariantNumeric.includes('tabular-nums'),
        clockSize: parseFloat(getComputedStyle(clock).fontSize),
        period: c.querySelector('.server-card__period').textContent.trim(),
        icon: !!c.querySelector('.server-card__period svg'),
        rect: { left: r.left, top: Math.round(r.top), right: r.right, width: r.width },
        container: list.getBoundingClientRect().width,
      }
    })
  })()`)
  const now = new Date()
  const cardsOk = cards.length === 5 && cards.every((c, i) => {
    const server = SERVERS[i]
    const current = serverClock(server.offset, now)
    const previous = serverClock(server.offset, new Date(now.getTime() - 60_000))
    const match = [current, previous].find((t) => t.clock === c.clock)
    return c.name === server.name && c.utc === server.utc && match && c.period === periodAt(match.hours) && c.icon && c.tabular
  })
  check('Waktu Server: 5 kotak (America, Global, SEA, TW HK MO, Asia) dengan UTC, jam tabular & badge periode ber-ikon', cardsOk, cards.map((c) => `${c.name} ${c.utc} ${c.clock} ${c.period}`).join(' · '))
  check('Waktu Server: jam besar (≥ 28px)', cards.every((c) => c.clockSize >= 28), `${Math.min(...cards.map((c) => c.clockSize))}px`)
  const tops = cards.map((c) => c.rect.top)
  const container = cards[0]?.rect.container
  let layoutOk
  let layoutDetail
  if (width >= 1000) {
    layoutOk = new Set(tops).size === 1
    layoutDetail = '5 kolom'
  } else if (width >= 600) {
    const rowTwo = cards.slice(3)
    const firstLeft = cards[0].rect.left
    const lastRight = cards[2].rect.right
    const leftGap = rowTwo[0].rect.left - firstLeft
    const rightGap = lastRight - rowTwo[1].rect.right
    layoutOk = tops[0] === tops[1] && tops[1] === tops[2] && tops[3] === tops[4] && tops[3] > tops[0] && Math.abs(leftGap - rightGap) < 2
    layoutDetail = `3 + 2 di tengah (${leftGap.toFixed(1)} / ${rightGap.toFixed(1)})`
  } else {
    layoutOk = tops[0] === tops[1] && tops[2] === tops[3] && tops[4] > tops[2] && Math.abs(cards[4].rect.width - (cards[1].rect.right - cards[0].rect.left)) < 2
    layoutDetail = '2 kolom, kotak ke-5 selebar baris'
  }
  check(`Waktu Server: tata letak di ${width}px — ${layoutDetail}`, layoutOk && cards.every((c) => c.rect.right <= innerWidthOf(width)), tops.join(','))

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
      return {
        title: card.querySelector('.category-card__title').firstChild.textContent,
        href: card.getAttribute('href'),
        list: catalog?.list,
        count: Number(card.querySelector('.category-card__count strong').textContent),
        expectedCount: catalog?.entries.length,
        noun: card.querySelector('.category-card__count').textContent.replace(/[\\d\\s]+/, '').trim(),
        expectedNoun: catalog?.noun,
        icon: !!card.querySelector('.category-card__icon svg'),
        desc: card.querySelector('.category-card__desc').textContent.trim().length,
        samples: [...card.querySelectorAll('.category-card__sample')].filter((i) => i.naturalWidth > 0 && i.getAttribute('src').startsWith('/images/')).length,
        rect: card.getBoundingClientRect().right,
      }
    })
  })()`)
  check('Kategori: kartu Fish, Bugs, Birds, Animals, Recipes, Crops, Collectibles dengan tautan ke daftarnya', categories.map((c) => `${c.title}>${c.href}`).join() === 'Fish>/wildlife/fish,Bugs>/wildlife/bugs,Birds>/wildlife/birds,Animals>/wildlife/animals,Recipes>/recipes,Crops>/crops,Collectibles>/collectibles', categories.map((c) => c.title).join(', '))
  check('Kategori: jumlah entri dihitung dari data (termasuk entri event: Crops 19, Collectibles 40)', categories.every((c) => c.count === c.expectedCount && c.noun === c.expectedNoun) && categories.find((c) => c.title === 'Crops')?.count === 19 && categories.find((c) => c.title === 'Collectibles')?.count === 40, categories.map((c) => `${c.count} ${c.noun}`).join(', '))
  const titles = await evaluate(`[...document.querySelectorAll('.category-card')].map((card) => card.querySelector('.category-card__title').firstChild.textContent + '/' + card.querySelector('.category-card__label').textContent).join()`)
  check('Kategori: nama Inggris dengan subjudul Indonesia (Crops/Tanaman, Collectibles/Bahan Alam)', titles.includes('Crops/Tanaman') && titles.includes('Collectibles/Bahan Alam'), titles)
  if (width >= 1080) {
    const rows = await evaluate(`[...document.querySelectorAll('.category-card')].map((c) => Math.round(c.getBoundingClientRect().top))`)
    check('Kategori (desktop): baris Wildlife 4 kartu, baris Wiki 3 kartu', new Set(rows.slice(0, 4)).size === 1 && new Set(rows.slice(4)).size === 1 && rows[4] > rows[0], rows.join(','))
  }
  check('Kategori: ikon, deskripsi singkat, dan 3 contoh gambar termuat', categories.every((c) => c.icon && c.desc > 20 && c.samples === 3), categories.map((c) => c.samples).join('/'))
  const sampleBoxes = await evaluate(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms))
    const read = () => [...document.querySelectorAll('.category-card')].map((card) => {
      const stage = card.querySelector('.category-card__stage').getBoundingClientRect()
      return { stage: stage.height, boxes: [...card.querySelectorAll('.category-card__sample')].map((i) => { const r = i.getBoundingClientRect(); return Math.abs(r.width - r.height) <= 1 && getComputedStyle(i).objectFit === 'contain' && r.top >= stage.top - 0.5 && r.bottom <= stage.bottom + 0.5 }) }
    })
    const before = read()
    const img = document.querySelector('.category-card__sample')
    img.setAttribute('width', '400'); img.setAttribute('height', '846'); img.src = '/images/birds/black-stork.webp'
    await new Promise((r) => (img.complete && img.naturalWidth ? r() : (img.onload = img.onerror = r))); await wait(150)
    const after = read()
    return { square: before.every((c) => c.boxes.every(Boolean)) && after.every((c) => c.boxes.every(Boolean)), stageChange: Math.max(...after.map((c, i) => Math.abs(c.stage - before[i].stage))) }
  })()`)
  check('Kategori: contoh gambar berupa kotak persegi (contain) di dalam panggung; gambar tinggi tidak memanjangkannya', sampleBoxes.square && sampleBoxes.stageChange <= 0.5, `perubahan ${sampleBoxes.stageChange.toFixed(1)}px`)

  // ================= 9. Detail wildlife tetap versi daftar =================
  await go('/wildlife/fish/sea-bass')
  const detailTime = await evaluate(`({ rows: document.querySelectorAll('.panel--time .server-time__list .server-row').length, cards: document.querySelectorAll('.server-card').length })`)
  check('Detail wildlife: Waktu Server tetap versi daftar (5 baris, tanpa kotak)', detailTime.rows === 5 && detailTime.cards === 0, JSON.stringify(detailTime))

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
    await openSearch()
    await type('an')
    parts.push(['hasil pencarian', await evaluate(`(() => { ${CONTRAST_PROBE} return worstContrast(document.querySelector('.global-search__dropdown')) })()`)])
    await KEY.escape(); await KEY.escape(); if (!desktop) await KEY.escape()
    const all = [['beranda', report.home], ['toolbar', report.header], ...parts]
    const failing = all.filter(([, r]) => r.worst && r.worst.ratio < r.worst.need)
    check(
      `Kontras teks AA (${theme}): beranda, toolbar, ${desktop ? 'menu Wildlife & Wiki' : 'drawer'}, hasil pencarian`,
      failing.length === 0 && all.every(([, r]) => r.count > 0),
      all.map(([name, r]) => `${name} ${r.count} teks, terendah ${r.worst?.ratio.toFixed(2)}:1${r.worst && r.worst.ratio < r.worst.need ? ` ("${r.worst.text}" ${r.worst.cls})` : ''}`).join('; '),
    )
    const overflow = await evaluate(`(async () => { const w = (ms) => new Promise((r) => setTimeout(r, ms)); let worst = 0; for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo(0, y); await w(40); worst = Math.max(worst, document.documentElement.scrollWidth - innerWidth) } scrollTo(0, 0); return worst })()`)
    check(`Beranda (${theme}): tidak melebar ke samping`, overflow <= 0, `${overflow}px`)
  }
  await evaluate(`localStorage.removeItem('hdx-theme')`)

  const problems = tab.logs.filter((line) => !/\[vite\] connect|React DevTools/.test(line))
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
