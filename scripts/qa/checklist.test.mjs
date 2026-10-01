#!/usr/bin/env node
/**
 * Uji halaman Checklist (/checklist) di Chrome headless (lewat Chrome DevTools Protocol). Jam halaman dikunci ke
 * 2026-10-01 05:30 UTC (server SEA 12:30 = Day, America 00:30 = Night), jadi hasil Target Sekarang bisa dicocokkan.
 * - Navigasi: tautan Checklist (ikon + teks) di toolbar desktop, bukan di dalam menu Wiki; di ponsel di drawer setelah
 *   Beranda; route /checklist, /th/checklist, /en/checklist dengan judul & meta description per bahasa.
 * - Ringkasan & tab: Fish, Bugs, Birds, Recipes, Achievements dengan "didapat/total" dari data (termasuk entri event).
 * - Menandai: ketuk/klik baris menandai sudah didapat (localStorage per kategori & slug), baris keluar dari filter Belum
 *   didapat dengan notifikasi + Batalkan, Space di kotak centang menandai dan fokus pindah ke baris berikutnya, klik nama
 *   membuka halaman detail tanpa menandai, progres tetap ada setelah dimuat ulang.
 * - Filter: Belum didapat (bawaan) / Sudah didapat / Semua dengan jumlahnya, pencarian nama, section Base Game di atas
 *   event, ganti kategori mengosongkan pencarian; Recipes & Achievements tanpa Target Sekarang.
 * - Target Sekarang: isi = entri Base Game yang belum didapat, cocok cuaca pilihan, muncul di periode sekarang
 *   (dikelompokkan per lokasi) dan yang baru muncul di periode berikutnya (dengan jam mulainya); level hobi
 *   menyembunyikan entri di atasnya (bisa ditampilkan redup) dan disimpan per hobi; cuaca (sesi) dan server (diingat,
 *   sama dengan beranda) mengubah isi; menandai dari Target Sekarang; nama tertaut ke detail.
 * - Reset per kategori dengan dialog konfirmasi (Batal / Escape tidak menghapus).
 * - Cadangkan (unduh JSON) & Pulihkan (pilih JSON, konfirmasi): isi berkas, ringkasan, berkas salah ditolak, slug &
 *   kategori yang tidak dikenal tetap disimpan.
 * - Tidak ada request selain GET selama uji (progres tidak dikirim ke mana pun), area ketuk ≥ 44px, halaman tidak
 *   melebar, tanpa tanda pisah panjang di teks Checklist, console bersih.
 *
 * Pemakaian (dev server harus sudah jalan):
 *   npm run dev
 *   node scripts/qa/checklist.test.mjs            → lebar 390 dan 1280
 *   node scripts/qa/checklist.test.mjs 390        → lebar tertentu
 *
 * Variabel lingkungan: BASE_URL (bawaan http://localhost:5173), CHROME_PATH (lokasi Chrome/Edge).
 */
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { openTab, sleep, startChrome } from './cdp.mjs'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173'
const WIDTHS = process.argv.slice(2).map(Number).filter(Boolean)
const PORT = 9700 + Math.floor(Math.random() * 80)
const FIXED_TIME = Date.UTC(2026, 9, 1, 5, 30)
const STORAGE_KEY = 'hdx-checklist'
const DASH = /[—―]/

// Jam halaman dikunci (tetap berjalan dari titik itu), dipasang sebelum skrip halaman mana pun.
const FAKE_CLOCK = `(() => {
  const RealDate = Date
  const shift = ${FIXED_TIME} - RealDate.now()
  class FakeDate extends RealDate {
    constructor(...args) { if (args.length) super(...args); else super(RealDate.now() + shift) }
    static now() { return RealDate.now() + shift }
  }
  globalThis.Date = FakeDate
})()`

// Data dari modul aplikasi (lewat dev server), dipakai sebagai pembanding. Logika Target Sekarang ditulis ulang di sini.
const LOAD = `
  const [{ fish }, { bugs }, { birds }, { recipes }, { achievements }] = await Promise.all(
    ['/src/data/wildlife/fish.js', '/src/data/wildlife/bugs.js', '/src/data/wildlife/birds.js', '/src/data/recipes/recipes.js', '/src/data/achievements/achievements.js'].map((p) => import(p)),
  )
  const DATA = { fish, bugs, birds, recipes, achievements }
  const locationsOf = (entry) => (entry.locations ?? (entry.location ? [{ name: entry.location }] : [])).map((l) => l.name)
  const expectCatch = (slug, { obtained = [], level = 99, period, next, weather }) => {
    const pool = DATA[slug].filter((e) => e.section === 'Base Game' && !obtained.includes(e.slug) && e.weather.includes(weather))
    const now = pool.filter((e) => e.schedule.includes(period))
    const later = pool.filter((e) => !e.schedule.includes(period) && e.schedule.includes(next))
    const open = (list) => list.filter((e) => e.level <= level)
    const groups = (list) => [...new Set(open(list).flatMap(locationsOf))].sort()
    return {
      now: open(now).map((e) => e.slug).sort(), next: open(later).map((e) => e.slug).sort(),
      nowGroups: groups(now), nextGroups: groups(later),
      locked: now.length + later.length - open(now).length - open(later).length,
      lockedSlugs: [...now, ...later].filter((e) => e.level > level).map((e) => e.slug).sort(),
    }
  }
`

