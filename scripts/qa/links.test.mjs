#!/usr/bin/env node
/**
 * Uji "semua yang berpindah halaman adalah tautan sungguhan" di Chrome headless (lewat Chrome DevTools Protocol):
 * - Hasil pencarian global (toolbar & hero beranda): tiap hasil <a href> ber-role option di dalam listbox, di luar urutan
 *   Tab; alamatnya sama dengan data dan mengikuti bahasa halaman (/th, /en).
 * - Keyboard tetap seperti sebelumnya: panah memindahkan hasil aktif, Enter membuka hasil aktif, Escape menutup daftar.
 * - Klik biasa pindah halaman lewat router (tanpa memuat ulang); Ctrl+klik dan klik tengah membuka tab baru sementara
 *   halaman & daftar hasil tetap; klik kanan tidak dicegat (menu browser "Open link in new tab").
 * - Elemen lain yang berpindah halaman (kartu daftar, kartu kategori beranda, tile Muncul Sekarang, item dropdown toolbar
 *   atau drawer, tile bahan, kartu hub, breadcrumb) berupa <a href>; pita siklus hari tidak punya elemen yang bisa diklik;
 *   tidak ada elemen ber-kursor-tangan di luar tautan/tombol.
 *
 * Pemakaian (dev server harus sudah jalan):
 *   npm run dev
 *   node scripts/qa/links.test.mjs          → lebar 1280
 *   node scripts/qa/links.test.mjs 390      → lebar tertentu
 *
 * Variabel lingkungan: BASE_URL (bawaan http://localhost:5173), CHROME_PATH (lokasi Chrome/Edge).
 */
import { openTab, sleep, startChrome } from './cdp.mjs'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173'
const WIDTHS = process.argv.slice(2).map(Number).filter(Boolean)
const PORT = 9900 + Math.floor(Math.random() * 40)
const CTRL = 2

async function runSuite(width) {
  const results = []
  const check = (name, ok, detail) => {
    results.push(Boolean(ok))
    console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${name}${detail ? `  — ${detail}` : ''}`)
  }
  const desktop = width >= 760
  const tab = await openTab(PORT, width)
  const { send, evaluate } = tab
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }] })
  await send('Storage.clearDataForOrigin', { origin: BASE_URL, storageTypes: 'local_storage,session_storage' })

  const go = async (route, wait = 1800) => {
    await send('Page.navigate', { url: BASE_URL + route })
    await sleep(wait)
  }
  const url = () => evaluate('location.pathname + location.search')
  const press = async (key, code, vk) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk })
    await sleep(200)
  }
  const mouse = async (point, { button = 'left', modifiers = 0 } = {}) => {
    const buttons = { left: 1, right: 2, middle: 4 }[button]
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y, modifiers })
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button, buttons, clickCount: 1, modifiers })
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button, buttons: 0, clickCount: 1, modifiers })
    await sleep(700)
  }
  const pages = async () => (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).filter((target) => target.type === 'page')
  // Tab yang terbuka sejak `before` (daftar dari pages()); ditutup lagi supaya uji berikutnya mulai bersih.
  const newPages = async (before) => {
    const opened = (await pages()).filter((target) => !before.some((old) => old.id === target.id))
    for (const target of opened) await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`)
    await send('Page.bringToFront')
    return opened.map((target) => new URL(target.url).pathname)
  }

  // Pencarian: `root` = '.site-header' (toolbar) atau '.hero' (kolom besar di beranda).
  const search = async (root, text) => {
    await evaluate(`(() => {
      const box = document.querySelector('${root} .global-search')
      const toggle = box.querySelector('.global-search__toggle')
      if (toggle && toggle.offsetParent && toggle.getAttribute('aria-expanded') !== 'true') toggle.click()
    })()`)
    await sleep(300)
    await evaluate(`document.querySelector('${root} .global-search input').focus()`)
    await send('Input.insertText', { text })
    await sleep(500)
  }
  const searchState = (root) => evaluate(`(() => {
    const input = document.querySelector('${root} .global-search input')
    const list = document.getElementById(input.getAttribute('aria-controls') ?? '')
    const options = [...(list?.querySelectorAll('[role="option"]') ?? [])]
    return {
      query: input.value, expanded: input.getAttribute('aria-expanded'), active: input.getAttribute('aria-activedescendant'), focusOnInput: document.activeElement === input,
      listRole: list?.getAttribute('role') ?? null, listTag: list?.tagName ?? null,
      options: options.map((option) => {
        const r = option.getBoundingClientRect()
        return { tag: option.tagName, href: option.getAttribute('href'), id: option.id, selected: option.getAttribute('aria-selected'), tabIndex: option.tabIndex,
          parent: option.parentElement.tagName + ':' + option.parentElement.getAttribute('role'), name: option.querySelector('.search-option__name').textContent,
          decoration: getComputedStyle(option).textDecorationLine, x: r.left + r.width / 2, y: r.top + r.height / 2 }
      }),
    }
  })()`)
  const expectedHrefs = (query, prefix = '') => evaluate(`(async () => {
    const { searchCatalogs } = await import('/src/components/search/searchIndex.js')
    return searchCatalogs(${JSON.stringify(query)}).items.map((item) => ${JSON.stringify(prefix)} + item.href)
  })()`)

  // ================= 1. Hasil pencarian berupa tautan =================
  await go('/wildlife')
  await search('.site-header', 'sea')
  const found = await searchState('.site-header')
  const wanted = await expectedHrefs('sea')
  check('Pencarian: tiap hasil adalah <a href> ber-role option di dalam listbox (li hanya pembungkus), di luar urutan Tab',
    found.listRole === 'listbox' && found.options.length > 1 && found.options.every((option) => option.tag === 'A' && option.href?.startsWith('/') && option.parent === 'LI:presentation' && option.tabIndex === -1),
    `${found.options.length} hasil · ${found.options[0]?.tag} ${found.options[0]?.parent} tabindex ${found.options[0]?.tabIndex}`)
  check('Pencarian: alamat tiap hasil sama dengan data (halaman detail entrinya)', JSON.stringify(found.options.map((option) => option.href)) === JSON.stringify(wanted), found.options.map((option) => option.href).slice(0, 3).join(' '))
  check('Pencarian: tampilan hasil tetap seperti baris daftar (tanpa garis bawah tautan), fokus tetap di kolom, hasil pertama aktif',
    found.options.every((option) => option.decoration === 'none') && found.focusOnInput && found.active === found.options[0].id && found.options[0].selected === 'true', `${found.options[0]?.decoration} · aktif ${found.active}`)

  // Keyboard: panah, Escape, Enter.
  await press('ArrowDown', 'ArrowDown', 40)
  const afterDown = await searchState('.site-header')
  await press('ArrowUp', 'ArrowUp', 38)
  const afterUp = await searchState('.site-header')
  await press('Escape', 'Escape', 27)
  const afterEscape = await searchState('.site-header')
  await press('ArrowDown', 'ArrowDown', 40)
  await press('ArrowDown', 'ArrowDown', 40)
  const beforeEnter = await searchState('.site-header')
  await evaluate('window.__spa = true')
  await press('Enter', 'Enter', 13)
  await sleep(800)
  const afterEnter = { url: await url(), spa: await evaluate('window.__spa === true'), query: await evaluate(`document.querySelector('.site-header .global-search input').value`) }
  check('Keyboard: panah bawah/atas memindahkan hasil aktif, Escape menutup daftar (kata kunci tetap), panah bawah membukanya lagi',
    afterDown.active === found.options[1].id && afterUp.active === found.options[0].id && afterEscape.expanded === 'false' && afterEscape.query === 'sea' && beforeEnter.expanded === 'true' && beforeEnter.active === found.options[1].id,
    `${afterDown.active} → ${afterUp.active} · Escape ${afterEscape.expanded} · ${beforeEnter.active}`)
  check('Keyboard: Enter membuka hasil aktif lewat router (tanpa memuat ulang) dan mengosongkan kolom', afterEnter.url === found.options[1].href && afterEnter.spa && afterEnter.query === '', JSON.stringify(afterEnter))

  // Klik biasa.
  await go('/wildlife')
  await search('.site-header', 'sea')
  const forClick = await searchState('.site-header')
  await evaluate('window.__spa = true')
  await mouse(forClick.options[0])
  const afterClick = { url: await url(), spa: await evaluate('window.__spa === true'), focus: await evaluate('document.activeElement?.id'), query: await evaluate(`document.querySelector('.site-header .global-search input').value`) }
  check('Klik biasa pada hasil: pindah halaman lewat router (tanpa memuat ulang), kolom dikosongkan, fokus ke konten',
    afterClick.url === forClick.options[0].href && afterClick.spa && afterClick.query === '' && afterClick.focus === 'konten', JSON.stringify(afterClick))

  // Ctrl+klik & klik tengah: tab baru, halaman ini tetap.
  await go('/wildlife')
  await search('.site-header', 'sea')
  const forNewTab = await searchState('.site-header')
  let before = await pages()
  await mouse(forNewTab.options[0], { modifiers: CTRL })
  const ctrlOpened = await newPages(before)
  const afterCtrl = { url: await url(), ...(await searchState('.site-header')) }
  check('Ctrl+klik pada hasil: membuka halamannya di tab baru; halaman ini, kata kunci, dan daftar hasil tetap',
    ctrlOpened.length === 1 && ctrlOpened[0] === forNewTab.options[0].href && afterCtrl.url === '/wildlife' && afterCtrl.query === 'sea' && afterCtrl.expanded === 'true' && afterCtrl.focusOnInput,
    `tab baru: ${ctrlOpened.join(' ') || '-'} · di sini ${afterCtrl.url} · daftar ${afterCtrl.expanded}`)
  before = await pages()
  await mouse(afterCtrl.options[1], { button: 'middle' })
  const middleOpened = await newPages(before)
  const afterMiddle = { url: await url(), ...(await searchState('.site-header')) }
  check('Klik tengah pada hasil: membuka halamannya di tab baru; halaman ini dan daftar hasil tetap',
    middleOpened.length === 1 && middleOpened[0] === forNewTab.options[1].href && afterMiddle.url === '/wildlife' && afterMiddle.query === 'sea' && afterMiddle.expanded === 'true',
    `tab baru: ${middleOpened.join(' ') || '-'} · di sini ${afterMiddle.url} · daftar ${afterMiddle.expanded}`)

  // Klik kanan: menu konteks browser tidak dicegat, dan yang diklik memang tautan.
  await evaluate(`(() => {
    window.__menu = null
    document.addEventListener('contextmenu', (event) => {
      const link = event.target.closest('a[href]')
      window.__menu = { prevented: event.defaultPrevented, href: link?.getAttribute('href') ?? null, absolute: link?.href ?? null }
      // Cegah menu asli muncul di jendela uji; pemeriksaannya sudah dicatat di atas (pendengar ini dipasang terakhir).
      event.preventDefault()
    })
  })()`)
  await mouse(afterMiddle.options[0], { button: 'right' })
  const menu = await evaluate('window.__menu')
  const afterRight = { url: await url(), ...(await searchState('.site-header')) }
  check('Klik kanan pada hasil: menu browser tidak dicegat dan targetnya tautan dengan alamat lengkap ("Open link in new tab" tersedia); daftar tetap terbuka',
    menu && menu.prevented === false && menu.href === forNewTab.options[0].href && menu.absolute === BASE_URL + forNewTab.options[0].href && afterRight.url === '/wildlife' && afterRight.expanded === 'true',
    JSON.stringify(menu))

  // Bahasa lain: alamat hasil mengikuti awalan bahasa, juga di tab baru.
  const localized = {}
  for (const prefix of ['/th', '/en']) {
    await go(`${prefix}/wildlife`, 2200)
    await search('.site-header', 'sea')
    const state = await searchState('.site-header')
    before = await pages()
    await mouse(state.options[0], { modifiers: CTRL })
    localized[prefix] = { hrefs: state.options.map((option) => option.href), wanted: await expectedHrefs('sea', prefix), opened: await newPages(before) }
  }
  check('Versi Thai & Inggris: alamat hasil pencarian memakai awalan bahasanya (/th/…, /en/…), juga saat dibuka di tab baru',
    Object.entries(localized).every(([prefix, item]) => JSON.stringify(item.hrefs) === JSON.stringify(item.wanted) && item.opened.length === 1 && item.opened[0] === item.hrefs[0] && item.hrefs[0].startsWith(`${prefix}/`)),
    Object.entries(localized).map(([prefix, item]) => `${prefix}: ${item.hrefs[0]} → tab ${item.opened[0] ?? '-'}`).join(' · '))

  // Kolom pencarian besar di hero beranda memakai komponen yang sama.
  await go('/')
  await search('.hero', 'tira')
  const hero = await searchState('.hero')
  before = await pages()
  await mouse(hero.options[0], { button: 'middle' })
  const heroOpened = await newPages(before)
  check('Pencarian di hero beranda: hasilnya juga tautan, bisa dibuka di tab baru',
    hero.options.length > 0 && hero.options.every((option) => option.tag === 'A') && hero.options[0].href === '/recipes/tiramisu' && heroOpened[0] === '/recipes/tiramisu', `${hero.options[0]?.href} → tab ${heroOpened[0] ?? '-'}`)

  // ================= 2. Elemen lain yang berpindah halaman =================
  // Elemen ber-kursor-tangan yang bukan (dan tidak di dalam) tautan, tombol, atau kontrol formulir = "tautan palsu".
  const fakeLinks = () => evaluate(`[...document.querySelectorAll('body *')].filter((el) => {
    if (el.closest('a[href], button, label, input, select, summary, [role="button"]')) return false
    const cs = getComputedStyle(el)
    return cs.cursor === 'pointer' && cs.display !== 'none' && el.getClientRects().length > 0
  }).map((el) => el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0]).slice(0, 5)`)
  const linksOf = (selector) => evaluate(`[...document.querySelectorAll('${selector}')].map((el) => ({ tag: el.tagName, href: el.getAttribute('href') }))`)
  const allLinks = (list) => list.length > 0 && list.every((item) => item.tag === 'A' && item.href?.startsWith('/'))
  const audit = []
  const record = async (label, selector) => {
    const list = await linksOf(selector)
    audit.push({ label, count: list.length, ok: allLinks(list) })
  }

  const homeFake = await fakeLinks()
  await record('kartu kategori beranda', '.category-card')
  await record('tile Muncul Sekarang', '.now-tile')
  await record('"Lihat semua" Muncul Sekarang', '.now-group__all')
  await record('logo', '.site-header .brand')
  const dayCycle = await evaluate(`(() => {
    const band = document.querySelector('.day-cycle')
    return { exists: !!band, interactive: band ? band.querySelectorAll('a, button, [role="link"], [role="button"], [tabindex]:not([tabindex="-1"])').length : -1, cursor: band ? getComputedStyle(band).cursor : null }
  })()`)
  if (desktop) {
    await evaluate(`document.querySelector('.nav-menu__button').click()`); await sleep(300)
    await record('item dropdown toolbar', '.nav-menu__link')
    await record('"Semua kategori" di dropdown', '.nav-menu__all')
    await press('Escape', 'Escape', 27)
  } else {
    await evaluate(`document.querySelector('.menu-button').click()`); await sleep(400)
    await record('item drawer menu', '.drawer__link')
    await press('Escape', 'Escape', 27)
  }
  await go('/wildlife')
  await record('kartu hub Wildlife', '.wildlife-card')
  await go('/wildlife/fish')
  const listFake = await fakeLinks()
  await record('kartu daftar', '.entry-card')
  await record('breadcrumb', '.breadcrumbs a')
  await go('/recipes/tiramisu')
  const detailFake = await fakeLinks()
  await record('tile bahan resep', '.item-tile__inner--link')
  await record('tombol kembali ke daftar', '.entry-detail__footer a.btn')
  await go('/crops/tomato')
  await record('tile "Dipakai di resep" & "Makanan favorit hewan"', '.item-tile__inner--link')
  await go('/wildlife/animals/capybara')
  await record('tile makanan favorit', '.item-tile__inner--link')

  const badAudit = audit.filter((item) => !item.ok)
  check(`Elemen lain yang berpindah halaman berupa <a href>: ${audit.map((item) => `${item.label} (${item.count})`).join(', ')}`, badAudit.length === 0, badAudit.map((item) => `${item.label}: ${item.count}`).join(', '))
  check('Pita siklus hari tidak punya elemen yang berpindah halaman (tidak ada tautan, tombol, atau kursor tangan)', dayCycle.exists && dayCycle.interactive === 0 && dayCycle.cursor !== 'pointer', JSON.stringify(dayCycle))
  check('Tidak ada "tautan palsu": semua elemen ber-kursor-tangan adalah tautan, tombol, atau kontrol formulir (beranda, daftar, detail)',
    homeFake.length === 0 && listFake.length === 0 && detailFake.length === 0, [...homeFake, ...listFake, ...detailFake].join(', '))

  // Tautan kartu benar-benar membuka tab baru dengan Ctrl+klik (bukan hanya tampak seperti tautan).
  await go('/wildlife/fish')
  const card = await evaluate(`(() => { const el = document.querySelector('.entry-card'); el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { href: el.getAttribute('href'), x: r.left + r.width / 2, y: r.top + 40 } })()`)
  before = await pages()
  await mouse(card, { modifiers: CTRL })
  const cardOpened = await newPages(before)
  check('Kartu daftar: Ctrl+klik membuka detailnya di tab baru, daftar tetap terbuka', cardOpened[0] === card.href && (await url()) === '/wildlife/fish', `${card.href} → tab ${cardOpened[0] ?? '-'}`)

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
      console.log(`\n=== Tautan sungguhan (pencarian & navigasi) — lebar ${width}px`)
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