async function runSuite(width) {
  const results = []
  const check = (name, ok, detail) => {
    results.push(Boolean(ok))
    console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${name}${detail ? `  — ${detail}` : ''}`)
  }
  const desktop = width >= 760
  const downloads = mkdtempSync(path.join(tmpdir(), 'hatowiki-checklist-'))
  const tab = await openTab(PORT, width)
  const { send, evaluate } = tab
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }] })
  await send('Storage.clearDataForOrigin', { origin: BASE_URL, storageTypes: 'local_storage,session_storage' })
  await send('Page.addScriptToEvaluateOnNewDocument', { source: FAKE_CLOCK })
  await send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads })
  await send('Network.enable')
  const requests = []
  tab.on('Network.requestWillBeSent', ({ request }) => requests.push(`${request.method} ${request.url}`))

  const go = async (route, wait = 1600) => {
    await send('Page.navigate', { url: BASE_URL + route })
    await sleep(wait)
  }
  const press = async (key, code, vk, text) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, ...(text ? { text } : {}) })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk })
    await sleep(200)
  }
  // Ketuk (ponsel, layar sentuh) atau klik mouse (desktop) di tengah sebuah elemen.
  const pointAt = (selector) => evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)})
    if (!el) return null
    el.scrollIntoView({ block: 'center' })
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  })()`)
  const tapOrClick = async (selector) => {
    const point = await pointAt(selector)
    if (!point) return false
    await sleep(100)
    if (desktop) {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point })
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 })
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 })
    } else {
      await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
      await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    }
    await sleep(400)
    return true
  }
  const stored = async () => JSON.parse((await evaluate(`localStorage.getItem('${STORAGE_KEY}')`)) ?? 'null')
  const rows = (scope = '.checklist-body') => evaluate(`[...document.querySelectorAll(${JSON.stringify(`${scope} .check-row`)})].map((row) => row.dataset.slug)`)
  const page = () => evaluate(`(() => ({
    path: location.pathname + location.search,
    kinds: [...document.querySelectorAll('.checklist-kind')].map((k) => k.querySelector('.checklist-kind__name').textContent + ':' + k.querySelector('.checklist-kind__count').textContent + (k.querySelector('input').checked ? '*' : '')),
    status: [...document.querySelectorAll('.checklist-tools .segmented__option')].map((o) => o.querySelector('span').firstChild.textContent + '=' + o.querySelector('.segmented__count').textContent + (o.querySelector('input').checked ? '*' : '')),
    toast: document.querySelector('.checklist-toast__text')?.textContent ?? null,
    undo: !!document.querySelector('.checklist-toast__undo'),
    showing: document.querySelector('.checklist-status')?.textContent ?? null,
  }))()`)
  if (!desktop) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })

  // ================= 1. Navigasi =================
  await go('/')
  if (desktop) {
    const nav = await evaluate(`(() => {
      const links = [...document.querySelectorAll('.site-nav > a')]
      const wiki = [...document.querySelectorAll('.nav-menu__button')].map((b) => b.textContent.trim())
      return { links: links.map((a) => a.textContent.trim() + '>' + a.getAttribute('href') + (a.querySelector('svg') ? '+ikon' : '')), wiki }
    })()`)
    await evaluate(`[...document.querySelectorAll('.nav-menu__button')].find((b) => b.textContent.trim() === 'Wiki').click()`); await sleep(300)
    const inWiki = await evaluate(`[...document.querySelectorAll('.nav-menu__panel a')].some((a) => a.getAttribute('href') === '/checklist')`)
    await press('Escape', 'Escape', 27)
    check('Toolbar desktop: tautan Checklist dengan ikon di samping menu Wildlife & Wiki, tidak di dalam dropdown Wiki',
      nav.links.join() === 'Checklist>/checklist+ikon' && nav.wiki.join() === 'Wildlife,Wiki' && !inWiki, `${nav.links.join()} · di Wiki: ${inWiki}`)
    await tapOrClick('.site-nav > a[href="/checklist"]'); await sleep(1200)
    const after = await evaluate(`({ path: location.pathname, active: document.querySelector('.site-nav > a[href="/checklist"]').classList.contains('active'), h1: document.querySelector('h1')?.textContent })`)
    check('Klik Checklist di toolbar membuka /checklist, tautannya aktif', after.path === '/checklist' && after.active && after.h1 === 'Checklist', JSON.stringify(after))
  } else {
    await evaluate(`document.querySelector('.site-header .menu-button').click()`); await sleep(500)
    const drawer = await evaluate(`[...document.querySelectorAll('.drawer__nav a')].slice(0, 3).map((a) => a.textContent.trim() + '>' + a.getAttribute('href') + (a.querySelector('svg') ? '+ikon' : ''))`)
    check('Drawer ponsel: Checklist (dengan ikon) tepat setelah Beranda', drawer[0] === 'Beranda>/+ikon' && drawer[1] === 'Checklist>/checklist+ikon', drawer.join(', '))
    await tapOrClick('.drawer__nav a[href="/checklist"]'); await sleep(1200)
    const after = await evaluate(`({ path: location.pathname, drawer: !!document.querySelector('.drawer'), h1: document.querySelector('h1')?.textContent })`)
    check('Ketuk Checklist di drawer membuka /checklist dan menutup drawer', after.path === '/checklist' && !after.drawer && after.h1 === 'Checklist', JSON.stringify(after))
  }
  const langs = []
  for (const [route, h1, title] of [['/th/checklist', 'เช็กลิสต์', 'เช็กลิสต์ | Hatowiki'], ['/en/checklist', 'Checklist', 'Checklist | Hatowiki'], ['/checklist', 'Checklist', 'Checklist | Hatowiki']]) {
    await go(route, 2000)
    const state = await evaluate(`(async () => {
      const lang = document.documentElement.lang
      const messages = (await import('/src/i18n/messages/' + lang + '.json')).default
      return {
        lang, h1: document.querySelector('h1')?.textContent, title: document.title,
        description: document.querySelector('meta[name="description"]').content, expected: messages.checklist.metaDescription,
        dashes: ${DASH}.test(JSON.stringify(messages.checklist) + messages.layout.checklist),
      }
    })()`)
    langs.push(state)
    check(`Bahasa ${state.lang}: ${route} berjudul "${h1}", title & meta description dari teks Checklist (≤160 karakter, tanpa tanda pisah panjang)`,
      state.h1 === h1 && state.title === title && state.description === state.expected && state.description.length <= 160 && !state.dashes, `${state.title} · ${state.description.length} karakter`)
  }

  // ================= 2. Ringkasan & tab =================
  const totals = await evaluate(`(async () => { ${LOAD} return Object.fromEntries(Object.entries(DATA).map(([k, v]) => [k, v.length])) })()`)
  let state = await page()
  check('Ringkasan: tab Fish, Bugs, Birds, Recipes, Achievements dengan 0/total dari data (termasuk event), Fish terpilih',
    state.kinds.join() === `Fish:0/${totals.fish}*,Bugs:0/${totals.bugs},Birds:0/${totals.birds},Recipes:0/${totals.recipes},Achievements:0/${totals.achievements}` && totals.fish === 124,
    state.kinds.join(' '))
  check('Filter bawaan Belum didapat dengan jumlah tiap status', state.status.join() === `Belum didapat=124*,Sudah didapat=0,Semua=124`, state.status.join(' '))
  const listInfo = await evaluate(`(async () => {
    ${LOAD}
    const rows = [...document.querySelectorAll('.checklist-body .check-row')]
    const sections = [...document.querySelectorAll('.checklist-section__head')].map((h) => h.textContent)
    return {
      count: rows.length,
      firstSection: sections[0], sections: sections.length,
      links: rows.every((r) => r.querySelector('.check-row__name').getAttribute('href') === '/wildlife/fish/' + r.dataset.slug),
      labels: rows.every((r) => r.querySelector('input[type=checkbox]').getAttribute('aria-label') === r.querySelector('.check-row__name').textContent + ' sudah didapat'),
      facts: rows.slice(0, 3).map((r) => r.querySelector('.check-row__facts').textContent.trim()),
      tall: Math.min(...rows.slice(0, 10).map((r) => r.querySelector('.check-row__hit').getBoundingClientRect().height)),
    }
  })()`)
  check('Daftar Fish: 124 baris (Base Game dulu), tiap nama tertaut ke halaman detail, kotak centang berlabel nama',
    listInfo.count === 124 && listInfo.firstSection?.includes('Base Game') && listInfo.sections > 1 && listInfo.links && listInfo.labels, `${listInfo.count} baris, ${listInfo.sections} section, pertama ${listInfo.firstSection}, label ${listInfo.labels}, tautan ${listInfo.links}`)
  check('Baris berisi level, lokasi, waktu, dan cuaca; tinggi baris ≥ 64px (mudah diketuk)', listInfo.facts.every((f) => /Level \d+/.test(f) && /Lokasi:/.test(f) && /Waktu:/.test(f) && /Cuaca:/.test(f)) && listInfo.tall >= 64,
    `${listInfo.facts[0]} · tinggi ${listInfo.tall.toFixed(0)}px`)

  // ================= 3. Menandai =================
  const [first, second, third] = await rows()
  await tapOrClick(`.check-row[data-slug="${first}"] .check-row__media`)
  let saved = await stored()
  state = await page()
  let remaining = await rows()
  check(`${desktop ? 'Klik' : 'Ketuk'} baris menandai sudah didapat: tersimpan di localStorage (kategori + slug), baris keluar dari Belum didapat, notifikasi + Batalkan`,
    saved?.version === 1 && saved.obtained.fish?.join() === first && !remaining.includes(first) && remaining.length === 123 && /ditandai sudah didapat/.test(state.toast ?? '') && state.undo,
    `${JSON.stringify(saved?.obtained)} · ${state.toast}`)
  check('Ringkasan & jumlah status ikut berubah (1/124, Belum 123, Sudah 1)', state.kinds[0] === 'Fish:1/124*' && state.status.join() === 'Belum didapat=123*,Sudah didapat=1,Semua=124', `${state.kinds[0]} · ${state.status.join(' ')}`)
  await tapOrClick('.checklist-toast__undo')
  saved = await stored()
  remaining = await rows()
  check('Batalkan di notifikasi mengembalikan baris & progres', remaining[0] === first && (saved.obtained.fish ?? []).length === 0 && !(await page()).toast, remaining.slice(0, 2).join())
  for (const slug of [first, second]) {
    await evaluate(`document.querySelector('.check-row[data-slug="${slug}"] .check-row__media').click()`); await sleep(250)
  }
  // Keyboard: Space di kotak centang menandai, fokus pindah ke kotak centang baris berikutnya.
  const nextSlug = (await rows())[1]
  await evaluate(`document.querySelector('.check-row[data-slug="${third}"] .check-row__input').focus()`)
  await press(' ', 'Space', 32, ' ')
  await sleep(200)
  const keyboard = await evaluate(`({ focus: document.activeElement?.closest('.check-row')?.dataset.slug, isBox: document.activeElement?.classList.contains('check-row__input') })`)
  saved = await stored()
  check('Keyboard: Space menandai, fokus pindah ke kotak centang baris berikutnya', saved.obtained.fish.includes(third) && keyboard.isBox && keyboard.focus === nextSlug, `fokus ${keyboard.focus}, harapan ${nextSlug}`)
  const marked = saved.obtained.fish
  const nameRow = (await rows())[0]
  await tapOrClick(`.check-row[data-slug="${nameRow}"] .check-row__name`); await sleep(1200)
  const detail = await evaluate(`location.pathname`)
  saved = await stored()
  check('Ketuk nama membuka halaman detail tanpa menandai', detail === `/wildlife/fish/${nameRow}` && !saved.obtained.fish.includes(nameRow), detail)
  await evaluate('history.back()'); await sleep(1500)
  await go('/checklist')
  state = await page()
  check('Progres tetap ada setelah dimuat ulang', state.kinds[0] === 'Fish:3/124*' && marked.length === 3, state.kinds[0])

  // ================= 4. Filter & pencarian =================
  await tapOrClick('.checklist-tools .segmented__option[data-value="sudah"] span')
  state = await page()
  let shown = await rows()
  check('Sudah didapat: hanya yang ditandai, urut data, status di URL', shown.join() === [first, second, third].join() && state.path === '/checklist?status=sudah', `${shown.join()} · ${state.path}`)
  await tapOrClick('.checklist-tools .segmented__option[data-value="semua"] span')
  shown = await rows()
  const checked = await evaluate(`[...document.querySelectorAll('.check-row[data-obtained]')].map((r) => r.dataset.slug).join()`)
  check('Semua: 124 baris, yang sudah didapat tercentang', shown.length === 124 && checked === [first, second, third].join(), `${shown.length} baris, tercentang ${checked}`)
  await evaluate(`document.querySelector('.check-row[data-slug="${second}"] .check-row__media').click()`); await sleep(300)
  state = await page()
  const stillThere = (await rows()).includes(second)
  check('Di Semua, membatalkan tanda tidak menghilangkan baris dan tanpa notifikasi', stillThere && !state.toast && !(await stored()).obtained.fish.includes(second), `${stillThere} · ${state.toast}`)
  await evaluate(`document.querySelector('.check-row[data-slug="${second}"] .check-row__media').click()`); await sleep(300)
  await tapOrClick('.checklist-tools .segmented__option[data-value="belum"] span')
  await evaluate(`(() => { const input = document.querySelector('.checklist-search input'); input.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(input, 'bass'); input.dispatchEvent(new Event('input', { bubbles: true })) })()`)
  await sleep(700)
  const search = await evaluate(`(async () => { ${LOAD} return { rows: [...document.querySelectorAll('.checklist-body .check-row')].map((r) => r.dataset.slug).sort().join(), expected: fish.filter((e) => /bass/i.test(e.name) && !${JSON.stringify(marked)}.includes(e.slug)).map((e) => e.slug).sort().join(), path: location.pathname + location.search } })()`)
  check('Pencarian "bass": hanya nama yang cocok (yang belum didapat), kata kunci di URL', search.rows === search.expected && search.rows.length > 0 && search.path.includes('q=bass'), `${search.rows} · ${search.path}`)
  await evaluate(`(() => { const input = document.querySelector('.checklist-search input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(input, 'zzzz'); input.dispatchEvent(new Event('input', { bubbles: true })) })()`)
  await sleep(700)
  const empty = await evaluate(`document.querySelector('.checklist-empty')?.textContent`)
  check('Pencarian tanpa hasil: pesan kosong', /Tidak ada ikan yang cocok dengan “zzzz”/.test(empty ?? ''), empty)
  await tapOrClick('.checklist-kind[data-wildlife="bugs"] .checklist-kind__name')
  state = await page()
  const bugsInfo = await evaluate(`({ rows: document.querySelectorAll('.checklist-body .check-row').length, query: document.querySelector('.checklist-search input').value, title: document.querySelector('.checklist-main__title').firstChild.textContent, link: document.querySelector('.check-row__name').getAttribute('href') })`)
  check('Ganti ke Bugs: kategori di URL, pencarian dikosongkan, 101 baris dengan tautan ke detail serangga',
    state.path === '/checklist?kategori=bugs' && bugsInfo.rows === totals.bugs && bugsInfo.query === '' && bugsInfo.title === 'Bugs' && bugsInfo.link.startsWith('/wildlife/bugs/'), `${state.path} · ${JSON.stringify(bugsInfo)}`)
  for (const [slug, total] of [['recipes', totals.recipes], ['achievements', totals.achievements]]) {
    await tapOrClick(`.checklist-kind[data-wildlife="${slug}"] .checklist-kind__name`)
    const info = await evaluate(`({ rows: document.querySelectorAll('.checklist-body .check-row').length, view: !!document.querySelector('input[name="checklist-view"]'), sections: document.querySelectorAll('.checklist-section__head').length, link: document.querySelector('.check-row__name').getAttribute('href'), facts: document.querySelector('.check-row__facts').textContent })`)
    check(`${slug === 'recipes' ? 'Recipes' : 'Achievements'}: ${total} baris, tanpa Target Sekarang, nama tertaut ke detail${slug === 'recipes' ? ', section event di bawah Base Game' : ', satu section tanpa judul'}`,
      info.rows === total && !info.view && info.link.startsWith(`/${slug}/`) && (slug === 'recipes' ? info.sections > 1 : info.sections === 0), JSON.stringify(info))
  }

  // ================= 5. Target Sekarang =================
  await go('/checklist?tampilan=sekarang')
  const readCatch = () => evaluate(`(() => {
    const section = (sel) => {
      const root = document.querySelector(sel)
      if (!root) return null
      const rows = [...root.querySelectorAll('.check-row')]
      return {
        slugs: [...new Set(rows.map((r) => r.dataset.slug))].sort(),
        groups: [...root.querySelectorAll('.catch-group')].map((g) => g.dataset.location).sort(),
        locked: [...new Set(rows.filter((r) => r.dataset.locked !== undefined).map((r) => r.dataset.slug))].sort(),
        links: rows.every((r) => r.querySelector('.check-row__name').getAttribute('href').endsWith('/' + r.dataset.slug)),
        badge: root.querySelector('.period-badge')?.textContent.trim() ?? null,
        when: root.querySelector('.catch-section__when')?.textContent.trim() ?? null,
        count: root.querySelector('.catch-section__count')?.textContent.trim() ?? null,
      }
    }
    return {
      period: document.querySelector('.catch-now__clock .period-badge')?.textContent.trim(),
      clock: document.querySelector('.catch-now__time')?.textContent,
      level: document.querySelector('.level-stepper__value')?.textContent,
      server: document.querySelector('input[name="catch-server-fish"]:checked')?.value,
      weather: document.querySelector('input[name="catch-weather-fish"]:checked')?.value,
      lockedNote: document.querySelector('.catch-now__locked p')?.textContent ?? null,
      now: section('.catch-section--now'), next: section('.catch-section--next'),
    }
  })()`)
  const expectFor = (options) => evaluate(`(async () => { ${LOAD} return expectCatch('fish', ${JSON.stringify(options)}) })()`)
  let caught = await readCatch()
  let expected = await expectFor({ obtained: marked, period: 'Day', next: 'Dusk', weather: 'Sunny' })
  check('Target Sekarang (SEA 12:30, Sunny, level bawaan = level tertinggi): periode Day, isi = Base Game belum didapat yang muncul saat Day & Sunny',
    caught.period === 'Day' && /^12:3\d$/.test(caught.clock) && caught.server === 'sea' && caught.weather === 'Sunny' && caught.level === '14' &&
      caught.now.slugs.join() === expected.now.join() && expected.now.length > 0 && !caught.now.slugs.some((slug) => marked.includes(slug)),
    `${caught.period} ${caught.clock} · ${caught.now.slugs.length} entri (harapan ${expected.now.length})`)
  check('Target Sekarang: dikelompokkan per lokasi (satu nampan per lokasi), tiap nama tertaut ke halaman detail',
    caught.now.groups.join() === expected.nowGroups.join() && caught.now.links && caught.next.links, `${caught.now.groups.length} lokasi`)
  check('Periode berikutnya: Dusk mulai pukul 18.00 (5 jam ±30 menit lagi), isinya yang baru muncul saat Dusk',
    caught.next.badge === 'Dusk' && /Mulai pukul 18\.00, 5 jam \d+ menit lagi\./.test(caught.next.when) && caught.next.slugs.join() === expected.next.join() && caught.next.groups.join() === expected.nextGroups.join(),
    `${caught.next.when} · ${caught.next.slugs.length} entri (harapan ${expected.next.length})`)
  // Level: turunkan ke 3 dengan tombol −.
  for (let i = 0; i < 11; i++) await evaluate(`document.querySelector('.level-stepper__button').click()`)
  await sleep(300)
  caught = await readCatch()
  expected = await expectFor({ obtained: marked, level: 3, period: 'Day', next: 'Dusk', weather: 'Sunny' })
  saved = await stored()
  check('Level Fishing 3: entri dengan syarat level di atas 3 disembunyikan, jumlahnya disebut, level disimpan per hobi',
    caught.level === '3' && saved.levels.fish === 3 && caught.now.slugs.join() === expected.now.join() && caught.next.slugs.join() === expected.next.join() &&
      caught.lockedNote === `${expected.locked} lainnya butuh level lebih tinggi.` && caught.now.locked.length === 0,
    `${caught.now.slugs.length}+${caught.next.slugs.length} entri · ${caught.lockedNote}`)
  await tapOrClick('.catch-now__toggle input')
  caught = await readCatch()
  const dim = await evaluate(`(() => { const row = document.querySelector('.check-row[data-locked]'); return row ? { media: getComputedStyle(row.querySelector('.check-row__media')).opacity, badge: row.querySelector('.check-row__locked')?.textContent } : null })()`)
  check('"Tampilkan redup": entri yang levelnya belum cukup tampil redup dengan syaratnya (Butuh Lv. N)',
    [...new Set([...caught.now.locked, ...caught.next.locked])].sort().join() === expected.lockedSlugs.join() && Number(dim?.media) < 1 && /^Butuh Lv\. \d+$/.test(dim?.badge ?? ''),
    JSON.stringify(dim))
  await tapOrClick('.catch-now__toggle input')
  for (const weather of ['Rainy', 'Rainbow']) {
    await tapOrClick(`input[name="catch-weather-fish"][value="${weather}"] + span`)
    caught = await readCatch()
    expected = await expectFor({ obtained: marked, level: 3, period: 'Day', next: 'Dusk', weather })
    check(`Cuaca ${weather}: isi mengikuti cuaca pilihan`, caught.weather === weather && caught.now.slugs.join() === expected.now.join() && caught.next.slugs.join() === expected.next.join(),
      `${caught.now.slugs.length}+${caught.next.slugs.length} entri`)
  }
  await tapOrClick('input[name="catch-server-fish"][value="america"] + span')
  caught = await readCatch()
  expected = await expectFor({ obtained: marked, level: 3, period: 'Night', next: 'Dawn', weather: 'Rainbow' })
  const server = await evaluate(`localStorage.getItem('hdx-server')`)
  check('Server America (00:30 = Night): periode Night, berikutnya Dawn pukul 06.00, server diingat (sama dengan beranda)',
    caught.period === 'Night' && /^00:3\d$/.test(caught.clock) && caught.next.badge === 'Dawn' && /Mulai pukul 06\.00, 5 jam \d+ menit lagi\./.test(caught.next.when) &&
      caught.now.slugs.join() === expected.now.join() && caught.next.slugs.join() === expected.next.join() && server === 'america',
    `${caught.period} ${caught.clock} · ${caught.next.when} · ${server}`)
  await go('/checklist?tampilan=sekarang')
  caught = await readCatch()
  const weatherSession = await evaluate(`sessionStorage.getItem('hdx-checklist-weather')`)
  check('Setelah dimuat ulang: server America, level 3, dan cuaca Rainbow (sesi) tetap', caught.server === 'america' && caught.level === '3' && caught.weather === 'Rainbow' && weatherSession === 'Rainbow',
    `${caught.server} · ${caught.level} · ${caught.weather}`)
  await tapOrClick('input[name="catch-server-fish"][value="sea"] + span')
  await tapOrClick('input[name="catch-weather-fish"][value="Sunny"] + span')
  caught = await readCatch()
  const target = caught.now.slugs[0]
  await tapOrClick(`.catch-section--now .check-row[data-slug="${target}"] .check-row__media`)
  caught = await readCatch()
  saved = await stored()
  state = await page()
  check('Menandai dari Target Sekarang: entri hilang dari daftar, tersimpan, notifikasi muncul, ringkasan bertambah',
    !caught.now.slugs.includes(target) && saved.obtained.fish.includes(target) && /ditandai sudah didapat/.test(state.toast ?? '') && state.kinds[0] === 'Fish:4/124*', `${target} · ${state.kinds[0]}`)
  const events = await evaluate(`(async () => { ${LOAD} const rows = [...document.querySelectorAll('.catch-now .check-row')].map((r) => r.dataset.slug); return rows.filter((slug) => fish.find((e) => e.slug === slug).section !== 'Base Game') })()`)
  check('Target Sekarang hanya berisi entri Base Game (entri event tidak ikut)', events.length === 0, events.join())
  await tapOrClick('.checklist-kind[data-wildlife="birds"] .checklist-kind__name')
  await tapOrClick('input[name="checklist-view"][value="sekarang"] + span')
  const birds = await evaluate(`({ level: document.querySelector('.level-stepper__value')?.textContent, label: document.querySelector('.level-stepper .chip-radios__legend')?.textContent, path: location.pathname + location.search })`)
  check('Birds punya Target Sekarang sendiri: level Birdwatching terpisah (bawaan level tertinggi)', birds.label === 'Level Birdwatching' && birds.level === '14' && birds.path.includes('kategori=birds') && birds.path.includes('tampilan=sekarang'), JSON.stringify(birds))
  if (!desktop) {
    const taps = await evaluate(`(() => {
      const sizes = [...document.querySelectorAll('.level-stepper__button, .chip-radios__option > span, .segmented__option > span, .catch-now .check-row__hit')].map((el) => el.getBoundingClientRect().height)
      return { min: Math.min(...sizes), overflow: document.documentElement.scrollWidth - innerWidth }
    })()`)
    check('Ponsel: semua tombol, pilihan, dan baris Target Sekarang setinggi ≥ 44px, halaman tidak melebar', taps.min >= 44 && taps.overflow <= 0, JSON.stringify(taps))
  }

  // ================= 6. Reset per kategori =================
  await go('/checklist')
  const openReset = async () => { await tapOrClick('.checklist-reset'); return evaluate(`({ open: !!document.querySelector('dialog.confirm-dialog[open]'), text: document.querySelector('dialog[open] .confirm-dialog__text')?.textContent, focus: document.activeElement?.classList.contains('confirm-dialog__cancel'), centered: (() => { const r = document.querySelector('dialog[open]')?.getBoundingClientRect(); const root = document.documentElement; return !!r && Math.abs(r.left - (root.clientWidth - r.right)) <= 2 && Math.abs(r.top - (root.clientHeight - r.bottom)) <= 2 })() })`) }
  let dialog = await openReset()
  check('Reset Fish membuka dialog konfirmasi di tengah layar (jumlah yang akan dihapus disebut, fokus di Batal)', dialog.open && /untuk 4 ikan/.test(dialog.text) && dialog.focus && dialog.centered, dialog.text)
  await tapOrClick('dialog[open] .confirm-dialog__cancel')
  saved = await stored()
  dialog = await evaluate(`!!document.querySelector('dialog[open]')`)
  check('Batal menutup dialog tanpa menghapus progres', !dialog && saved.obtained.fish.length === 4)
  await openReset()
  await press('Escape', 'Escape', 27)
  saved = await stored()
  dialog = await evaluate(`!!document.querySelector('dialog[open]')`)
  check('Escape menutup dialog tanpa menghapus progres', !dialog && saved.obtained.fish.length === 4)
  await openReset()
  await tapOrClick('dialog[open] .confirm-dialog__confirm')
  saved = await stored()
  state = await page()
  const resetDisabled = await evaluate(`document.querySelector('.checklist-reset').disabled`)
  check('Reset dikonfirmasi: progres Fish terhapus (level tetap), ringkasan 0, tombol reset nonaktif', !saved.obtained.fish && saved.levels.fish === 3 && state.kinds[0] === 'Fish:0/124*' && resetDisabled && /direset/.test(state.toast ?? ''), state.kinds[0])

  // ================= 7. Cadangkan & Pulihkan =================
  const sample = await evaluate(`(async () => { ${LOAD} return { fish: fish.slice(0, 3).map((e) => e.slug), recipes: recipes.slice(0, 2).map((e) => e.slug), achievements: achievements.slice(0, 1).map((e) => e.slug) } })()`)
  await evaluate(`localStorage.setItem('${STORAGE_KEY}', ${JSON.stringify(JSON.stringify({ version: 1, obtained: sample, levels: { fish: 3 } }))})`)
  await go('/checklist')
  await tapOrClick('.backup-panel__backup')
  await sleep(1200)
  const files = readdirSync(downloads).filter((name) => name.endsWith('.json'))
  const backupPath = files.length ? path.join(downloads, files[0]) : null
  const backup = backupPath ? JSON.parse(readFileSync(backupPath, 'utf8')) : null
  const backupStatus = await evaluate(`document.querySelector('.backup-panel__status').textContent`)
  check('Cadangkan mengunduh hatowiki-checklist-2026-10-01.json berisi penanda app/kind, versi, progres per kategori & slug, dan level',
    files[0] === 'hatowiki-checklist-2026-10-01.json' && backup?.app === 'hatowiki' && backup.kind === 'checklist' && backup.version === 1 &&
      JSON.stringify(backup.obtained) === JSON.stringify(sample) && backup.levels.fish === 3 && backupStatus.includes(files[0]),
    `${files.join()} · ${backupStatus}`)
  await evaluate(`localStorage.removeItem('${STORAGE_KEY}')`)
  await go('/checklist')
  state = await page()
  const cleared = state.kinds.every((k) => k.includes(':0/'))
  const chooseFile = async (file) => {
    const { root } = (await send('DOM.getDocument', { depth: 0 })).result
    const { nodeId } = (await send('DOM.querySelector', { nodeId: root.nodeId, selector: '.backup-panel input[type=file]' })).result
    await send('DOM.setFileInputFiles', { nodeId, files: [file] })
    await sleep(700)
  }
  await send('DOM.enable')
  await chooseFile(backupPath)
  dialog = await evaluate(`({ open: !!document.querySelector('dialog[open]'), text: document.querySelector('dialog[open] .confirm-dialog__text')?.textContent })`)
  check('Pulihkan: pilih berkas → dialog konfirmasi dengan ringkasan isinya', cleared && dialog.open && dialog.text?.includes('hatowiki-checklist-2026-10-01.json') && dialog.text.includes('Fish 3') && dialog.text.includes('Recipes 2') && dialog.text.includes('Achievements 1'), dialog.text)
  await tapOrClick('dialog[open] .confirm-dialog__confirm')
  saved = await stored()
  state = await page()
  check('Pulihkan dikonfirmasi: progres & level kembali seperti cadangan, ringkasan diperbarui', JSON.stringify(saved.obtained) === JSON.stringify(sample) && saved.levels.fish === 3 && state.kinds.join().includes('Fish:3/124') && state.kinds.join().includes('Recipes:2/') && state.kinds.join().includes('Achievements:1/'),
    state.kinds.join(' '))
  const scratch = mkdtempSync(path.join(tmpdir(), 'hatowiki-restore-'))
  const bad = [
    ['bukan-json.json', 'ini bukan json', /bukan file JSON yang valid/],
    ['lain.json', JSON.stringify({ foo: 1 }), /bukan file cadangan Checklist Hatowiki/],
    ['baru.json', JSON.stringify({ app: 'hatowiki', kind: 'checklist', version: 99, obtained: {} }), /versi Hatowiki yang lebih baru/],
  ]
  const rejected = []
  for (const [name, content, pattern] of bad) {
    const file = path.join(scratch, name)
    writeFileSync(file, content)
    await chooseFile(file)
    const result = await evaluate(`({ open: !!document.querySelector('dialog[open]'), status: document.querySelector('.backup-panel__status').textContent, tone: document.querySelector('.backup-panel__status').dataset.tone })`)
    rejected.push(!result.open && result.tone === 'error' && pattern.test(result.status) ? `${name} ✓` : `${name} ✗ ${result.status}`)
  }
  saved = await stored()
  check('Berkas yang salah (bukan JSON, JSON lain, versi lebih baru) ditolak dengan pesan, progres tidak berubah', rejected.every((r) => r.endsWith('✓')) && JSON.stringify(saved.obtained) === JSON.stringify(sample), rejected.join(', '))
  const future = path.join(scratch, 'masa-depan.json')
  writeFileSync(future, JSON.stringify({ app: 'hatowiki', kind: 'checklist', version: 1, obtained: { fish: [sample.fish[0], 'ikan-masa-depan'], animals: ['sea-otter'] }, levels: { fish: 9 } }))
  await chooseFile(future)
  await tapOrClick('dialog[open] .confirm-dialog__confirm')
  saved = await stored()
  state = await page()
  check('Slug & kategori yang belum dikenal tetap disimpan, tapi yang dihitung hanya entri yang ada di data',
    saved.obtained.fish.join() === `${sample.fish[0]},ikan-masa-depan` && saved.obtained.animals?.join() === 'sea-otter' && saved.levels.fish === 9 && state.kinds[0] === 'Fish:1/124*', `${JSON.stringify(saved.obtained)} · ${state.kinds[0]}`)
  rmSync(scratch, { recursive: true, force: true })

  // ================= 8. Privasi, tata letak, bahasa, console =================
  const sent = requests.filter((line) => !line.startsWith('GET '))
  check('Tidak ada request selain GET selama uji (progres tidak dikirim ke server mana pun)', sent.length === 0, sent.slice(0, 3).join(' | '))
  const layout = await evaluate(`(() => {
    const row = document.querySelector('.checklist-kinds__row')
    return { overflow: document.documentElement.scrollWidth - innerWidth, scrolls: row.scrollWidth > row.clientWidth + 1, toast: (() => { const t = document.querySelector('.checklist-toast-region').getBoundingClientRect(); return t.left >= 0 && t.right <= innerWidth && t.bottom <= innerHeight })() }
  })()`)
  check(desktop ? 'Desktop: lima tab kategori sebaris tanpa geser, halaman tidak melebar' : 'Ponsel: tab kategori satu baris yang bisa digeser, halaman tidak melebar, notifikasi di dalam layar',
    layout.overflow <= 0 && (desktop ? !layout.scrolls : layout.scrolls && layout.toast), JSON.stringify(layout))
  await go('/th/checklist?tampilan=sekarang')
  const th = await evaluate(`({ view: [...document.querySelectorAll('input[name="checklist-view"]')].map((i) => i.nextElementSibling.textContent).join(), level: document.querySelector('.level-stepper .chip-radios__legend')?.textContent, now: document.querySelector('.catch-section--now .catch-section__title')?.firstChild.textContent })`)
  await go('/en/checklist')
  const en = await evaluate(`({ view: [...document.querySelectorAll('input[name="checklist-view"]')].map((i) => i.nextElementSibling.textContent).join(), status: [...document.querySelectorAll('.checklist-tools .segmented__option span')].map((s) => s.firstChild.textContent).filter((t) => /[a-z]/i.test(t)).join() })`)
  check('Thai & Inggris: label tab dan Target Sekarang diterjemahkan (เป้าหมายตอนนี้ / Catch Now)',
    th.view === 'รายการ,เป้าหมายตอนนี้' && th.level === 'เลเวล Fishing' && th.now === 'หาได้ตอนนี้' && en.view === 'List,Catch Now' && en.status === 'Not obtained,Obtained,All', `${JSON.stringify(th)} · ${JSON.stringify(en)}`)
  const errors = tab.logs.filter((line) => /EXCEPTION|console\.error|\[i18n\]/.test(line) && !line.includes('[Vercel Web Analytics]'))
  check('Tidak ada error atau teks i18n yang hilang di console', errors.length === 0, errors.slice(0, 3).join(' | '))

  await tab.close()
  rmSync(downloads, { recursive: true, force: true })
  return results
}

const chrome = await startChrome(PORT)
let all = []
try {
  for (const width of WIDTHS.length ? WIDTHS : [390, 1280]) {
    console.log(`\n=== Checklist — lebar ${width}px`)
    all = all.concat(await runSuite(width))
  }
} finally {
  chrome.stop()
}
const passed = all.filter(Boolean).length
console.log(`\n${passed}/${all.length} lulus`)
process.exitCode = passed === all.length ? 0 : 1
