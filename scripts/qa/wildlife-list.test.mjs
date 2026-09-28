#!/usr/bin/env node
/**
 * Uji interaksi halaman daftar katalog di Chrome headless (lewat Chrome DevTools Protocol): wildlife
 * (/wildlife/fish, /wildlife/bugs, /wildlife/birds, /wildlife/animals), resep (/recipes), tanaman (/crops), dan
 * collectible (/collectibles). Rangkaian uji yang
 * sama dijalankan untuk tiap kategori; Bugs, Birds, dan Animals ditambah uji lokasi jamak (filter lokasi,
 * "lokasi pertama +N", detail dengan beberapa lokasi). Kategori berlevel juga menguji warna badge level
 * (token per level, light & dark, kontras AA, warna cadangan). Animals menguji tanpa level/jadwal/harga, peta
 * dengan pin tempat makan, dan makanan favorit; Resep menguji pencarian nama bahan, energi, harga jual, bahan
 * tetap & pilihan, serta tautan bahan ke halaman resep lain. Bahan resep & makanan hewan berjenis ikan (serangga,
 * burung) tertaut ke detailnya, "Any Fish" ke daftar Fish, jenis lain tanpa tautan. Semua kategori: kotak gambar
 * kartu persegi & seragam (gambar tinggi/lebar tetap utuh). Bugs & Birds: detail dengan badge level di gambar dan
 * dua bagian seimbang (tanpa kolom Level). Resep: satu jenis masakan (field family) selalu berdampingan, dengan urutan
 * manual familyOrder (Roll Cake: urutan pelangi). Semua kategori: warna badge kategori dari token --category-<kunci>
 * (Common putih/netral, event berwarna, cadangan untuk kategori baru), beda gaya dari badge level, kontras AA.
 * Semua kategori: hasil dibagi per section (Base Game paling atas, lalu event dari yang terbaru sampai yang terlama),
 * judul section berisi emoji, nama, dan jumlah; section kosong disembunyikan; status event tidak tampil. Crops &
 * Collectibles: detail (nilai per bintang semua deret, info tanam, nilai jual & energi, lokasi & peta), "Dipakai di
 * resep" & "Makanan favorit hewan" dihitung dari data, bahan & makanan Crop/Collectible tertaut ke detailnya.
 * Entri event Fish, Bugs, Birds, Animals, Resep: tiap section berisi persis entri section itu, filter/pencarian/urutan
 * per section, detail event (badge kategori, tanpa status, harga yang tidak ada di sumber "—", lokasi event dengan zona
 * atau placeholder), kelompok resep event, dan tautan bahan event (termasuk Frostspore King Crab di Seafood Risotto).
 *
 * Pemakaian (dev server harus sudah jalan):
 *   npm run dev
 *   npm run test:ui                                  → Fish, Bugs, Birds, Animals, Resep, Crops & Collectibles, lebar 1280, 820, 390
 *   node scripts/qa/wildlife-list.test.mjs 390       → lebar tertentu
 *   node scripts/qa/wildlife-list.test.mjs bugs 390  → kategori tertentu
 *
 * Variabel lingkungan: BASE_URL (bawaan http://localhost:5173), CHROME_PATH (lokasi Chrome/Edge).
 *
 * Pengecekan filter memakai aturan (ATAU dalam kelompok, DAN antar kelompok), bukan nama entri
 * tertentu, supaya tetap berlaku saat data bertambah.
 */
import { contrastRatio, openTab as openCdpTab, parseRgb, sleep, startChrome as startCdpChrome, toLinear } from './cdp.mjs'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173'
const WIDTHS = process.argv.slice(2).map(Number).filter(Boolean)

/**
 * Konfigurasi uji per kategori. `extraGroup` = kelompok filter ketiga di uji "DAN" (Shadow untuk ikan;
 * Bugs tidak punya Shadow, jadi Kategori). `firstDropdown` = dropdown yang dibuka di uji klik/keyboard.
 * `andFilter` = filter kedua di uji "DAN" beserta indeks baris info kartu yang memuat nilainya.
 * `keyboard` = dropdown untuk uji keyboard (dua opsi pertama dan parameter URL setelah opsi kedua dicentang).
 */
const KINDS = {
  fish: {
    path: '/wildlife/fish',
    name: 'Fish',
    noun: 'ikan',
    search: 'BaSS',
    searchMatch: /bass/i,
    groups: ['Level', 'Shadow', 'Lokasi', 'Cuaca', 'Waktu muncul', 'Kategori'],
    extraGroup: { label: 'Shadow', param: 'shadow' },
    firstDropdown: 'Shadow',
    andFilter: { group: 'Waktu muncul', value: 'Dusk', fact: 1, param: 'waktu=Dusk' },
    keyboard: { group: 'Cuaca', first: 'Rainbow', second: 'Sunny', param: 'cuaca=Sunny' },
    priceLabel: 'Harga jual',
  },
  bugs: {
    path: '/wildlife/bugs',
    name: 'Bugs',
    noun: 'serangga',
    search: 'BeeTLE',
    searchMatch: /beetle/i,
    groups: ['Level', 'Lokasi', 'Cuaca', 'Waktu muncul', 'Kategori'],
    extraGroup: { label: 'Kategori', param: 'kategori' },
    firstDropdown: 'Level',
    multiLocation: true,
    andFilter: { group: 'Waktu muncul', value: 'Dusk', fact: 1, param: 'waktu=Dusk' },
    keyboard: { group: 'Cuaca', first: 'Rainbow', second: 'Sunny', param: 'cuaca=Sunny' },
    priceLabel: 'Harga jual',
  },
  birds: {
    path: '/wildlife/birds',
    name: 'Birds',
    noun: 'burung',
    search: 'PiGeOn',
    searchMatch: /pigeon/i,
    groups: ['Level', 'Lokasi', 'Cuaca', 'Waktu muncul', 'Kategori'],
    extraGroup: { label: 'Kategori', param: 'kategori' },
    firstDropdown: 'Level',
    multiLocation: true,
    andFilter: { group: 'Waktu muncul', value: 'Dusk', fact: 1, param: 'waktu=Dusk' },
    keyboard: { group: 'Cuaca', first: 'Rainbow', second: 'Sunny', param: 'cuaca=Sunny' },
    // Burung dipotret; yang dijual Info Card (foto), bukan burungnya.
    priceLabel: 'Harga jual Info Card',
  },
  // Hewan: tanpa level, jadwal, dan harga; cuacanya "Cuaca favorit", lokasi ditandai pin tempat makan.
  animals: {
    path: '/wildlife/animals',
    name: 'Animals',
    noun: 'hewan',
    search: 'FoX',
    searchMatch: /fox/i,
    groups: ['Lokasi', 'Cuaca favorit', 'Kategori'],
    extraGroup: { label: 'Kategori', param: 'kategori' },
    firstDropdown: 'Lokasi',
    multiLocation: true,
    animal: true,
    noLevel: true,
    andFilter: { group: 'Cuaca favorit', value: 'Rainbow', fact: 1, param: 'cuaca=Rainbow' },
    keyboard: { group: 'Cuaca favorit', first: 'Rainbow', second: 'Sunny', param: 'cuaca=Sunny' },
  },
  // Resep: filter Level & Kategori, pencarian nama resep dan nama bahan, detail dengan energi & bahan.
  recipes: {
    path: '/recipes',
    name: 'Recipes',
    noun: 'resep',
    search: 'TiRaMiSu',
    groups: ['Level', 'Kategori'],
    extraGroup: { label: 'Kategori', param: 'kategori' },
    firstDropdown: 'Level',
    recipe: true,
    keyboard: { group: 'Level', first: 'Level 1', second: 'Level 2', param: 'level=2' },
    priceLabel: 'Harga jual',
  },
  // Tanaman: filter Level & Kategori (uji ATAU memakai Level seperti resep), detail di bagian 20.
  crops: {
    path: '/crops',
    name: 'Crops',
    noun: 'tanaman',
    search: 'ToMaTo',
    searchMatch: /tomato/i,
    groups: ['Level', 'Kategori'],
    extraGroup: { label: 'Kategori', param: 'kategori' },
    firstDropdown: 'Level',
    filterByLevel: true,
    goods: 'crops',
    keyboard: { group: 'Level', first: 'Level 1', second: 'Level 2', param: 'level=2' },
    priceLabel: 'Harga jual',
  },
  // Collectible: tanpa level; filter Lokasi & Kategori; kartu berisi lokasi & nilai jual.
  collectibles: {
    path: '/collectibles',
    name: 'Collectibles',
    noun: 'bahan alam',
    search: 'MuShRoOm',
    searchMatch: /mushroom/i,
    groups: ['Lokasi', 'Kategori'],
    extraGroup: { label: 'Kategori', param: 'kategori' },
    firstDropdown: 'Lokasi',
    noLevel: true,
    cardFacts: 'info lokasi & nilai jual saja',
    goods: 'collectibles',
    keyboard: { group: 'Kategori', first: 'Common', second: 'Meteor Shower', param: 'kategori=Meteor+Shower' },
  },
}
const ONLY_KINDS = process.argv.slice(2).filter((arg) => KINDS[arg])
const PORT = 9400 + Math.floor(Math.random() * 400)
const startChrome = () => startCdpChrome(PORT)
const openTab = (width) => openCdpTab(PORT, width)

// Warna CSS terhitung ("rgb(r, g, b)") → jarak OKLab, untuk uji warna badge level (kontras WCAG ada di cdp.mjs).
function oklab(css) {
  const [r, g, b] = parseRgb(css).map(toLinear)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]
}
const colorDistance = (a, b) => Math.hypot(...oklab(a).map((v, i) => v - oklab(b)[i]))
// Batas "bisa dibedakan" untuk latar badge level yang bersebelahan (JND OKLab ≈ 0,02).
const MIN_LEVEL_DISTANCE = 0.03

// Modul data & nama ekspor per kategori (kunci = segmen terakhir path daftar).
const DATA_MODULES = {
  fish: ['/src/data/wildlife/fish.js', 'fish'],
  bugs: ['/src/data/wildlife/bugs.js', 'bugs'],
  birds: ['/src/data/wildlife/birds.js', 'birds'],
  animals: ['/src/data/wildlife/animals.js', 'animals'],
  recipes: ['/src/data/recipes/recipes.js', 'recipes'],
  crops: ['/src/data/crops/crops.js', 'crops'],
  collectibles: ['/src/data/collectibles/collectibles.js', 'collectibles'],
}

// Kode (dijalankan di halaman lewat evaluate) yang mendefinisikan expectedHref(id): tautan yang diharapkan untuk
// sebuah benda. Resep, tanaman, collectible yang ada datanya → /recipes|crops|collectibles/<slug>; ikan/serangga/burung
// yang ada datanya → /wildlife/<kategori>/<slug>; benda generik any/<kategori> ("Any Fish") → halaman daftar
// kategorinya; lainnya (Ingredient) null.
const EXPECTED_ITEM_HREF = `
  const [{ recipes }, { fish }, { bugs }, { birds }, { crops }, { collectibles }] = await Promise.all(
    ['/src/data/recipes/recipes.js', '/src/data/wildlife/fish.js', '/src/data/wildlife/bugs.js', '/src/data/wildlife/birds.js', '/src/data/crops/crops.js', '/src/data/collectibles/collectibles.js'].map((p) => import(p)),
  )
  const wild = { fish: ['fish', fish], insects: ['bugs', bugs], birds: ['birds', birds] }
  const wiki = { recipes, crops, collectibles }
  const expectedHref = (id) => {
    const [segment, slug] = id.split('/')
    if (wiki[segment]) return wiki[segment].some((x) => x.slug === slug) ? '/' + segment + '/' + slug : null
    if (segment === 'any') return wild[slug] ? '/wildlife/' + wild[slug][0] : null
    if (!wild[segment]) return null
    return wild[segment][1].some((x) => x.slug === slug) ? '/wildlife/' + wild[segment][0] + '/' + slug : null
  }
`

// Kartu berurutan → kelompok per section (section di halaman selalu berurutan dan tidak berulang).
function bySection(cards) {
  const groups = []
  for (const card of cards) {
    if (groups.at(-1)?.[0].section === card.section) groups.at(-1).push(card)
    else groups.push([card])
  }
  return groups
}

async function runSuite(width, kind) {
  const tab = await openTab(width)
  const { send, evaluate } = tab
  const results = []
  const check = (name, ok, detail) => {
    results.push(ok)
    console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${name}${detail ? `  — ${detail}` : ''}`)
  }
  const go = async (route) => { await send('Page.navigate', { url: BASE_URL + route }); await sleep(1600) }
  const snapshot = () => evaluate(`({
    url: location.pathname + location.search,
    total: Number(document.querySelector('.list-status__count')?.textContent.match(/dari (\\d+)/)?.[1]),
    cards: [...document.querySelectorAll('.entry-grid .entry-card')].map(card => ({
      name: card.querySelector('.entry-card__name').textContent.trim(),
      // Nama section tempat kartu berada (teks judul tanpa emoji).
      section: [...(card.closest('.list-section')?.querySelector('.list-section__name')?.childNodes ?? [])].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim(),
      level: Number(card.querySelector('.card-badge--level')?.textContent.match(/\\d+/)?.[0]) || null,
      category: card.querySelector('.card-badge--category')?.textContent.replace(/^Kategori: /, '').replace(/^\\S+\\s/, '').trim() ?? null,
      // title berisi teks lengkap; teks yang tampil bisa berupa ringkasan seperti "Semua waktu"
      facts: [...card.querySelectorAll('.entry-card__facts li')].map(li => li.title),
    })),
    chips: [...document.querySelectorAll('.active-chip')].map(e => e.textContent.trim()),
    query: document.querySelector('.list-search input')?.value,
    sort: document.querySelector('.list-sort select')?.value,
    empty: !!document.querySelector('.list-empty'),
    scrollY: Math.round(scrollY),
  })`)
  // Mencentang opsi lewat checkbox (bagian uji logika; uji klik teks/angka ada di bagian 10).
  const toggleOption = (group, value) => evaluate(`(async () => {
    const toggle = document.querySelector('.list-filter-toggle')
    if (toggle.getAttribute('aria-expanded') !== 'true') { toggle.click(); await new Promise(r => setTimeout(r, 120)) }
    const button = [...document.querySelectorAll('.filter-dropdown__button')].find(b => b.textContent.startsWith(${JSON.stringify(group)} + ':'))
    if (button.getAttribute('aria-expanded') !== 'true') { button.click(); await new Promise(r => setTimeout(r, 120)) }
    const label = [...button.parentElement.querySelectorAll('.filter-check')].find(l => l.querySelector('.filter-check__label').textContent.trim().endsWith(${JSON.stringify(value)}))
    if (!label) return false
    label.querySelector('input').click()
    return true
  })()`)
  const optionValues = (group) => evaluate(`(async () => {
    const toggle = document.querySelector('.list-filter-toggle')
    if (toggle.getAttribute('aria-expanded') !== 'true') { toggle.click(); await new Promise(r => setTimeout(r, 120)) }
    const button = [...document.querySelectorAll('.filter-dropdown__button')].find(b => b.textContent.startsWith(${JSON.stringify(group)} + ':'))
    button.click(); await new Promise(r => setTimeout(r, 120))
    const values = [...button.parentElement.querySelectorAll('.filter-check')]
      .filter(l => Number(l.querySelector('.filter-check__count').textContent.replace(/\\D/g, '')) > 0)
      // Teks opsi tanpa emoji dekoratif (aria-hidden), sama dengan teks di chip filter aktif
      .map(l => { const label = l.querySelector('.filter-check__label').cloneNode(true); label.querySelectorAll('[aria-hidden]').forEach(e => e.remove()); return label.textContent.trim() })
    button.click()
    return values
  })()`)
  const press = async (key, code, vk, text) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: vk, ...(text ? { text } : {}) })
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk })
    await sleep(120)
  }
  const mouseClick = async (x, y) => {
    if (x == null) return // elemen sudah hilang (mis. dropdown tertutup); hasilnya dinilai oleh check
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 })
    await sleep(30)
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 })
    await sleep(250)
  }
  const centerOf = async (expr) => (await evaluate(`(() => { const el = ${expr}; if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })()`)) ?? {}

  // 1. Pencarian dengan debounce
  await go(kind.path)
  await evaluate(`document.querySelector('.list-search input').focus()`)
  for (const char of kind.search) { await send('Input.insertText', { text: char }); await sleep(60) }
  let s = await snapshot()
  check('URL belum berubah saat masih mengetik (debounce)', !s.url.includes('q='), s.url)
  await sleep(450)
  s = await snapshot()
  if (kind.recipe) {
    // Resep dicari lewat nama resep dan nama bahannya; hasil yang diharapkan dihitung dari data.
    const expected = await evaluate(`(async () => {
      const { recipes } = await import('/src/data/recipes/recipes.js')
      const { getItem } = await import('/src/data/items.js')
      const query = ${JSON.stringify(kind.search.toLowerCase())}
      const ids = (r) => r.ingredients.flatMap((g) => g.type === 'fixed' ? g.items.map((e) => e.item) : g.options)
      return recipes.filter((r) => [r.name, ...ids(r).map((id) => getItem(id)?.name ?? '')].some((t) => t.toLowerCase().includes(query))).map((r) => r.name)
    })()`)
    const names = s.cards.map((c) => c.name)
    check(
      `Cari "${kind.search}": nama resep dan nama bahan, tidak peka huruf besar/kecil`,
      s.url.includes(`q=${kind.search}`) && names.length > 1 && names.sort().join() === [...expected].sort().join() && names.some((n) => !/tiramisu/i.test(n)),
      names.join(', '),
    )
  } else {
    check(`Cari "${kind.search}" tidak peka huruf besar/kecil`, s.url.includes(`q=${kind.search}`) && s.cards.length > 0 && s.cards.every((c) => kind.searchMatch.test(c.name)), s.cards.map((c) => c.name).join(', '))
  }

  // 2. Pencarian tanpa hasil → tampilan kosong + reset
  await evaluate(`document.querySelector('.list-search input').select()`)
  await send('Input.insertText', { text: 'zzzz' }); await sleep(500)
  s = await snapshot()
  check('Cari "zzzz" → tampilan kosong', s.empty && s.cards.length === 0)
  await evaluate(`document.querySelector('.list-empty .btn').click()`); await sleep(400)
  s = await snapshot()
  check('Tombol reset di tampilan kosong', !s.empty && s.cards.length === s.total && s.query === '' && s.url === kind.path, s.url)

  // 3. Filter: ATAU dalam kelompok, DAN antar kelompok
  // Parameter yang harus tetap ada setelah chip kelompok ekstra dihapus (bagian 4).
  let keepParam
  if (kind.recipe || kind.filterByLevel) {
    // Resep & tanaman: Level (ATAU) dibaca dari badge level di kartu.
    const levels = (await optionValues('Level')).slice(0, 2)
    for (const value of levels) { await toggleOption('Level', value); await sleep(250) }
    s = await snapshot()
    check(`${levels.join(' ATAU ')}`, s.cards.length > 0 && s.cards.every((c) => levels.includes(`Level ${c.level}`)), `${s.cards.length} ${kind.noun}`)
    keepParam = 'level='
  } else {
    const locations = (await optionValues('Lokasi')).slice(0, 2)
    for (const value of locations) { await toggleOption('Lokasi', value); await sleep(250) }
    s = await snapshot()
    // title lokasi = "Lokasi: A, B, C" (serangga bisa punya beberapa lokasi)
    const cardLocations = (card) => card.facts[0].replace(/^Lokasi: /, '').split(', ')
    const inLocations = (card) => locations.some((loc) => cardLocations(card).includes(loc))
    check(`Lokasi ${locations.join(' ATAU ')}`, s.cards.length > 0 && s.cards.every(inLocations), `${s.cards.length} ${kind.noun}`)
    const countOr = s.cards.length
    const and = kind.andFilter
    if (and) {
      await toggleOption(and.group, and.value); await sleep(250)
      s = await snapshot()
      check(`… DAN ${and.value}`, s.cards.length <= countOr && s.cards.every((c) => inLocations(c) && c.facts[and.fact].includes(and.value)) && s.chips.some((c) => c.includes(and.value)), `${s.cards.length} ${kind.noun}`)
    }
    keepParam = and ? and.param : 'lokasi='
  }
  const extra = kind.extraGroup
  const extraValues = await optionValues(extra.label)
  await toggleOption(extra.label, extraValues[0]); await sleep(250)
  s = await snapshot()
  check(`… DAN ${extra.label} ${extraValues[0]} (chip tampil)`, s.chips.some((c) => c.includes(extraValues[0])), `${s.cards.length} ${kind.noun}`)
  await evaluate(`(() => { const sel = document.querySelector('.list-sort select'); sel.value = 'az'; sel.dispatchEvent(new Event('change', { bubbles: true })) })()`); await sleep(300)
  s = await snapshot()
  // Urutan berlaku di dalam tiap section (section tetap Base Game dulu, lalu event).
  const azOk = bySection(s.cards).every((group) => group.map((c) => c.name).join() === group.map((c) => c.name).sort((a, b) => a.localeCompare(b, 'en')).join())
  check('Urut A–Z tersimpan di URL (A–Z di dalam tiap section)', s.url.includes('urut=az') && azOk, s.url)

  // 4. Hapus satu chip
  await evaluate(`[...document.querySelectorAll('.active-chip')].find(c => c.textContent.includes(${JSON.stringify(extra.label)})).click()`); await sleep(300)
  s = await snapshot()
  check(`Hapus chip ${extra.label} (filter lain tetap)`, !s.url.includes(`${extra.param}=`) && s.url.includes(keepParam), s.url)

  // 5. Refresh dengan filter aktif
  const filteredUrl = s.url
  const filteredCount = s.cards.length
  await send('Page.reload'); await sleep(1800)
  s = await snapshot()
  check('Refresh mempertahankan filter & urutan', s.url === filteredUrl && s.cards.length === filteredCount && s.sort === 'az', s.url)

  // 6–7. Ke detail lalu kembali
  await evaluate('window.scrollTo(0, 400)'); await sleep(200)
  const scrollBefore = await evaluate('Math.round(scrollY)')
  await evaluate(`document.querySelector('.entry-grid .entry-card').click()`); await sleep(1200)
  const backHref = await evaluate(`document.querySelector('.entry-detail__footer a').getAttribute('href')`)
  check('Tombol "Kembali ke daftar" di detail membawa filter', backHref === filteredUrl, backHref)
  await evaluate('history.back()'); await sleep(1500)
  s = await snapshot()
  check('Back browser dari detail: filter tetap', s.url === filteredUrl && s.cards.length === filteredCount, s.url)
  check('Back browser dari detail: posisi scroll dipulihkan', Math.abs(s.scrollY - scrollBefore) < 30, `${scrollBefore} → ${s.scrollY}`)
  await evaluate(`document.querySelector('.entry-grid .entry-card').click()`); await sleep(1200)
  await evaluate(`document.querySelector('.entry-detail__footer a').click()`); await sleep(1200)
  s = await snapshot()
  check(`Klik "Kembali ke daftar ${kind.name}": filter tetap`, s.url === filteredUrl && s.cards.length === filteredCount, s.url)

  // 8. Reset semua
  await evaluate(`[...document.querySelectorAll('.text-button')].find(b => b.textContent.includes('Reset semua')).click()`); await sleep(400)
  s = await snapshot()
  check('Reset semua menghapus filter & pencarian, urutan tetap', s.cards.length === s.total && s.chips.length === 0 && s.url === `${kind.path}?urut=az`, s.url)

  // 9. Dropdown: klik di luar, keyboard
  const openState = () => evaluate(`({
    open: [...document.querySelectorAll('.filter-dropdown__button')].filter(b => b.getAttribute('aria-expanded') === 'true').map(b => b.textContent.split(':')[0]),
    focus: document.activeElement.closest('.filter-check')?.textContent.trim() || document.activeElement.textContent.trim().slice(0, 30),
    url: location.search,
  })`)
  await evaluate(`(async () => { const t = document.querySelector('.list-filter-toggle'); if (t.getAttribute('aria-expanded') !== 'true') t.click(); await new Promise(r => setTimeout(r, 100)); [...document.querySelectorAll('.filter-dropdown__button')].find(b => b.textContent.startsWith(${JSON.stringify(kind.firstDropdown + ':')})).click() })()`); await sleep(200)
  let d = await openState()
  check('Klik tombol dropdown membukanya', d.open.join() === kind.firstDropdown)
  await mouseClick(5, 5)
  d = await openState()
  check('Klik di luar menutup dropdown', d.open.length === 0)
  const kb = kind.keyboard
  await evaluate(`[...document.querySelectorAll('.filter-dropdown__button')].find(b => b.textContent.startsWith(${JSON.stringify(kb.group + ':')})).focus()`)
  await press('ArrowDown', 'ArrowDown', 40); await sleep(150)
  d = await openState()
  check('Panah bawah membuka & fokus ke opsi pertama', d.open.join() === kb.group && d.focus.includes(kb.first), d.focus)
  await press('ArrowDown', 'ArrowDown', 40)
  d = await openState()
  check('Panah bawah pindah ke opsi berikutnya', d.focus.includes(kb.second), d.focus)
  await press(' ', 'Space', 32, ' ')
  d = await openState()
  check('Spasi mencentang opsi', d.url.includes(kb.param) && d.open.join() === kb.group, d.url)
  await press('Escape', 'Escape', 27)
  d = await openState()
  check('Escape menutup & fokus kembali ke tombol', d.open.length === 0 && d.focus.startsWith(`${kb.group}:`), d.focus)
  await press('ArrowDown', 'ArrowDown', 40); await sleep(100)
  await press('End', 'End', 35)
  await press('Tab', 'Tab', 9)
  d = await openState()
  check('Tab keluar dari dropdown menutupnya', d.open.length === 0, `fokus: ${d.focus}`)
  const overflow = await evaluate(`(async () => { let worst = 0; for (const b of document.querySelectorAll('.filter-dropdown__button')) { b.click(); await new Promise(r => setTimeout(r, 120)); worst = Math.max(worst, document.documentElement.scrollWidth - innerWidth); b.click(); await new Promise(r => setTimeout(r, 60)) } return worst })()`)
  check('Tiap dropdown dibuka: halaman tidak melebar', overflow <= 0, `${overflow}px`)

  // 10. Regresi: klik teks label & angka dengan mouse sungguhan. Dropdown dibuka lewat klik mouse
  //     sehingga tombolnya terfokus — kondisi yang dulu membuat dropdown tertutup sebelum opsi tercentang.
  const openByMouse = async (group) => {
    await evaluate(`(async () => {
      const t = document.querySelector('.list-filter-toggle')
      if (t.getAttribute('aria-expanded') !== 'true') { t.click(); await new Promise(r => setTimeout(r, 120)) }
      const b = [...document.querySelectorAll('.filter-dropdown__button')].find(x => x.textContent.startsWith(${JSON.stringify(group)} + ':'))
      b.scrollIntoView({ block: 'start' }); window.scrollBy(0, -260)
    })()`)
    const p = await centerOf(`[...document.querySelectorAll('.filter-dropdown__button')].find(x => x.textContent.startsWith(${JSON.stringify(group)} + ':'))`)
    await mouseClick(p.x, p.y)
  }
  const part = (index, selector) => `document.querySelectorAll('.filter-dropdown__panel .filter-check')[${index}]?.querySelector('${selector}')`
  const panel = () => evaluate(`({ open: !!document.querySelector('.filter-dropdown__panel'), url: decodeURIComponent(location.search), checked: [...document.querySelectorAll('.filter-dropdown__panel input')].map(i => i.checked) })`)
  for (const group of kind.groups) {
    await go(kind.path)
    await openByMouse(group)
    const total = await evaluate(`document.querySelectorAll('.filter-dropdown__panel .filter-check').length`)
    let p = await centerOf(part(0, '.filter-check__label'))
    await mouseClick(p.x, p.y)
    let st = await panel()
    const labelOk = st.open && st.checked[0] === true
    const second = total > 1 ? 1 : 0
    p = await centerOf(part(second, '.filter-check__count'))
    await mouseClick(p.x, p.y)
    st = await panel()
    const countOk = st.open && (total > 1 ? st.checked[0] && st.checked[1] : st.checked[0] === false)
    p = await centerOf(part(0, '.filter-check__label'))
    await mouseClick(p.x, p.y)
    st = await panel()
    const againOk = st.open && st.checked[0] === (total <= 1)
    check(`${group}: klik teks label mencentang, dropdown tetap terbuka`, labelOk)
    check(`${group}: klik angka ${total > 1 ? 'mencentang opsi kedua (multi-pilih)' : 'menghapus centang'}`, countOk)
    check(`${group}: klik teks lagi ${total > 1 ? 'menghapus centang' : 'mencentang lagi'}`, againOk, st.url)
  }
  const rowHeight = await evaluate(`Math.min(...[...document.querySelectorAll('.filter-dropdown__panel .filter-check')].map(r => r.getBoundingClientRect().height))`)
  const cursor = await evaluate(`[getComputedStyle(document.querySelector('.filter-check')).cursor, getComputedStyle(document.querySelector('.filter-check__count')).cursor].join('/')`)
  check('Baris opsi minimal 44px & cursor pointer di seluruh baris', rowHeight >= 44 && cursor === 'pointer/pointer', `${rowHeight}px, ${cursor}`)
  await mouseClick(5, (await evaluate('innerHeight')) - 5)
  check('Klik di luar dropdown tetap menutupnya', !(await panel()).open)

  if (width < 600) {
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })
    await go(kind.path)
    await openByMouse('Kategori')
    const t = await centerOf(part(0, '.filter-check__label'))
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: t.x, y: t.y }] })
    await sleep(40)
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await sleep(400)
    const st = await panel()
    check('Tap sentuh pada teks label mencentang (mobile)', st.open && st.checked[0] === true, st.url)
    await send('Emulation.setTouchEmulationEnabled', { enabled: false })
  }

  // 11. Lokasi jamak (Bugs): urutan filter, "lokasi pertama +N" di kartu, filter lokasi, detail dengan beberapa zona.
  if (kind.multiLocation) {
    await go(kind.path)
    const groupsShown = await evaluate(`(async () => {
      document.querySelector('.list-filter-toggle').click(); await new Promise(r => setTimeout(r, 120))
      return [...document.querySelectorAll('.filter-dropdown__button')].map(b => b.textContent.split(':')[0].trim())
    })()`)
    check(`Filter ${kind.name}: ${kind.groups.join(', ')} (tanpa Shadow)`, groupsShown.join() === kind.groups.join(), groupsShown.join(', '))

    const readCards = () => evaluate(`[...document.querySelectorAll('.entry-grid .entry-card')].map(card => {
      const li = card.querySelector('.entry-card__facts li')
      const moreBox = li.querySelector('.entry-card__fact-more')?.getBoundingClientRect()
      const liBox = li.getBoundingClientRect()
      return {
        href: card.getAttribute('href'),
        locations: li.title.replace(/^Lokasi: /, '').split(', '),
        first: li.querySelector('.entry-card__fact-first')?.textContent ?? null,
        more: li.querySelector('.entry-card__fact-more [aria-hidden]')?.textContent ?? null,
        moreVisible: moreBox ? moreBox.width > 0 && moreBox.right <= liBox.right + 0.5 : null,
        height: li.getBoundingClientRect().height,
        text: li.querySelector('.entry-card__fact-text').textContent,
      }
    })`)
    let cards = await readCards()
    const multi = cards.filter((c) => c.locations.length > 1)
    const single = cards.filter((c) => c.locations.length === 1)
    check(
      'Kartu lokasi jamak: "lokasi pertama +N", "+N" utuh, daftar lengkap di title',
      multi.length > 0 && multi.every((c) => c.first === c.locations[0] && c.more === `+${c.locations.length - 1}` && c.moreVisible),
      `${multi.length} kartu, mis. ${multi[0] && `${multi[0].first} ${multi[0].more}`}`,
    )
    check('Kartu satu lokasi: tanpa "+N"', single.every((c) => c.more === null && c.text.endsWith(c.locations[0])), `${single.length} kartu`)
    check('Info lokasi tetap satu baris', new Set(cards.map((c) => Math.round(c.height))).size === 1, [...new Set(cards.map((c) => Math.round(c.height)))].join('/'))

    // Lokasi terakhir sebuah kartu jamak (bukan yang tampil di kartu): kartu itu tetap harus ikut tersaring.
    const target = multi[0]
    const hidden = target.locations.at(-1)
    const expected = cards.filter((c) => c.locations.includes(hidden)).map((c) => c.href).sort()
    const optionCount = await evaluate(`(async () => {
      const button = [...document.querySelectorAll('.filter-dropdown__button')].find(b => b.textContent.startsWith('Lokasi:'))
      button.click(); await new Promise(r => setTimeout(r, 120))
      const row = [...button.parentElement.querySelectorAll('.filter-check')].find(l => l.querySelector('.filter-check__label').textContent.trim() === ${JSON.stringify(hidden)})
      const count = Number(row?.querySelector('.filter-check__count').textContent.replace(/\\D/g, ''))
      button.click()
      return count
    })()`)
    check(`Angka opsi Lokasi "${hidden}" = jumlah entri yang punya lokasi itu`, optionCount === expected.length, `${optionCount} vs ${expected.length}`)
    await toggleOption('Lokasi', hidden); await sleep(300)
    cards = await readCards()
    const got = cards.map((c) => c.href).sort()
    check(
      `Filter Lokasi "${hidden}" menyertakan ${target.href.split('/').pop()} (lokasi pertamanya ${target.locations[0]})`,
      got.join() === expected.join() && got.includes(target.href),
      `${got.length} ${kind.noun}`,
    )
    const second = cards.find((c) => c.locations.length > 1 && c.locations.some((l) => l !== hidden))?.locations.find((l) => l !== hidden)
    const onlyHidden = cards.length
    if (second) {
      await go(kind.path)
      const everyCard = await readCards()
      const expectedOr = everyCard.filter((c) => c.locations.includes(hidden) || c.locations.includes(second)).map((c) => c.href).sort()
      await toggleOption('Lokasi', hidden); await sleep(250)
      await toggleOption('Lokasi', second); await sleep(300)
      const gotOr = (await readCards()).map((c) => c.href).sort()
      check(`Filter Lokasi "${hidden}" ATAU "${second}"`, gotOr.join() === expectedOr.join() && gotOr.length >= onlyHidden, `${gotOr.length} ${kind.noun}`)
    }

    // Detail: semua lokasi tertulis, semua zona disorot dan masuk potongan peta.
    // Hewan: lokasi ditandai pin titik tempat makan (koordinat dari data), bukan zona.
    await go(target.href)
    if (kind.animal) {
      const pinDetail = await evaluate(`(async () => {
        const { animals } = await import('/src/data/wildlife/animals.js')
        const entry = animals.find((a) => location.pathname.endsWith('/' + a.slug))
        const svg = document.querySelector('.location-map__svg')
        const [vx, vy, vw, vh] = (svg?.getAttribute('viewBox') ?? '0 0 0 0').split(' ').map(Number)
        const pin = document.querySelector('.location-map__pin')
        const [px, py] = (pin?.getAttribute('transform') ?? '').match(/[-\\d.]+/g)?.map(Number) ?? []
        return {
          names: [...document.querySelectorAll('.location-info__list li')].map(li => li.textContent),
          zones: document.querySelectorAll('.location-map__zone').length,
          pinMatches: Boolean(pin && entry?.feedingSpot && px === entry.feedingSpot.x && py === entry.feedingSpot.y),
          pinInside: px >= vx && px <= vx + vw && py >= vy && py <= vy + vh,
          label: svg?.getAttribute('aria-label') ?? '',
          caption: document.querySelector('.location-map__caption')?.textContent.trim() ?? '',
          shadow: [...document.querySelectorAll('.spec__label')].some(e => e.textContent.includes('Shadow')),
        }
      })()`)
      check('Detail lokasi jamak: semua lokasi tertulis', pinDetail.names.join() === target.locations.join(), pinDetail.names.join(', '))
      check(
        'Detail hewan: pin titik tempat makan sesuai data, di dalam potongan peta, tanpa zona',
        pinDetail.pinMatches && pinDetail.pinInside && pinDetail.zones === 0 && /Titik tempat makan/.test(pinDetail.caption) && /pin/.test(pinDetail.label),
        `${pinDetail.caption} — ${pinDetail.label}`,
      )
      check(`Detail ${kind.name} tanpa Shadow`, !pinDetail.shadow)
    } else {
    const detail = await evaluate(`(() => {
      const svg = document.querySelector('.location-map__svg')
      const [vx, vy, vw, vh] = (svg?.getAttribute('viewBox') ?? '0 0 0 0').split(' ').map(Number)
      const polygons = [...document.querySelectorAll('.location-map__zone')]
      const inside = polygons.every(p => p.getAttribute('points').split(' ').every(pair => {
        const [x, y] = pair.split(',').map(Number)
        return x >= vx - 0.5 && x <= vx + vw + 0.5 && y >= vy - 0.5 && y <= vy + vh + 0.5
      }))
      return {
        names: [...document.querySelectorAll('.location-info__list li')].map(li => li.textContent),
        polygons: polygons.length,
        inside,
        label: svg?.getAttribute('aria-label') ?? '',
        shadow: [...document.querySelectorAll('.spec__label')].some(e => e.textContent.includes('Shadow')),
        title: document.title,
      }
    })()`)
    check('Detail lokasi jamak: semua lokasi tertulis', detail.names.join() === target.locations.join(), detail.names.join(', '))
    check('Detail lokasi jamak: zona disorot & semuanya masuk potongan peta', detail.polygons > 0 && detail.inside && detail.names.some((n) => detail.label.includes(n)), `${detail.polygons} poligon — ${detail.label}`)
    check(`Detail ${kind.name} tanpa Shadow`, !detail.shadow)
    }
  }

  // 12. Warna badge level: diambil dari token --level-N sesuai nomor level, di light & dark.
  //     Kategori tanpa level (hewan): kartu tanpa badge level, filter & urutan level tidak ada.
  await go(kind.path)
  if (kind.noLevel) {
    const noLevel = await evaluate(`({
      badges: document.querySelectorAll('.entry-grid .card-badge--level').length,
      categoryBadges: document.querySelectorAll('.entry-grid .card-badge--category').length,
      cards: document.querySelectorAll('.entry-grid .entry-card').length,
      sorts: [...document.querySelectorAll('.list-sort option')].map(o => o.value),
      facts: [...document.querySelectorAll('.entry-grid .entry-card')].map(c => c.querySelectorAll('.entry-card__facts li').length),
    })`)
    check(`Kartu ${kind.name}: badge kategori saja, tanpa badge level`, noLevel.badges === 0 && noLevel.categoryBadges === noLevel.cards && noLevel.cards > 0, `${noLevel.cards} kartu`)
    check(`Kartu ${kind.name}: ${kind.cardFacts ?? 'info lokasi & cuaca favorit saja (tanpa waktu)'}`, noLevel.facts.every((n) => n === 2))
    check(`Urutan ${kind.name}: default & A–Z saja`, noLevel.sorts.join() === 'default,az', noLevel.sorts.join(', '))
    await send('Page.navigate', { url: `${BASE_URL}${kind.path}?urut=level` }); await sleep(1600)
    const sortAfter = await evaluate(`document.querySelector('.list-sort select').value`)
    check('Parameter urut=level di URL diabaikan (kembali ke default)', sortAfter === 'default', sortAfter)
  } else {
  const readBadges = () => evaluate(`(() => {
    const root = getComputedStyle(document.documentElement)
    // Nilai token diubah ke format warna terhitung lewat elemen bantu, supaya bisa dibandingkan.
    const probe = document.createElement('span')
    document.body.append(probe)
    const resolve = (name) => { probe.style.color = root.getPropertyValue(name).trim(); return getComputedStyle(probe).color }
    const badges = [...document.querySelectorAll('.entry-grid .card-badge--level')].map(badge => {
      const level = Number(badge.textContent.match(/\\d+/)[0])
      const style = getComputedStyle(badge)
      return { level, bg: style.backgroundColor, ink: style.color, tokenBg: resolve('--level-' + level), tokenInk: resolve('--level-' + level + '-ink') }
    })
    probe.remove()
    return { theme: document.documentElement.dataset.theme, badges }
  })()`)
  const toggleTheme = async () => { await evaluate(`document.querySelector('.icon-button[aria-label^="Ganti ke mode"]').click()`); await sleep(300) }
  const themes = [await readBadges()]
  await toggleTheme()
  themes.push(await readBadges())
  await toggleTheme()
  await evaluate(`localStorage.removeItem('hdx-theme')`)
  check('Tombol tema berganti light ↔ dark untuk uji warna', themes.map((t) => t.theme).sort().join() === 'dark,light', themes.map((t) => t.theme).join(' → '))
  for (const { theme, badges } of themes) {
    const byLevel = new Map()
    for (const badge of badges) byLevel.set(badge.level, [...(byLevel.get(badge.level) ?? []), badge])
    const levels = [...byLevel.keys()].sort((a, b) => a - b)
    const colorOf = (level) => byLevel.get(level)[0]
    check(
      `Badge level (${theme}): warna dari token --level-N sesuai nomor level`,
      badges.length > 0 && badges.every((b) => b.bg === b.tokenBg && b.ink === b.tokenInk),
      `${badges.length} badge, level ${levels[0]}–${levels.at(-1)}`,
    )
    check(
      `Badge level (${theme}): satu warna per level, tiap level berbeda`,
      levels.every((level) => byLevel.get(level).every((b) => b.bg === colorOf(level).bg && b.ink === colorOf(level).ink)) &&
        new Set(levels.map((level) => colorOf(level).bg)).size === levels.length,
      `${levels.length} level`,
    )
    const worst = Math.min(...levels.map((level) => contrastRatio(colorOf(level).bg, colorOf(level).ink)))
    check(`Badge level (${theme}): kontras teks lolos AA (≥ 4,5:1)`, worst >= 4.5, `terendah ${worst.toFixed(2)}:1`)
    const neighbours = levels.slice(1).filter((level) => byLevel.has(level - 1))
    const closest = Math.min(...neighbours.map((level) => colorDistance(colorOf(level - 1).bg, colorOf(level).bg)))
    check(`Badge level (${theme}): level bersebelahan bisa dibedakan (ΔE OKLab ≥ ${MIN_LEVEL_DISTANCE})`, neighbours.length > 0 && closest >= MIN_LEVEL_DISTANCE, `${neighbours.length} pasang, terdekat ${closest.toFixed(3)}`)
  }
  // Level tanpa token (mis. di atas 14) memakai warna cadangan; dicek lewat helper yang sama dengan kartu.
  const fallback = await evaluate(`(async () => {
    const { levelToneStyle } = await import('/src/components/wildlife/levelTone.js')
    const sample = document.querySelector('.entry-grid .card-badge--level')
    const read = (level) => {
      const badge = sample.cloneNode(true)
      for (const [name, value] of Object.entries(levelToneStyle(level))) badge.style.setProperty(name, value)
      sample.parentElement.append(badge)
      const style = getComputedStyle(badge)
      const colors = style.backgroundColor + ' / ' + style.color
      badge.remove()
      return colors
    }
    const probe = document.createElement('span')
    document.body.append(probe)
    const root = getComputedStyle(document.documentElement)
    const resolve = (name) => { probe.style.color = root.getPropertyValue(name).trim(); return getComputedStyle(probe).color }
    const expected = resolve('--level-fallback') + ' / ' + resolve('--level-fallback-ink')
    probe.remove()
    return { expected, l14: read(14), l15: read(15), l99: read(99) }
  })()`)
  check(
    'Level di atas 14 memakai warna cadangan --level-fallback',
    fallback.l15 === fallback.expected && fallback.l99 === fallback.expected && fallback.l14 !== fallback.expected,
    `Lv 15: ${fallback.l15}`,
  )
  }

  // 13. Halaman detail. Wildlife berharga: judul deretan angka per kualitas (burung: harga jual Info Card).
  //     Hewan: tanpa harga/level/jadwal/waktu server, cuaca favorit & makanan favorit. Resep: lihat bagian 14.
  await evaluate(`document.querySelector('.entry-grid .entry-card').click()`); await sleep(1200)
  if (kind.animal) {
    const animal = await evaluate(`(() => {
      const food = [...document.querySelectorAll('.panel--food .item-tile')].map(tile => {
        const img = tile.querySelector('img')
        return {
          name: tile.querySelector('.item-tile__name')?.textContent,
          type: tile.querySelector('.item-tile__type')?.textContent,
          imgOk: !img || (img.loading === 'lazy' && Number(img.getAttribute('width')) > 0 && Number(img.getAttribute('height')) > 0 && img.naturalWidth > 0),
          href: tile.querySelector('a')?.getAttribute('href') ?? null,
        }
      })
      return {
        panels: [...document.querySelectorAll('.entry-detail__grid > section')].map(p => p.className.match(/panel--(\\w+)/)[1]),
        market: document.querySelectorAll('.market, .market-value').length,
        serverTime: document.querySelectorAll('.server-time').length,
        spec: document.querySelectorAll('.spec').length,
        weatherTitle: document.querySelector('#entry-weather')?.textContent.trim(),
        weather: [...document.querySelectorAll('.panel--weather .availability__chip')].map(c => c.classList.contains('is-on')),
        food,
      }
    })()`)
    check('Detail hewan: 4 kotak (identitas & gambar, lokasi, cuaca favorit, makanan favorit)', animal.panels.join() === 'ident,location,weather,food', animal.panels.join(', '))
    check('Detail hewan: tanpa harga, level, jadwal, dan waktu server', animal.market === 0 && animal.serverTime === 0 && animal.spec === 0)
    check('Detail hewan: cuaca favorit dengan 3 cuaca, minimal satu favorit', animal.weatherTitle === 'Cuaca favorit' && animal.weather.length === 3 && animal.weather.some(Boolean))
    const TYPES = ['Crop', 'Collectible', 'Ingredient', 'Recipe', 'Fish']
    check(
      'Detail hewan: makanan favorit dengan gambar (lazy, width/height), nama, dan jenis berbahasa Inggris',
      animal.food.length > 0 && animal.food.every((item) => item.name && TYPES.includes(item.type) && item.imgOk),
      animal.food.map((item) => `${item.name} (${item.type})`).join(', '),
    )

    // Tautan makanan favorit semua hewan: resep, ikan, tanaman, collectible ke halamannya; ingredient tanpa tautan.
    const foodLinks = await evaluate(`(async () => {
      ${EXPECTED_ITEM_HREF}
      const { animals } = await import('/src/data/wildlife/animals.js')
      return animals.map((a) => ({ slug: a.slug, expected: a.favoriteFood.map(expectedHref) }))
    })()`)
    let foodOk = foodLinks.some((a) => a.expected.some((href) => href?.startsWith('/wildlife/fish/'))) &&
      foodLinks.some((a) => a.expected.some((href) => href?.startsWith('/crops/'))) && foodLinks.some((a) => a.expected.some((href) => href?.startsWith('/collectibles/')))
    for (const { slug, expected } of foodLinks) {
      await go(`/wildlife/animals/${slug}`)
      const hrefs = await evaluate(`[...document.querySelectorAll('.panel--food .item-tile')].map(t => t.querySelector('a')?.getAttribute('href') ?? null)`)
      if (hrefs.join() !== expected.join()) { foodOk = false; console.log(`       ${slug}: ${hrefs.join()} ≠ ${expected.join()}`) }
    }
    check(`Tautan makanan favorit di ${foodLinks.length} hewan: ikan → /wildlife/fish/…, resep → /recipes/…, Crop → /crops/…, Collectible → /collectibles/…`, foodOk)
    await go('/wildlife/animals/capybara')
    const tomatoHref = await evaluate(`[...document.querySelectorAll('.panel--food .item-tile')].find((t) => t.querySelector('.item-tile__name').textContent === 'Tomato')?.querySelector('a')?.getAttribute('href') ?? null`)
    await evaluate(`[...document.querySelectorAll('.panel--food .item-tile a')].find(a => a.textContent.includes('Tomato'))?.click()`); await sleep(1200)
    const tomatoPage = await evaluate(`({ path: location.pathname, title: document.querySelector('h1')?.textContent.trim() })`)
    check('Makanan favorit Capybara: Tomato tertaut ke /crops/tomato dan membuka detail tanamannya', tomatoHref === '/crops/tomato' && tomatoPage.path === '/crops/tomato' && tomatoPage.title === 'Tomato', `${tomatoHref} → ${tomatoPage.path}`)
    await go('/wildlife/animals/fox')
    await evaluate(`[...document.querySelectorAll('.panel--food .item-tile a')].find(a => a.textContent.includes('Largemouth Bass')).click()`); await sleep(1200)
    const fishPage = await evaluate(`({ path: location.pathname, title: document.querySelector('h1')?.textContent.trim() })`)
    check('Klik makanan ikan (Fox → Largemouth Bass) membuka detail ikannya', fishPage.path === '/wildlife/fish/largemouth-bass' && fishPage.title === 'Largemouth Bass', `${fishPage.path} ${fishPage.title}`)
  } else if (!kind.recipe && kind.priceLabel) {
    const priceTitle = await evaluate(`document.querySelector('.market__title')?.childNodes[1]?.textContent.trim()`)
    check(`Detail ${kind.name}: judul angka per kualitas "${kind.priceLabel}"`, priceTitle === kind.priceLabel, priceTitle)
  }

  // 14. Detail resep: badge level, harga jual & energi sesuai data, bahan tetap (jumlah) & pilihan, tautan bahan.
  if (kind.recipe) {
    const readRecipe = () => evaluate(`(async () => {
      const { recipes } = await import('/src/data/recipes/recipes.js')
      const slug = location.pathname.split('/').pop()
      const recipe = recipes.find((r) => r.slug === slug)
      const rows = (selector) => [...document.querySelectorAll(selector + ' .market-value__row')].map(r => r.querySelector('.market-value__amount').childNodes[0].textContent.trim())
      const root = getComputedStyle(document.documentElement)
      const probe = document.createElement('span'); document.body.append(probe)
      const resolve = (name) => { probe.style.color = root.getPropertyValue(name).trim(); return getComputedStyle(probe).color }
      const badge = document.querySelector('.stage-level')
      const tone = badge && recipe && { bg: getComputedStyle(badge).backgroundColor, token: resolve('--level-' + recipe.level) }
      probe.remove()
      return {
        slug,
        title: document.querySelector('h1')?.textContent.trim(),
        recipe,
        panels: [...document.querySelectorAll('.entry-detail__grid > section')].map(p => p.className.match(/panel--(\\w+)/)[1]),
        badge: badge?.querySelector('[aria-hidden]')?.textContent.trim(),
        tone,
        priceTitle: document.querySelector('.market__title')?.childNodes[1]?.textContent.trim(),
        market: rows('.panel--hero'),
        energy: rows('.panel--energy'),
        energyTitle: document.querySelector('#entry-energy')?.childNodes[1]?.textContent.trim(),
        serverTime: document.querySelectorAll('.server-time').length,
        mastery: /Mastery/i.test(document.querySelector('main').textContent),
        groups: [...document.querySelectorAll('.ingredient-group')].map(g => ({
          title: g.querySelector('.ingredient-group__title').textContent,
          tiles: [...g.querySelectorAll('.item-tile')].map(t => ({
            name: t.querySelector('.item-tile__name').textContent,
            qty: t.querySelector('.item-tile__qty')?.textContent.trim() ?? null,
            href: t.querySelector('a')?.getAttribute('href') ?? null,
            imgOk: !t.querySelector('img') || (t.querySelector('img').loading === 'lazy' && t.querySelector('img').naturalWidth > 0),
          })),
        })),
      }
    })()`)
    const fmt = (value) => new Intl.NumberFormat('id-ID').format(value)
    const stars = (values, format) => (values ?? [null, null, null, null, null]).map((value) => (value == null ? '—' : format(value)))

    await go('/recipes/afternoon-tea')
    let r = await readRecipe()
    check('Detail resep: 4 kotak (identitas, gambar & harga, energi, bahan), tanpa waktu server & Cooking Mastery', r.panels.join() === 'info,hero,energy,ingredients' && r.serverTime === 0 && !r.mastery, r.panels.join(', '))
    check('Detail resep: badge level dengan warna token --level-N', r.badge === `Lv. ${r.recipe.level}` && r.tone.bg === r.tone.token, `${r.badge} ${r.tone.bg}`)
    check('Detail resep: harga jual per bintang sesuai data', r.priceTitle === kind.priceLabel && r.market.join() === stars(r.recipe.marketValue, fmt).join(), r.market.join(' / '))
    check('Detail resep: energi per bintang sesuai data ("+N"), tanpa buff yang dikarang', r.energy.join() === stars(r.recipe.energy, (v) => `+${fmt(v)}`).join() && r.energyTitle === 'Energi', r.energy.join(' / '))
    const [fixed, choose] = r.groups
    check(
      'Detail resep: bahan tetap dengan jumlah & kelompok "Pilih N" sesuai data',
      fixed?.title === 'Bahan tetap' && fixed.tiles.every((t) => /^x\d+$/.test(t.qty ?? '')) &&
        choose?.title === `Pilih ${r.recipe.ingredients[1].count} dari bahan berikut` && choose.tiles.length === r.recipe.ingredients[1].options.length && choose.tiles.every((t) => t.qty === null),
      `${fixed?.tiles.map((t) => `${t.name} ${t.qty}`).join(', ')} | ${choose?.title}: ${choose?.tiles.length}`,
    )
    check('Detail resep: gambar bahan lazy & termuat', r.groups.every((g) => g.tiles.every((t) => t.imgOk)))
    const tiramisu = fixed?.tiles.find((t) => t.name === 'Tiramisu')
    const apple = choose?.tiles.find((t) => t.name === 'Apple')
    check(
      'Bahan berupa resep (Tiramisu) tertaut ke halaman resepnya; Crop/Collectible tertaut ke detailnya (Apple → /collectibles/apple)',
      tiramisu?.href === '/recipes/tiramisu' && apple?.href === '/collectibles/apple' && choose.tiles.every((t) => /^\/(crops|collectibles)\/[a-z0-9-]+$/.test(t.href ?? '')),
      `${tiramisu?.href}, ${apple?.href}`,
    )
    await evaluate(`[...document.querySelectorAll('.item-tile a')].find(a => a.querySelector('.item-tile__name').textContent === 'Apple').click()`); await sleep(1200)
    const applePage = await evaluate(`({ path: location.pathname, title: document.querySelector('h1')?.textContent.trim() })`)
    check('Klik bahan Apple di Afternoon Tea membuka /collectibles/apple', applePage.path === '/collectibles/apple' && applePage.title === 'Apple', applePage.path)
    await go('/recipes/afternoon-tea')
    await evaluate(`[...document.querySelectorAll('.item-tile a')].find(a => a.textContent.includes('Tiramisu')).click()`); await sleep(1200)
    r = await readRecipe()
    check('Klik bahan Tiramisu membuka halaman resep Tiramisu', r.slug === 'tiramisu' && r.title === 'Tiramisu', r.title)

    // Semua resep yang punya bahan bertautan (resep lain, ikan, "Any Fish"): tautannya benar; bahan lain tanpa tautan.
    const linked = await evaluate(`(async () => {
      const ids = (r) => r.ingredients.flatMap((g) => g.type === 'fixed' ? g.items.map((e) => e.item) : g.options)
      ${EXPECTED_ITEM_HREF}
      return recipes.filter((r) => ids(r).some(expectedHref)).map((r) => ({ slug: r.slug, expected: ids(r).map(expectedHref) }))
    })()`)
    const targets = linked.flatMap((r) => r.expected)
    let linkOk = targets.some((href) => href?.startsWith('/recipes/')) && targets.some((href) => href?.startsWith('/wildlife/fish/')) && targets.includes('/wildlife/fish') &&
      targets.some((href) => href?.startsWith('/crops/')) && targets.some((href) => href?.startsWith('/collectibles/')) && targets.includes(null)
    for (const { slug, expected } of linked) {
      await go(`/recipes/${slug}`)
      const hrefs = (await readRecipe()).groups.flatMap((g) => g.tiles.map((t) => t.href))
      if (hrefs.join() !== expected.join()) { linkOk = false; console.log(`       ${slug}: ${hrefs.join()} ≠ ${expected.join()}`) }
    }
    check(`Tautan bahan di ${linked.length} resep: resep → /recipes/…, ikan → /wildlife/fish/…, "Any Fish" → /wildlife/fish, Crop → /crops/…, Collectible → /collectibles/…, Ingredient tanpa tautan`, linkOk)

    // Contoh konkret: ikan di bahan tetap, "Any Fish", dan ikan event.
    await go('/recipes/deluxe-seafood-platter')
    r = await readRecipe()
    const seaBass = r.groups.flatMap((g) => g.tiles).find((t) => t.name === 'Sea Bass')
    check('Bahan ikan (Sea Bass di Deluxe Seafood Platter) tertaut ke detail ikannya', seaBass?.href === '/wildlife/fish/sea-bass', seaBass?.href)
    await evaluate(`[...document.querySelectorAll('.item-tile a')].find(a => a.textContent.includes('Sea Bass')).click()`); await sleep(1200)
    let page = await evaluate(`({ path: location.pathname, title: document.querySelector('h1')?.textContent.trim() })`)
    check('Klik bahan Sea Bass membuka halaman detail Sea Bass', page.path === '/wildlife/fish/sea-bass' && page.title === 'Sea Bass', `${page.path} ${page.title}`)
    await go('/recipes/fish-and-chips')
    r = await readRecipe()
    const anyFish = r.groups.flatMap((g) => g.tiles).find((t) => t.name === 'Any Fish')
    check('Bahan "Any Fish" tertaut ke daftar /wildlife/fish', anyFish?.href === '/wildlife/fish', anyFish?.href)
    await evaluate(`[...document.querySelectorAll('.item-tile a')].find(a => a.textContent.includes('Any Fish')).click()`); await sleep(1200)
    page = await evaluate(`({ path: location.pathname, title: document.querySelector('h1')?.textContent.trim() })`)
    check('Klik "Any Fish" membuka halaman daftar Fish', page.path === '/wildlife/fish' && page.title === 'Fish', `${page.path} ${page.title}`)
    // Ikan event (Frostspore King Crab, section Winter frost season) kini punya halaman, jadi tertaut otomatis.
    await go('/recipes/seafood-risotto')
    r = await readRecipe()
    const frostspore = r.groups.flatMap((g) => g.tiles).find((t) => t.name === 'Frostspore King Crab')
    await evaluate(`[...document.querySelectorAll('.item-tile a')].find(a => a.textContent.includes('Frostspore King Crab'))?.click()`); await sleep(1200)
    page = await evaluate(`({ path: location.pathname, title: document.querySelector('h1')?.textContent.trim() })`)
    check(
      'Ikan event Frostspore King Crab (bahan Seafood Risotto) tertaut ke /wildlife/fish/frostspore-king-crab dan membuka detailnya',
      frostspore?.href === '/wildlife/fish/frostspore-king-crab' && page.path === '/wildlife/fish/frostspore-king-crab' && page.title === 'Frostspore King Crab',
      `${frostspore?.href} → ${page.path}`,
    )

    // Deskripsi Mandarin Milkshake disembunyikan (salah salin di sumber); deskripsi terjemahan Spanyol ditandai 'es'.
    await go('/recipes/mandarin-milkshake')
    const mandarin = await evaluate(`(async () => {
      const { getRecipeBySlug } = await import('/src/data/recipes/recipes.js')
      const text = document.querySelector('.panel--info .entry-detail__description')
      return { data: getRecipeBySlug('mandarin-milkshake').description, missing: text?.classList.contains('is-missing'), text: text?.textContent.trim() }
    })()`)
    check('Mandarin Milkshake: deskripsi null → "Deskripsi belum tersedia."', mandarin.data === null && mandarin.missing && mandarin.text === 'Deskripsi belum tersedia.', mandarin.text)
    await go('/recipes/violet-roll-cake')
    const spanish = await evaluate(`(async () => {
      const { recipes, getRecipeBySlug } = await import('/src/data/recipes/recipes.js')
      const text = document.querySelector('.panel--info .entry-detail__description')
      return { marked: recipes.filter((x) => x.descriptionSourceLang === 'es').map((x) => x.slug).join(), shown: text?.textContent.trim() === getRecipeBySlug('violet-roll-cake').description && !text.classList.contains('is-missing') }
    })()`)
    check('Deskripsi terjemahan dari Spanyol ditandai descriptionSourceLang "es" dan tampil seperti biasa', spanish.marked === 'violet-roll-cake,yellow-roll-cake' && spanish.shown, spanish.marked)

    await go('/recipes/milkshake')
    r = await readRecipe()
    const note = await evaluate(`!!document.querySelector('.panel--energy .panel__note')`)
    check('Energi "---" di sumber tampil "—" dengan keterangan', r.recipe.energy === null && r.energy.every((v) => v === '—') && note, r.energy.join(' / '))
    await go('/recipes/bizzare-drink')
    r = await readRecipe()
    check('Resep tanpa bahan di sumber (Bizzare Drink): nama apa adanya & keterangan bahan', r.title === 'Bizzare Drink' && r.groups.length === 0 && r.market.slice(1).every((v) => v === '—'), r.market.join(' / '))
    await go('/recipes/tidak-ada')
    const notFound = await evaluate(`document.querySelector('h1')?.textContent.trim()`)
    check('Slug resep tidak dikenal → halaman tidak ditemukan', notFound === 'Resep tidak ditemukan', notFound)
  }

  // 15. Kartu daftar: semua kotak gambar persegi & sama besar, gambar utuh (object-fit: contain), termasuk entri
  //     yang gambarnya paling tinggi dan paling lebar (menurut imageSize di data).
  const kindSlug = kind.path.split('/').pop()
  const [dataModule, dataExport] = DATA_MODULES[kindSlug]
  await go(kind.path)
  const media = await evaluate(`(async () => {
    const entries = (await import(${JSON.stringify(dataModule)}))[${JSON.stringify(dataExport)}]
    const ratio = (e) => (e.imageSize ? e.imageSize[1] / e.imageSize[0] : 1)
    const sorted = [...entries].sort((a, b) => ratio(b) - ratio(a))
    const boxes = [...document.querySelectorAll('.entry-grid .entry-card')].map((card) => {
      const img = card.querySelector('.entry-card__image')
      const r = img.getBoundingClientRect()
      const m = card.querySelector('.entry-card__media').getBoundingClientRect()
      return { href: card.getAttribute('href'), w: r.width, h: r.height, mediaH: m.height, fit: getComputedStyle(img).objectFit }
    })
    const pick = (e) => ({ name: e.name, size: (e.imageSize ?? [400, 400]).join('×'), box: boxes.find((b) => b.href.endsWith('/' + e.slug)) })
    const spread = (key) => Math.max(...boxes.map((b) => b[key])) - Math.min(...boxes.map((b) => b[key]))
    return {
      cards: boxes.length, entries: entries.length,
      nonSquareData: entries.filter((e) => ratio(e) !== 1).length,
      nonSquareBoxes: boxes.filter((b) => Math.abs(b.w - b.h) > 1).length,
      spread: Math.max(spread('w'), spread('h'), spread('mediaH')),
      fits: [...new Set(boxes.map((b) => b.fit))].join(),
      tallest: pick(sorted[0]), widest: pick(sorted.at(-1)),
    }
  })()`)
  const extremesOk = [media.tallest, media.widest].every((e) => e.box && Math.abs(e.box.w - e.box.h) <= 1)
  check(
    `Kartu ${kind.name}: kotak gambar persegi & seragam (contain), termasuk ${media.tallest.name} ${media.tallest.size} dan ${media.widest.name} ${media.widest.size}`,
    media.cards === media.entries && media.nonSquareBoxes === 0 && media.spread <= 1 && media.fits === 'contain' && extremesOk,
    `${media.nonSquareData} gambar tidak persegi di data, selisih ukuran kotak ${media.spread.toFixed(1)}px`,
  )

  // 16. Kotak pertama detail: Bugs & Birds (tanpa Shadow) → badge level berwarna di pojok gambar, dua bagian seimbang
  //     (gambar | harga jual), tanpa kolom Level; ikan tetap Level & Shadow; gambar tinggi tidak mengubah panggung.
  if (!kind.recipe && !kind.animal && !kind.goods) {
    const readHero = () => evaluate(`(async () => {
      const entries = (await import(${JSON.stringify(dataModule)}))[${JSON.stringify(dataExport)}]
      const entry = entries.find((e) => e.slug === location.pathname.split('/').pop())
      const layout = document.querySelector('.panel--hero .hero-layout')
      const stage = layout.querySelector('.entry-stage').getBoundingClientRect()
      const market = layout.querySelector('.market').getBoundingClientRect()
      const img = layout.querySelector('.entry-stage__image').getBoundingClientRect()
      const badge = layout.querySelector('.stage-level')
      const root = getComputedStyle(document.documentElement)
      const probe = document.createElement('span'); document.body.append(probe)
      probe.style.color = root.getPropertyValue('--level-' + entry.level).trim()
      const token = getComputedStyle(probe).color
      probe.remove()
      const b = badge?.getBoundingClientRect()
      return {
        level: entry.level,
        image: entry.image,
        imageSize: entry.imageSize ?? [400, 400],
        split: layout.classList.contains('hero-layout--split'),
        specs: [...document.querySelectorAll('.panel--hero .spec__label')].map((e) => e.textContent.trim()),
        badge: badge?.querySelector('[aria-hidden]')?.textContent.trim() ?? null,
        badgeBg: badge ? getComputedStyle(badge).backgroundColor : null,
        token,
        badgeInCorner: !!b && b.left - stage.left <= 16 && b.top - stage.top <= 16,
        wide: layout.getBoundingClientRect().width >= 520,
        stage: { w: stage.width, h: stage.height, top: stage.top, left: stage.left },
        market: { w: market.width, h: market.height, top: market.top },
        imgInside: img.left >= stage.left - 0.5 && img.right <= stage.right + 0.5 && img.top >= stage.top - 0.5 && img.bottom <= stage.bottom + 0.5,
      }
    })()`)
    if (kind.extraGroup.label === 'Shadow') {
      await go(`${kind.path}/sea-bass`)
      const hero = await readHero()
      check('Detail ikan tetap tiga kolom: Syarat level & Shadow, tanpa badge level di gambar', !hero.split && hero.specs.join() === 'Syarat level,Shadow' && hero.badge === null, hero.specs.join(', '))
    } else {
      const heroes = []
      for (const entry of [media.tallest, media.widest]) {
        await go(entry.box.href)
        heroes.push({ name: entry.name, ...(await readHero()) })
      }
      const [tall, wide] = heroes
      check(
        `Detail ${kind.name}: tanpa kolom Level/Shadow, badge level berwarna (token --level-N) di pojok gambar`,
        heroes.every((h) => h.split && h.specs.length === 0 && h.badge === `Lv. ${h.level}` && h.badgeBg === h.token && h.badgeInCorner),
        heroes.map((h) => `${h.name}: ${h.badge}`).join(', '),
      )
      const balanced = (h) => (h.wide
        ? Math.abs(h.stage.w - h.market.w) <= 2 && Math.abs(h.stage.top - h.market.top) <= 1 && Math.abs(h.stage.h - h.market.h) <= 2
        : Math.abs(h.stage.w - h.market.w) <= 2 && h.market.top > h.stage.top)
      check(
        `Detail ${kind.name}: kotak dibagi dua seimbang (gambar | harga jual${tall.wide ? '' : ', menumpuk di layar sempit'})`,
        heroes.every(balanced),
        heroes.map((h) => `${Math.round(h.stage.w)}×${Math.round(h.stage.h)} | ${Math.round(h.market.w)}×${Math.round(h.market.h)}`).join('; '),
      )
      // Tinggi baris kotak bisa berbeda antar entri karena panjang nama/deskripsi di kotak identitas (mis. Winter Greater
      // Flamingo), jadi pengaruh gambar diuji di halaman yang sama: gambar tertinggi ditukar dengan gambar terlebar.
      await go(media.tallest.box.href)
      const swap = await evaluate(`(async () => {
        const img = document.querySelector('.panel--hero .entry-stage__image')
        const stageBox = () => { const r = document.querySelector('.panel--hero .entry-stage').getBoundingClientRect(); return { w: r.width, h: r.height } }
        const before = stageBox()
        img.setAttribute('width', ${wide.imageSize[0]}); img.setAttribute('height', ${wide.imageSize[1]})
        img.src = ${JSON.stringify(wide.image)}
        await new Promise((r) => { img.onload = img.onerror = r; setTimeout(r, 2000) })
        await new Promise((r) => setTimeout(r, 150))
        const after = stageBox()
        const s = document.querySelector('.panel--hero .entry-stage').getBoundingClientRect()
        const i = img.getBoundingClientRect()
        return { before, after, inside: i.left >= s.left - 0.5 && i.right <= s.right + 0.5 && i.top >= s.top - 0.5 && i.bottom <= s.bottom + 0.5 }
      })()`)
      check(
        `Detail ${kind.name}: gambar tertinggi & terlebar utuh di panggung, ukuran panggung tidak berubah saat gambarnya ditukar`,
        heroes.every((h) => h.imgInside) && swap.inside && Math.abs(swap.before.w - swap.after.w) <= 1 && Math.abs(swap.before.h - swap.after.h) <= 1 && Math.abs(tall.stage.w - wide.stage.w) <= 1,
        `${tall.name} ${Math.round(swap.before.w)}×${Math.round(swap.before.h)} → dengan gambar ${wide.name} ${Math.round(swap.after.w)}×${Math.round(swap.after.h)}`,
      )
    }
  }

  // 17. Resep: satu jenis masakan (field family) selalu berdampingan. Urutan Default: kelompok urut level terendah
  //     anggotanya (seri: nama anggota pertama), versi dasar (familyBase) paling depan, lalu urutan manual (familyOrder),
  //     lalu level & A–Z.
  //     Level terendah/tertinggi: urut level, level sama tetap berkelompok. A–Z: murni abjad.
  if (kind.recipe) {
    const spec = await evaluate(`(async () => {
      const { recipes } = await import('/src/data/recipes/recipes.js')
      const { EVENTS } = await import('/src/data/events.js')
      const byName = (a, b) => a.name.localeCompare(b.name, 'en', { ignorePunctuation: true })
      const lv = (r) => r.level ?? Infinity
      // Kelompok = (section, family): resep Base Game & event tidak pernah sekelompok.
      const families = new Map()
      for (const r of recipes) families.set(r.section + '|' + r.family, [...(families.get(r.section + '|' + r.family) ?? []), r])
      const manual = (r) => r.familyOrder ?? Infinity
      const groups = [...families.values()].map((m) => [...m].sort((a, b) => Number(!!b.familyBase) - Number(!!a.familyBase) || manual(a) - manual(b) || lv(a) - lv(b) || byName(a, b)))
      const mixedJam = recipes.find((r) => r.slug === 'mixed-jam')
      groups.sort((a, b) => Math.min(...a.map(lv)) - Math.min(...b.map(lv)) || byName(a[0], b[0]))
      // Halaman mengurutkan tiap section sendiri: Base Game dulu, lalu event dari tanggal mulai terbaru.
      const date = Object.fromEntries(EVENTS.map((e) => [e.name, e.startDate]))
      const sections = [...new Set(recipes.map((r) => r.section))].sort((a, b) => (a === 'Base Game' ? -1 : b === 'Base Game' ? 1 : date[b].localeCompare(date[a])))
      return {
        order: sections.flatMap((s) => groups.filter((g) => g[0].section === s).flat()).map((r) => r.name),
        family: Object.fromEntries(recipes.map((r) => [r.name, r.family])),
        // Kunci kelompok yang sebenarnya: section + family (mis. Starfruit Jam di Call of Whales ≠ jam Base Game).
        key: Object.fromEntries(recipes.map((r) => [r.name, r.section + '|' + r.family])),
        section: Object.fromEntries(recipes.map((r) => [r.name, r.section])),
        sections,
        level: Object.fromEntries(recipes.map((r) => [r.name, r.level])),
        missing: recipes.filter((r) => typeof r.family !== 'string' || !r.family).length,
        multiBase: groups.filter((m) => m.filter((r) => r.familyBase).length > 1).length,
        dupOrder: groups.filter((m) => new Set(m.filter((r) => r.familyOrder).map((r) => r.familyOrder)).size !== m.filter((r) => r.familyOrder).length).length,
        mixedJam: { base: mixedJam.familyBase === true, choose: mixedJam.ingredients.length > 0 && mixedJam.ingredients.every((g) => g.type === 'choose') },
        groups: groups.length,
        shared: groups.filter((m) => m.length > 1).length,
      }
    })()`)
    // Anggota satu kelompok (section + family) bersebelahan (kalau `byLevel`, cukup di dalam level yang sama).
    const contiguous = (names, byLevel = false) => {
      const key = (n) => (byLevel ? `${spec.level[n]}|${spec.key[n]}` : spec.key[n])
      const seen = new Set()
      return names.every((n, i) => {
        if (i > 0 && key(names[i - 1]) === key(n)) return true
        if (seen.has(key(n))) return false
        seen.add(key(n))
        return true
      })
    }
    const readNames = async (route) => { await go(route); return (await snapshot()).cards.map((c) => c.name) }
    // Gambar di detail resep: tile bahan persegi (gula warna 400×661 tetap utuh) dan panggung yang sama besar untuk
    // gambar tertinggi (Milkshake) maupun terlebar.
    const readStage = () => evaluate(`(() => {
      const stage = document.querySelector('.panel--hero .entry-stage').getBoundingClientRect()
      const img = document.querySelector('.panel--hero .entry-stage__image').getBoundingClientRect()
      const tiles = [...document.querySelectorAll('.item-tile__image')].map((i) => { const r = i.getBoundingClientRect(); return { w: r.width, h: r.height, fit: getComputedStyle(i).objectFit } })
      return {
        w: stage.width, h: stage.height,
        inside: img.left >= stage.left - 0.5 && img.right <= stage.right + 0.5 && img.top >= stage.top - 0.5 && img.bottom <= stage.bottom + 0.5,
        tiles: tiles.length,
        tilesOk: tiles.every((r) => Math.abs(r.w - r.h) <= 1 && r.fit === 'contain' && Math.abs(r.w - tiles[0].w) <= 1),
      }
    })()`)
    await go(media.tallest.box.href)
    const tallStage = await readStage()
    await go(media.widest.box.href)
    const wideStage = await readStage()
    await go('/recipes/blue-roll-cake')
    const sugarTiles = await readStage()
    check(
      `Detail resep: panggung sama besar untuk ${media.tallest.name} & ${media.widest.name}, gambar utuh; tile bahan persegi (contain)`,
      tallStage.inside && wideStage.inside && Math.abs(tallStage.w - wideStage.w) <= 1 && Math.abs(tallStage.h - wideStage.h) <= 1 && sugarTiles.tiles > 0 && sugarTiles.tilesOk,
      `${Math.round(tallStage.w)}×${Math.round(tallStage.h)} vs ${Math.round(wideStage.w)}×${Math.round(wideStage.h)}, ${sugarTiles.tiles} tile bahan`,
    )
    check('Data resep: semua punya family, versi dasar & familyOrder tidak ganda dalam satu kelompok', spec.missing === 0 && spec.multiBase === 0 && spec.dupOrder === 0, `${spec.groups} kelompok, ${spec.shared} berisi lebih dari satu resep`)
    check('Mixed Jam (bahan: pilih buah bebas) jadi versi dasar kelompok Jam', spec.mixedJam.base && spec.mixedJam.choose)
    // Kelompok hanya berlaku di dalam satu section: resep event satu jenis dengan resep Base Game tidak ikut kelompoknya
    // (data uji: dua jam Base Game dan satu jam event).
    const perSection = await evaluate(`(async () => {
      const { buildRecipeOrder } = await import('/src/pages/recipes/recipeOrder.js')
      const r = (slug, section, family, level, familyBase) => ({ slug, name: slug, section, family, level, ...(familyBase ? { familyBase } : {}) })
      const order = buildRecipeOrder([r('b-jam', 'Base Game', 'jam', 1), r('event-jam', 'Echo of Ancients', 'jam', 1, true), r('a-jam', 'Base Game', 'jam', 3, true), r('pie', 'Base Game', 'pie', 2)])
      return [...order.entries()].sort((x, y) => x[1] - y[1]).map(([slug]) => slug).join()
    })()`)
    check('Kelompok resep per section: versi dasar event tidak memimpin kelompok Base Game', perSection === 'a-jam,b-jam,event-jam,pie', perSection)

    let names = await readNames('/recipes')
    const at = (name) => names.indexOf(name)
    const defaultLabel = await evaluate(`document.querySelector('.list-sort option[value="default"]')?.textContent.trim()`)
    check('Urutan Default: satu jenis masakan selalu berdampingan (label tetap "Urutan Default")', contiguous(names) && names.length === spec.order.length && defaultLabel === 'Urutan Default', defaultLabel)
    check('Urutan Default: kelompok urut level terendah, versi dasar di depan, lalu urutan manual, level & abjad', names.join('|') === spec.order.join('|'), names.slice(0, 6).join(', ') + ' …')
    check(
      'Contoh: pie (Mushroom Pie dulu, Black Truffle Pie & Shiitake Pie berdampingan), Exquisite Afternoon Tea tepat setelah Afternoon Tea',
      at('Mushroom Pie') >= 0 && spec.family[names[at('Mushroom Pie') - 1]] !== 'pie' && Math.abs(at('Black Truffle Pie') - at('Shiitake Pie')) <= 5 &&
        names.slice(at('Mushroom Pie'), at('Mushroom Pie') + 7).every((n) => spec.family[n] === 'pie') && at('Exquisite Afternoon Tea') === at('Afternoon Tea') + 1,
      `Afternoon Tea #${at('Afternoon Tea') + 1}, Exquisite #${at('Exquisite Afternoon Tea') + 1}`,
    )
    const rainbow = ['Original', 'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Indigo', 'Violet'].map((c) => `${c} Roll Cake`)
    const rollCakes = names.filter((n) => spec.family[n] === 'roll-cake')
    const jams = names.filter((n) => spec.family[n] === 'jam')
    check('Roll Cake mengikuti urutan pelangi (familyOrder); Mixed Jam paling depan di kelompok Jam', rollCakes.join() === rainbow.join() && jams[0] === 'Mixed Jam', rollCakes.map((n) => n.replace(' Roll Cake', '')).join(', '))
    // Urutan lain berlaku di dalam tiap section; section tetap Base Game dulu, lalu event terbaru → terlama.
    const sectionRuns = (list) => list.reduce((runs, n) => (runs.at(-1)?.[0] && spec.section[runs.at(-1)[0]] === spec.section[n] ? runs.at(-1).push(n) : runs.push([n]), runs), [])
    const sectionsInOrder = (list) => sectionRuns(list).map((run) => spec.section[run[0]]).join('|') === spec.sections.join('|')
    for (const [sort, dir] of [['level', 1], ['level-desc', -1]]) {
      names = await readNames(`/recipes?urut=${sort}`)
      const levelsOk = sectionRuns(names).every((run) => run.every((n, i) => i === 0 || dir * (spec.level[n] - spec.level[run[i - 1]]) >= 0))
      const sameLevelOrder = names.every((n, i) => i === 0 || spec.level[n] !== spec.level[names[i - 1]] || spec.order.indexOf(n) > spec.order.indexOf(names[i - 1]))
      check(`Urutan ${sort === 'level' ? 'Level terendah' : 'Level tertinggi'}: urut level di tiap section, level sama tetap berkelompok per jenis`, names.length === spec.order.length && sectionsInOrder(names) && levelsOk && contiguous(names, true) && sameLevelOrder)
    }
    names = await readNames('/recipes?urut=az')
    check(
      'Urutan A–Z: murni abjad di dalam tiap section',
      sectionsInOrder(names) && sectionRuns(names).every((run) => run.join('|') === [...run].sort((a, b) => a.localeCompare(b, 'en')).join('|')) && names.length === spec.order.length,
    )
    // Filter & pencarian tetap bekerja; hasilnya mengikuti urutan default yang sama.
    const subsequence = (list) => list.every((n, i) => i === 0 || spec.order.indexOf(n) > spec.order.indexOf(list[i - 1]))
    names = await readNames('/recipes?level=11')
    check('Filter Level 11 + Urutan Default: hanya level 11, kelompok tetap berdampingan', names.length > 0 && names.every((n) => spec.level[n] === 11) && subsequence(names) && contiguous(names), `${names.length} resep`)
    names = await readNames('/recipes?q=tea')
    check('Cari "tea" + Urutan Default: urutan & kelompok sama dengan daftar penuh', names.length > 0 && subsequence(names) && contiguous(names), names.join(', '))
  }

  // 18. Badge kategori: warna dari token --category-<kunci> sesuai nama kategori di data (Common putih di light & netral
  //     di dark, tiap event punya warna, kategori tak terdaftar → cadangan). Gaya beda dari badge level (latar lembut +
  //     garis tepi vs blok penuh) dan warnanya tidak mirip level di sebelahnya. Kontras teks AA. Light & dark.
  const CATEGORY_PROBE = `
    const [{ FISH_CATEGORIES, BUG_CATEGORIES, BIRD_CATEGORIES, ANIMAL_CATEGORIES }, { RECIPE_CATEGORIES }, { CROP_CATEGORIES }, { COLLECTIBLE_CATEGORIES }, { categoryKey, categoryToneStyle }] = await Promise.all(
      ['/src/data/wildlife/attributes.js', '/src/data/recipes/categories.js', '/src/data/crops/categories.js', '/src/data/collectibles/categories.js', '/src/components/catalog/categoryTone.js'].map((p) => import(p)),
    )
    const known = { fish: FISH_CATEGORIES, bugs: BUG_CATEGORIES, birds: BIRD_CATEGORIES, animals: ANIMAL_CATEGORIES, recipes: RECIPE_CATEGORIES, crops: CROP_CATEGORIES, collectibles: COLLECTIBLE_CATEGORIES }[${JSON.stringify(kindSlug)}]
    const root = getComputedStyle(document.documentElement)
    const probe = document.createElement('span'); document.body.append(probe)
    // Nilai token → nilai terhitung yang bisa dibandingkan dengan gaya badge (warna, atau gradasi untuk Rainbow Verse).
    const resolveBg = (value) => { probe.style.background = value; const cs = getComputedStyle(probe); return cs.backgroundImage !== 'none' ? cs.backgroundImage : cs.backgroundColor }
    const resolveInk = (value) => { probe.style.color = value; return getComputedStyle(probe).color }
    const token = (key) => ({ bg: root.getPropertyValue('--category-' + key).trim(), ink: root.getPropertyValue('--category-' + key + '-ink').trim() })
    const expected = (name) => { const t = token(categoryKey(name)); const f = token('fallback'); return { bg: resolveBg(t.bg || f.bg), ink: resolveInk(t.ink || f.ink), registered: !!(t.bg && t.ink) } }
    const bgOf = (el) => { const cs = getComputedStyle(el); return cs.backgroundImage !== 'none' ? cs.backgroundImage : cs.backgroundColor }
  `
  const readCategoryBadges = (selector) => evaluate(`(async () => {
    ${CATEGORY_PROBE}
    const badges = [...document.querySelectorAll(${JSON.stringify(selector)})].map((badge) => {
      const text = badge.cloneNode(true)
      text.querySelectorAll('[aria-hidden], .visually-hidden').forEach((e) => e.remove())
      const name = text.textContent.trim()
      const level = badge.parentElement.querySelector('.card-badge--level')
      const cs = getComputedStyle(badge)
      return { name, bg: bgOf(badge), ink: cs.color, line: cs.borderTopColor, lineWidth: parseFloat(cs.borderTopWidth), expected: expected(name), levelBg: level ? getComputedStyle(level).backgroundColor : null, levelLine: level ? getComputedStyle(level).borderTopColor : null }
    })
    // Semua kategori terdaftar (termasuk event yang belum ada entrinya) punya token latar & teks.
    const registry = Object.keys(known).map((name) => ({ name, ...token(categoryKey(name)), resolvedBg: resolveBg(token(categoryKey(name)).bg), resolvedInk: resolveInk(token(categoryKey(name)).ink) }))
    // Kategori baru yang belum terdaftar → warna cadangan.
    const temp = document.createElement('span'); temp.className = 'card-badge card-badge--category'
    Object.entries(categoryToneStyle('Kategori Baru Uji')).forEach(([k, v]) => temp.style.setProperty(k, v)); document.body.append(temp)
    const fallback = { got: bgOf(temp), want: resolveBg(token('fallback').bg) }
    temp.remove(); probe.remove()
    return { theme: document.documentElement.dataset.theme, badges, registry, fallback }
  })()`)
  const stopsOf = (css) => (css.match(/rgba?\([^)]*\)/g) ?? [])
  const minContrast = (ink, bg) => Math.min(...stopsOf(bg).map((c) => contrastRatio(ink, c)))
  const toggleThemeBtn = async () => { await evaluate(`document.querySelector('.icon-button[aria-label^="Ganti ke mode"]').click()`); await sleep(700) }
  await go(kind.path)
  const categoryThemes = [await readCategoryBadges('.entry-grid .card-badge--category')]
  await toggleThemeBtn()
  categoryThemes.push(await readCategoryBadges('.entry-grid .card-badge--category'))
  await toggleThemeBtn()
  await evaluate(`localStorage.removeItem('hdx-theme')`)
  for (const { theme, badges, registry, fallback } of categoryThemes) {
    const names = [...new Set(badges.map((b) => b.name))]
    const common = badges.filter((b) => b.name === 'Common')
    const events = badges.filter((b) => b.name !== 'Common')
    const commonOk = common.length > 0 && common.every((b) => b.bg === (theme === 'light' ? 'rgb(255, 255, 255)' : b.expected.bg))
    check(
      `Badge kategori ${kind.name} (${theme}): warna dari token nama kategori, Common ${theme === 'light' ? 'putih' : 'netral'}${events.length ? ', event berwarna sendiri' : ''}`,
      badges.length > 0 && commonOk && badges.every((b) => b.expected.registered && b.bg === b.expected.bg && b.ink === b.expected.ink) && (events.length === 0 || events.every((b) => b.bg !== common[0]?.bg)),
      names.join(', '),
    )
    const worst = Math.min(...badges.map((b) => minContrast(b.ink, b.bg)), ...registry.map((r) => minContrast(r.resolvedInk, r.resolvedBg)))
    check(`Badge kategori ${kind.name} (${theme}): kontras teks lolos AA untuk semua ${registry.length} kategori terdaftar`, registry.every((r) => r.bg && r.ink) && worst >= 4.5, `terendah ${worst.toFixed(2)}:1`)
    const pairs = badges.filter((b) => b.levelBg)
    const closest = pairs.length ? Math.min(...pairs.flatMap((b) => stopsOf(b.bg).map((c) => colorDistance(c, b.levelBg)))) : Infinity
    const outlined = pairs.every((b) => b.lineWidth >= 1 && Math.min(...stopsOf(b.bg).map((c) => colorDistance(c, b.line))) >= 0.08)
    if (pairs.length) {
      check(
        `Badge kategori ${kind.name} (${theme}): gaya garis tepi, warnanya tidak mirip badge level di sebelahnya (ΔE OKLab ≥ 0,06)`,
        outlined && closest >= 0.06,
        `${pairs.length} pasang, terdekat ${closest.toFixed(3)}`,
      )
    }
    check(`Badge kategori (${theme}): kategori yang belum terdaftar memakai warna cadangan`, fallback.got === fallback.want && fallback.want !== 'rgba(0, 0, 0, 0)', fallback.got)
  }
  // Halaman detail: tag kategori memakai token yang sama (entri event kalau ada; null = kartu pertama di daftar).
  const EVENT_SAMPLES = {
    fish: ['striped-red-mullet', 'rabbit-fish', 'golden-garfish'],
    bugs: ['apollo', 'morpho-luna'],
    birds: ['blue-peafowl', 'wandering-albatross'],
    animals: [null, 'dolphin'],
    recipes: [null, 'mooncake'],
    crops: ['tomato', 'prickly-pear'],
    collectibles: ['starfall-shard', 'glasswort'],
  }
  for (const slug of EVENT_SAMPLES[kindSlug] ?? [null]) {
    await go(slug ? `${kind.path}/${slug}` : kind.path)
    if (!slug) { await evaluate(`document.querySelector('.entry-grid .entry-card').click()`); await sleep(1200) }
    const tag = (await readCategoryBadges('.category-tag')).badges[0]
    check(
      `Detail ${kind.name}: tag kategori "${tag?.name}" memakai token yang sama, kontras AA`,
      tag && tag.bg === tag.expected.bg && tag.ink === tag.expected.ink && minContrast(tag.ink, tag.bg) >= 4.5,
      tag && `${minContrast(tag.ink, tag.bg).toFixed(2)}:1`,
    )
  }

  // 19. Section: hasil dibagi per section (field section di data). Base Game paling atas, lalu event dari tanggal mulai
  //     terbaru sampai terlama (startDate di src/data/events.js; tanpa tanggal di bawah). Judul: emoji, nama, jumlah.
  //     Section tanpa hasil disembunyikan, jumlah hasil dihitung total, dan status event tidak tampil di mana pun.
  const SECTION_PROBE = `
    const { EVENTS } = await import('/src/data/events.js')
    const entries = (await import(${JSON.stringify(dataModule)}))[${JSON.stringify(dataExport)}]
    const date = Object.fromEntries(EVENTS.map((e) => [e.name, e.startDate]))
    const emoji = Object.fromEntries(EVENTS.map((e) => [e.name, e.emoji]))
    const heads = [...document.querySelectorAll('.list-section')].map((s) => {
      const name = s.querySelector('.list-section__name').cloneNode(true)
      name.querySelectorAll('[aria-hidden]').forEach((e) => e.remove())
      return {
        name: name.textContent.trim(),
        emoji: s.querySelector('.list-section__name [aria-hidden]')?.textContent.trim(),
        count: s.querySelector('.list-section__count').textContent.trim(),
        cards: s.querySelectorAll('.entry-card').length,
        level: s.querySelector('h3')?.tagName,
      }
    })
    const shown = Number(document.querySelector('.list-status__count strong')?.textContent)
    const statusText = /Active Event|Finished Event|Event ended|Unavailable|Event aktif|sudah selesai|telah berakhir/i.test(document.querySelector('main').textContent)
  `
  const STATUS_RE = /Active Event|Finished Event|Event ended|Unavailable|Event aktif|sudah selesai|telah berakhir/i
  await go(kind.path)
  const sec = await evaluate(`(async () => {
    ${SECTION_PROBE}
    const counts = {}
    for (const e of entries) counts[e.section] = (counts[e.section] ?? 0) + 1
    // Urutan yang diharapkan dihitung di sini dari tanggal (bukan dengan fungsi aplikasi).
    const expected = Object.keys(counts).sort((a, b) => (a === 'Base Game' ? -1 : b === 'Base Game' ? 1 : (date[b] ?? '').localeCompare(date[a] ?? '')))
    return { heads, counts, expected, date, emoji, shown, total: entries.length, statusText, unknown: entries.filter((e) => e.section !== 'Base Game' && !(e.section in date)).map((e) => e.slug) }
  })()`)
  const eventDates = sec.heads.slice(1).map((h) => sec.date[h.name])
  check(
    `Section ${kind.name}: Base Game paling atas, lalu event dari yang terbaru sampai yang terlama`,
    sec.heads[0]?.name === 'Base Game' && sec.heads.map((h) => h.name).join('|') === sec.expected.join('|') && eventDates.every((d, i) => i === 0 || d <= eventDates[i - 1]) && sec.unknown.length === 0,
    sec.heads.map((h) => `${h.name}${sec.date[h.name] ? ` (${sec.date[h.name]})` : ''}`).join(' → '),
  )
  check(
    `Section ${kind.name}: judul berisi emoji, nama, dan jumlah entri; jumlah total sama dengan semua kartu`,
    sec.heads.every((h) => h.level === 'H3' && h.emoji === (h.name === 'Base Game' ? '🎮' : sec.emoji[h.name]) && h.count === `${sec.counts[h.name]} ${kind.noun}` && h.cards === sec.counts[h.name]) &&
      sec.shown === sec.total && sec.heads.reduce((sum, h) => sum + h.cards, 0) === sec.total,
    sec.heads.map((h) => `${h.emoji} ${h.name}: ${h.count}`).join(', '),
  )
  check(`Section ${kind.name}: status event (aktif/selesai) tidak tampil`, !sec.statusText)

  // 20. Crops & Collectibles: section tersembunyi saat tanpa hasil, lalu halaman detail.
  if (kind.goods) {
    const readSections = async (route) => { await go(route); return evaluate(`(async () => { ${SECTION_PROBE} return { names: heads.map((h) => h.name), cards: heads.map((h) => h.cards), shown, statusText } })()`) }
    const fmt = (value) => new Intl.NumberFormat('id-ID').format(value)
    const DETAIL_PROBE = `
      const main = document.querySelector('main')
      const tiles = (selector) => [...document.querySelectorAll(selector + ' .item-tile')].map((t) => ({ name: t.querySelector('.item-tile__name').textContent, href: t.querySelector('a')?.getAttribute('href') ?? null, meta: t.querySelector('.item-tile__type')?.textContent ?? '' }))
      const panels = [...document.querySelectorAll('.entry-detail__grid > section')].map((p) => [...p.classList].filter((c) => c.startsWith('panel--')).join('+'))
      const tag = document.querySelector('.category-tag')
      const specs = Object.fromEntries([...document.querySelectorAll('.entry-detail__grid .spec')].map((s) => [s.querySelector('.spec__label').textContent.trim(), s.querySelector('.spec__value').textContent.trim()]))
      const usage = async (id) => {
        const [{ recipes }, { animals }] = await Promise.all(['/src/data/recipes/recipes.js', '/src/data/wildlife/animals.js'].map((p) => import(p)))
        const uses = (r) => r.ingredients.some((g) => (g.type === 'fixed' ? g.items.some((e) => e.item === id) : g.options.includes(id)))
        return { recipes: recipes.filter(uses).map((r) => '/recipes/' + r.slug).sort(), animals: animals.filter((a) => a.favoriteFood.includes(id)).map((a) => '/wildlife/animals/' + a.slug) }
      }
      const base = {
        title: document.querySelector('h1')?.textContent.trim(),
        panels,
        tagEmoji: tag?.querySelector('[aria-hidden]')?.textContent ?? null,
        tagName: tag ? [...tag.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim() : null,
        description: document.querySelector('.panel--info .entry-detail__description')?.textContent.trim(),
        specs,
        recipes: tiles('.panel--recipes'),
        recipesEmpty: document.querySelector('.panel--recipes .is-missing')?.textContent.trim() ?? null,
        animals: tiles('.panel--animals'),
        statusText: /Active Event|Finished Event|Event ended|Unavailable|Event aktif|sudah selesai|telah berakhir/i.test(main.textContent),
        mastery: /Mastery/i.test(main.textContent),
      }
    `
    const sortedHrefs = (list) => list.map((t) => t.href).sort()
    if (kind.goods === 'crops') {
      let view = await readSections('/crops?kategori=Common')
      check('Crops: filter Kategori Common → hanya section Base Game (section event tanpa hasil disembunyikan)', view.names.join() === 'Base Game' && view.cards[0] === view.shown, `${view.names.join(', ')} (${view.shown})`)
      view = await readSections('/crops?q=prickly')
      check('Crops: cari "prickly" → hanya section Echo of Ancients, jumlah hasil total 1', view.names.join() === 'Echo of Ancients' && view.shown === 1, view.names.join(', '))
      const cardEmoji = await evaluate(`(() => { const card = [...document.querySelectorAll('.entry-card')].find((c) => c.getAttribute('href') === '/crops/prickly-pear'); return card?.querySelector('.card-badge--category [aria-hidden]')?.textContent.trim() })()`)
      await go('/crops')
      const tomatoCardEmoji = await evaluate(`[...document.querySelectorAll('.entry-card')].find((c) => c.getAttribute('href') === '/crops/tomato')?.querySelector('.card-badge--category [aria-hidden]')?.textContent.trim()`)

      const readCrop = () => evaluate(`(async () => {
        ${DETAIL_PROBE}
        const { getCropBySlug } = await import('/src/data/crops/crops.js')
        const crop = getCropBySlug(location.pathname.split('/').pop())
        const rows = [...document.querySelectorAll('.panel--hero .market')].map((m) => ({
          title: m.querySelector('.market__title').childNodes[1].textContent.trim(),
          values: [...m.querySelectorAll('.market-value__amount')].map((a) => a.childNodes[0].textContent.trim()),
        }))
        return { ...base, crop, rows, badge: document.querySelector('.stage-level [aria-hidden]')?.textContent.trim(), usage: await usage('crops/' + crop?.slug) }
      })()`)
      const growthText = (seconds) => [Math.floor(seconds / 3600) && `${Math.floor(seconds / 3600)} jam`, Math.floor((seconds % 3600) / 60) && `${Math.floor((seconds % 3600) / 60)} menit`].filter(Boolean).join(' ')
      const rowsText = (crop) => crop.starValues.map((row) => `${row.label === 'Market Value' ? 'Harga jual' : row.label}: ${row.values.map((v) => (v == null ? '—' : fmt(v))).join('/')}`)

      await go('/crops/tomato')
      let c = await readCrop()
      check('Detail tanaman: 5 kotak (identitas, gambar & nilai jual, info tanam, dipakai di resep, makanan hewan), tanpa Farming Mastery',
        c.panels.join() === 'panel--info,panel--hero,panel--aside+panel--facts,panel--recipes,panel--animals' && !c.mastery, c.panels.join(', '))
      check('Detail tanaman: kategori Common ditandai 🏷️ di detail, 🏠 di kartu daftar (tetap kategori Common)', c.tagEmoji === '🏷️' && c.tagName === 'Common' && tomatoCardEmoji === '🏠' && cardEmoji === '🦖', `${c.tagEmoji} / ${tomatoCardEmoji}`)
      check('Detail tanaman: badge level, harga jual per bintang sesuai data', c.badge === `Lv. ${c.crop.level}` && c.rows.map((r) => `${r.title}: ${r.values.join('/')}`).join() === rowsText(c.crop).join(), c.rows.map((r) => r.values.join('/')).join(' | '))
      check('Detail tanaman: info tanam (harga benih & waktu tumbuh) sesuai data', c.specs['Harga benih'] === `${fmt(c.crop.seedPrice)}koin` && c.specs['Waktu tumbuh'] === growthText(c.crop.growthTime), JSON.stringify(c.specs))
      check(
        `Dipakai di resep (Tomato): ${c.usage.recipes.length} resep dari data resep Hatowiki, tertaut, dengan level & cara pakai`,
        c.usage.recipes.length > 0 && sortedHrefs(c.recipes).join() === c.usage.recipes.join() && c.recipes.every((t) => /^Lv\. \d+ · Bahan (tetap x\d+|pilihan \(pilih \d+\))/.test(t.meta)),
        c.recipes.map((t) => t.name).join(', '),
      )
      check('Makanan favorit hewan (Tomato): Capybara dari data hewan, tertaut', c.animals.map((t) => t.href).join() === c.usage.animals.join() && c.usage.animals.includes('/wildlife/animals/capybara'), c.animals.map((t) => t.name).join(', '))
      await evaluate(`document.querySelector('.panel--recipes .item-tile a').click()`); await sleep(1200)
      const opened = await evaluate(`({ path: location.pathname, back: [...document.querySelectorAll('.item-tile a')].some((a) => a.getAttribute('href') === '/crops/tomato') })`)
      check('Klik resep di "Dipakai di resep" membuka resepnya; di sana Tomato tertaut balik ke /crops/tomato', opened.path === c.recipes[0].href && opened.back, opened.path)

      await go('/crops/prickly-pear')
      c = await readCrop()
      check('Tanaman event (Prickly Pear): semua deret per bintang dengan label asli (Harga jual & Event Tokens), tanpa status event',
        c.rows.map((r) => r.title).join() === 'Harga jual,Event Tokens' && c.rows.map((r) => `${r.title}: ${r.values.join('/')}`).join() === rowsText(c.crop).join() && !c.statusText,
        c.rows.map((r) => `${r.title} ${r.values.join('/')}`).join(' | '))
      await go('/crops/starfruit')
      c = await readCrop()
      check('Kualitas yang tidak ada di sumber (Starfruit 5★, Event Tokens 4–5★) tampil "—"', c.rows.map((r) => `${r.title}: ${r.values.join('/')}`).join() === rowsText(c.crop).join() && c.rows[0].values[4] === '—', c.rows.map((r) => r.values.join('/')).join(' | '))
      await go('/crops/paddy')
      c = await readCrop()
      check('Paddy: deskripsi kosong di sumber → "Deskripsi belum tersedia."; tanpa kotak hewan kalau tidak ada yang menyukainya',
        c.description === 'Deskripsi belum tersedia.' && c.usage.animals.length === 0 && !c.panels.includes('panel--animals') && sortedHrefs(c.recipes).join() === c.usage.recipes.join(), `${c.recipes.length} resep`)
      await go('/crops/tidak-ada')
      check('Slug tanaman tidak dikenal → halaman tidak ditemukan', (await evaluate(`document.querySelector('h1')?.textContent.trim()`)) === 'Tanaman tidak ditemukan')
    } else {
      let view = await readSections('/collectibles?kategori=Meteor+Shower')
      check('Collectibles: Starfall Shard (kategori Meteor Shower) ada di section Base Game', view.names.join() === 'Base Game' && view.shown === 1, view.names.join(', '))
      view = await readSections('/collectibles?lokasi=Whalefall+Canyon')
      check('Collectibles: filter Lokasi Whalefall Canyon → hanya section Call of Whales', view.names.join() === 'Call of Whales' && view.shown === view.cards[0], `${view.names.join(', ')} (${view.shown})`)

      const readItem = () => evaluate(`(async () => {
        ${DETAIL_PROBE}
        const { getCollectibleBySlug } = await import('/src/data/collectibles/collectibles.js')
        const item = getCollectibleBySlug(location.pathname.split('/').pop())
        const svg = document.querySelector('.location-map__svg')
        const [vx, vy, vw, vh] = (svg?.getAttribute('viewBox') ?? '0 0 0 0').split(' ').map(Number)
        const polygons = [...document.querySelectorAll('.location-map__zone')]
        return {
          ...base, item, usage: await usage('collectibles/' + item?.slug),
          level: document.querySelectorAll('.stage-level, .card-badge--level').length,
          location: document.querySelector('.location-info__name')?.textContent.trim() ?? [...document.querySelectorAll('.location-info__list li')].map((li) => li.textContent).join(', '),
          map: document.querySelector('.location-map__base')?.getAttribute('href') ?? null,
          zones: polygons.length,
          inside: polygons.every((p) => p.getAttribute('points').split(' ').every((pair) => { const [x, y] = pair.split(',').map(Number); return x >= vx - 0.5 && x <= vx + vw + 0.5 && y >= vy - 0.5 && y <= vy + vh + 0.5 })),
        }
      })()`)
      await go('/collectibles/apple')
      let it = await readItem()
      check('Detail collectible: 5 kotak (identitas, gambar & angka, lokasi & peta, dipakai di resep, makanan hewan), tanpa level',
        it.panels.join() === 'panel--info,panel--hero,panel--aside+panel--location,panel--recipes,panel--animals' && it.level === 0, it.panels.join(', '))
      check('Detail collectible: nilai jual & energi sesuai data (Apple 28 koin, +8 energi)', it.specs['Nilai jual'] === `${fmt(it.item.sellValue)}koin` && it.specs.Energi === `+${fmt(it.item.energy)}energi`, JSON.stringify(it.specs))
      check('Detail collectible: lokasi & zona peta disorot, semua di dalam potongan peta', it.location === it.item.locations.map((l) => l.name).join(', ') && it.zones > 0 && it.inside && it.map === '/images/maps/heartopia-map.webp', `${it.location}, ${it.zones} poligon`)
      check(
        `Dipakai di resep (Apple): ${it.usage.recipes.length} resep dari data resep Hatowiki, tertaut`,
        it.usage.recipes.length > 0 && sortedHrefs(it.recipes).join() === it.usage.recipes.join() && it.recipes.every((t) => /^Lv\. \d+ · Bahan/.test(t.meta)),
        it.recipes.map((t) => t.name).join(', '),
      )
      check('Makanan favorit hewan (Apple): Panda dari data hewan, tertaut', it.animals.map((t) => t.href).join() === it.usage.animals.join() && it.usage.animals.includes('/wildlife/animals/panda'), it.animals.map((t) => t.name).join(', '))
      await go('/collectibles/bamboo')
      it = await readItem()
      check('Bamboo: tanpa Energy Boost di sumber → tanpa baris energi; belum dipakai resep → keterangan', !('Energi' in it.specs) && it.recipes.length === 0 && it.recipesEmpty === 'Belum ada resep di Hatowiki yang memakai Bamboo.' && it.usage.recipes.length === 0, it.recipesEmpty)
      await go('/collectibles/glasswort')
      it = await readItem()
      check('Glasswort (Call of Whales): zona di peta Whalefall Canyon, tanpa status event', it.map === '/images/maps/whalefall-canyon.webp' && it.zones > 0 && it.inside && it.tagEmoji === '🐳' && !it.statusText, `${it.map}, ${it.zones} poligon`)
      await go('/collectibles/weed')
      it = await readItem()
      check('Weed: nilai jual tidak ada di sumber → "—"', it.item.sellValue === null && it.specs['Nilai jual'] === '—', it.specs['Nilai jual'])
      await go('/collectibles/bizarre-shiitak-black')
      it = await readItem()
      check('Nama janggal di sumber disimpan apa adanya (Bizarre Shiitak Black)', it.title === 'Bizarre Shiitak Black', it.title)
      await go('/collectibles/tidak-ada')
      check('Slug collectible tidak dikenal → halaman tidak ditemukan', (await evaluate(`document.querySelector('h1')?.textContent.trim()`)) === 'Bahan alam tidak ditemukan')
    }
    const detailStatus = []
    for (const slug of kind.goods === 'crops' ? ['prickly-pear', 'white-radish'] : ['tall-mustard', 'wakame']) {
      await go(`${kind.path}/${slug}`)
      if (STATUS_RE.test(await evaluate(`document.querySelector('main').textContent`))) detailStatus.push(slug)
    }
    check(`Detail event ${kind.name}: status event tidak tampil`, detailStatus.length === 0, detailStatus.join(', '))
  }

  // 21. Entri event Fish, Bugs, Birds, Animals, dan Resep: tiap section berisi persis entri section itu di data; filter,
  //     pencarian, dan urutan tetap dibagi per section; detail entri event menampilkan badge kategori event tanpa status;
  //     harga yang tidak dicantumkan sumber tampil "—" (bukan "Belum pasti"); lokasi event memakai zona atau placeholder;
  //     bahan resep event (ikan, tanaman, collectible, resep) tertaut ke halamannya.
  if (!kind.goods) {
    const EVENT_CASES = {
      fish: { category: 'Winter frost season', search: 'crab' },
      bugs: { category: 'Dreamlight Cinematics', search: 'butterfly' },
      birds: { category: 'Call of Whales', search: 'duck' },
      animals: { category: 'Maltese', search: 'e' },
      recipes: { category: 'Midsummer Rhyme', search: 'jam' },
    }
    const cs = EVENT_CASES[kindSlug]
    await go(kind.path)
    const full = await evaluate(`(async () => {
      const entries = (await import(${JSON.stringify(dataModule)}))[${JSON.stringify(dataExport)}]
      const dom = [...document.querySelectorAll('.list-section')].map((s) => ({
        name: [...s.querySelector('.list-section__name').childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim(),
        slugs: [...s.querySelectorAll('.entry-card')].map((c) => c.getAttribute('href').split('/').pop()),
      }))
      const want = (name) => entries.filter((e) => e.section === name).map((e) => e.slug).sort().join()
      return { dom, bad: dom.filter((s) => [...s.slugs].sort().join() !== want(s.name)).map((s) => s.name), events: entries.filter((e) => e.section !== 'Base Game').length }
    })()`)
    check(
      `Entri event ${kind.name}: ${full.events} entri event, tiap section berisi persis entri section itu di data`,
      full.events > 0 && full.dom.length > 1 && full.bad.length === 0,
      full.dom.map((s) => `${s.name} ${s.slugs.length}`).join(', '),
    )

    await go(`${kind.path}?kategori=${encodeURIComponent(cs.category)}`)
    let st = await evaluate(`(async () => { ${SECTION_PROBE} return { heads, shown, statusText, expected: entries.filter((e) => e.category === ${JSON.stringify(cs.category)}).length } })()`)
    check(
      `Filter Kategori "${cs.category}": hanya section event itu, jumlah hasil = total`,
      st.heads.length === 1 && st.heads[0].name === cs.category && st.heads[0].cards === st.expected && st.shown === st.expected && !st.statusText,
      st.heads.map((h) => `${h.name} ${h.cards}`).join(', '),
    )

    await go(`${kind.path}?q=${cs.search}`)
    st = await evaluate(`(async () => {
      ${SECTION_PROBE}
      const q = ${JSON.stringify(cs.search)}
      // Resep dicari lewat nama resep dan nama bahannya; wildlife lewat nama saja.
      const { getItem } = await import('/src/data/items.js')
      const texts = (e) => [e.name, ...(e.ingredients ?? []).flatMap((g) => g.type === 'fixed' ? g.items.map((i) => i.item) : g.options).map((id) => getItem(id)?.name ?? '')]
      const hits = entries.filter((e) => texts(e).some((t) => t.toLowerCase().includes(q)))
      const counts = {}
      for (const e of hits) counts[e.section] = (counts[e.section] ?? 0) + 1
      const order = Object.keys(counts).sort((a, b) => (a === 'Base Game' ? -1 : b === 'Base Game' ? 1 : date[b].localeCompare(date[a])))
      return { heads, shown, order, counts, total: hits.length }
    })()`)
    check(
      `Cari "${cs.search}": hasil dibagi per section (Base Game & event, urut tanggal), jumlah hasil = total`,
      st.order.length >= 2 && st.order[0] === 'Base Game' && st.heads.map((h) => h.name).join('|') === st.order.join('|') && st.heads.every((h) => h.cards === st.counts[h.name]) && st.shown === st.total,
      st.heads.map((h) => `${h.name} ${h.cards}`).join(', '),
    )

    await go(`${kind.path}?urut=az`)
    const azCards = (await snapshot()).cards
    const azGroups = bySection(azCards)
    check(
      `Urut A–Z ${kind.name}: section tetap sama urutannya, A–Z di dalam tiap section`,
      azGroups.map((g) => g[0].section).join('|') === full.dom.map((s) => s.name).join('|') &&
        azGroups.every((g) => g.map((c) => c.name).join('|') === g.map((c) => c.name).sort((a, b) => a.localeCompare(b, 'en')).join('|')),
      azGroups.map((g) => `${g[0].section}: ${g[0].name}…`).join('; '),
    )

    // Detail entri event: tag kategori event (emoji & nama), tanpa status, harga, lokasi & peta.
    const readEvent = () => evaluate(`(() => {
      const tag = document.querySelector('.category-tag')
      const tagText = tag?.cloneNode(true)
      tagText?.querySelectorAll('.visually-hidden, [aria-hidden]').forEach((e) => e.remove())
      const svg = document.querySelector('.location-map__svg')
      const [vx, vy, vw, vh] = (svg?.getAttribute('viewBox') ?? '0 0 0 0').split(' ').map(Number)
      const polygons = [...document.querySelectorAll('.location-map__zone')]
      const description = document.querySelector('.entry-detail__description')
      return {
        title: document.querySelector('h1')?.textContent.trim(),
        description: description ? { text: description.textContent.trim(), missing: description.classList.contains('is-missing') } : null,
        tag: tagText?.textContent.trim() ?? null,
        tagEmoji: tag?.querySelector('[aria-hidden]')?.textContent.trim() ?? null,
        market: [...document.querySelectorAll('.panel--hero .market-value__row .market-value__amount')].map((a) => a.childNodes[0].textContent.trim()),
        locations: [...document.querySelectorAll('.location-info__list li, .location-info__name')].map((e) => e.textContent.trim()),
        polygons: polygons.length,
        inside: polygons.every((p) => p.getAttribute('points').split(' ').every((pair) => { const [x, y] = pair.split(',').map(Number); return x >= vx - 0.5 && x <= vx + vw + 0.5 && y >= vy - 0.5 && y <= vy + vh + 0.5 })),
        mapLabel: svg?.getAttribute('aria-label') ?? '',
        mapImage: document.querySelector('.location-map__base')?.getAttribute('href') ?? null,
        placeholder: !!document.querySelector('.location-map--empty'),
        status: ${STATUS_RE}.test(document.querySelector('main').textContent),
        food: [...document.querySelectorAll('.panel--food .item-tile')].map((t) => [t.querySelector('.item-tile__name').textContent, t.querySelector('a')?.getAttribute('href') ?? null]),
      }
    })()`)
    const openEvent = async (slug) => { await go(`${kind.path}/${slug}`); return readEvent() }
    const dash = ['—', '—', '—', '—', '—']
    // Deskripsi yang jelas salah salin di sumber: description null (tampil "Deskripsi belum tersedia."), teks asli tetap disimpan.
    const hiddenDescription = async (slug) => {
      const e = await openEvent(slug)
      const data = await evaluate(`(async () => {
        const entry = (await import(${JSON.stringify(dataModule)}))[${JSON.stringify(dataExport)}].find((x) => x.slug === ${JSON.stringify(slug)})
        return { description: entry.description, original: entry.descriptionOriginal ?? null }
      })()`)
      return data.description === null && !!data.original && e.description?.missing && e.description.text === 'Deskripsi belum tersedia.'
    }
    const shownDescription = async (slug) => {
      const e = await openEvent(slug)
      return { ok: !!e.description && !e.description.missing && e.description.text.length > 0, text: e.description?.text ?? '' }
    }
    if (kindSlug === 'fish') {
      let e = await openEvent('golden-garfish')
      check('Golden Garfish (Echo of Ancients): badge kategori event, harga jual kosong di sumber → "—", lokasi event dengan zona, tanpa status', e.tag === 'Echo of Ancients' && e.tagEmoji === '🦖' && e.market.join() === dash.join() && e.locations.join() === 'Garfish Event' && e.polygons > 0 && e.inside && !e.status, `${e.market.join(' / ')}; ${e.locations.join(', ')}`)
      e = await openEvent('frostspore-king-crab')
      check('Frostspore King Crab: dua lokasi (lokasi biasa + lokasi event), zona keduanya disorot di peta', e.locations.join('|') === 'Old Sea|[EVENT] Frostspore Fish' && e.polygons >= 2 && e.inside && e.mapLabel.includes('Old Sea') && e.mapLabel.includes('[EVENT] Frostspore Fish') && !e.status, `${e.polygons} poligon — ${e.mapLabel}`)
    } else if (kindSlug === 'birds') {
      let e = await openEvent('wandering-albatross')
      check('Wandering Albatross: harga Info Card hanya 1★–2★ di sumber → 3★–5★ tampil "—" (bukan "Belum pasti")', e.market.join() === '15,60,—,—,—' && e.tag === 'Call of Whales' && !e.status, e.market.join(' / '))
      e = await openEvent('colorful-brick-sparrow')
      check('Colorful Brick Sparrow: label lokasi Spanyol diterjemahkan ("Special Brick Bird Event"), tanpa zona → placeholder peta', e.locations.join() === 'Special Brick Bird Event' && e.placeholder && e.polygons === 0 && !e.status, e.locations.join(', '))
      e = await openEvent('winter-mallard')
      check('Winter Mallard: lokasi biasa + [EVENT] Winter Birdwatching, keduanya berzona', e.locations.join('|') === 'Suburban Lake|[EVENT] Winter Birdwatching' && e.polygons >= 2 && e.inside, e.mapLabel)
    } else if (kindSlug === 'bugs') {
      let e = await openEvent('morpho-luna')
      check('Morpho Luna: lokasi event tanpa zona di sumber (Lost Bug Event) → placeholder peta', e.locations.join() === 'Lost Bug Event' && e.placeholder && e.tag === 'Call of Whales' && !e.status, e.locations.join(', '))
      e = await openEvent('iridescent-rhinoceros-beetle')
      check('Iridescent Rhinoceros Beetle: harga jual kosong di sumber → "—" semua', e.market.join() === dash.join() && e.polygons > 0, e.market.join(' / '))
      e = await openEvent('frostspore-sulkowskys-morpho')
      check('Frostspore Sulkowsky\'s Morpho: 4 lokasi termasuk [EVENT] Frostspore Butterfly, semua berzona', e.locations.length === 4 && e.locations.includes('[EVENT] Frostspore Butterfly') && e.polygons >= 4 && e.inside, e.locations.join(', '))
      check('Colorful Brick Large Red Damselfly: deskripsi salah salin (sama dengan versi Pink) → null, tampil "Deskripsi belum tersedia."', await hiddenDescription('colorful-brick-large-red-damselfly'))
      const chafer = await shownDescription('green-flower-chafer')
      check('Green Flower Chafer: deskripsi tetap tampil', chafer.ok, chafer.text)
    } else if (kindSlug === 'animals') {
      let e = await openEvent('dolphin')
      check('Dolphin (Call of Whales): peta Whalefall Canyon dengan pin, makanan ikan tertaut', e.mapImage === '/images/maps/whalefall-canyon.webp' && e.tag === 'Call of Whales' && e.food.length === 3 && e.food.every(([, href]) => href?.startsWith('/wildlife/fish/')) && !e.status, e.food.map(([n, h]) => `${n} → ${h}`).join(', '))
      e = await openEvent('maltese')
      check('Maltese (section & kategori Maltese): makanan Grilled Mushrooms tertaut ke resepnya, Meat tanpa tautan', e.tag === 'Maltese' && e.food.some(([n, h]) => n === 'Grilled Mushrooms' && h === '/recipes/grilled-mushrooms') && e.food.some(([n, h]) => n === 'Meat' && h === null) && !e.status, e.food.map(([n, h]) => `${n} → ${h}`).join(', '))
      e = await openEvent('penguin')
      check('Penguin (Winter frost season): tanpa titik tempat makan di sumber → zona lokasi Old Sea', e.tag === 'Winter frost season' && e.locations.join() === 'Old Sea' && e.polygons > 0 && !e.status, e.mapLabel)
    } else if (kindSlug === 'recipes') {
      // Kelompok jenis masakan di section event: Mooncake (versi Large tepat setelah versi kecilnya), Springday Black Tea
      // (termasuk "Springdag" yang salah ketik di sumber), Starfruit Jam tidak ikut kelompok Jam Base Game.
      const names = bySection((await (async () => { await go('/recipes'); return snapshot() })()).cards)
      const sectionNames = (name) => names.find((g) => g[0].section === name)?.map((c) => c.name) ?? []
      const autumn = sectionNames('Autumn Moon Treasury')
      check(
        'Autumn Moon Treasury: Mooncake paling depan, tiap Large tepat setelah versi kecilnya',
        autumn.join('|') === ['Mooncake', 'Large Egg Yolk Mooncake', 'Chocolate Mooncake', 'Large Chocolate Mooncake', 'Moon Rabbit Snow Skin Mooncake', 'Large Moon Rabbit Snow Skin Mooncake', 'Moon Rabbit Lava Mooncake', 'Osmanthus Roasted Milk Tea'].join('|'),
        autumn.join(', '),
      )
      const dreamlight = sectionNames('Dreamlight Cinematics')
      const teaIdx = dreamlight.map((n, i) => (/^Springda[yg] .* Black Tea$/.test(n) ? i : -1)).filter((i) => i >= 0)
      check(
        'Dreamlight Cinematics: 8 Springday Black Tea (termasuk "Springdag Raspberry Black Tea" apa adanya) berdampingan, Fruit paling depan',
        teaIdx.length === 8 && teaIdx.at(-1) - teaIdx[0] === 7 && dreamlight[teaIdx[0]] === 'Springday Fruit Black Tea' && dreamlight.includes('Springdag Raspberry Black Tea'),
        dreamlight.slice(teaIdx[0], teaIdx[0] + 8).join(', '),
      )
      const whales = sectionNames('Call of Whales')
      const base = sectionNames('Base Game')
      check('Starfruit Jam di section Call of Whales, bukan di kelompok Jam Base Game', whales.includes('Starfruit Jam') && !base.includes('Starfruit Jam') && base.filter((n) => / Jam$/.test(n))[0] === 'Mixed Jam', `${whales.length} resep Call of Whales`)

      // Tautan bahan resep event: ikan event, tanaman & collectible event, resep lain; Ingredient tanpa tautan.
      const LINKS = {
        'prickly-pear-black-garfish-soup': { 'Black Garfish': '/wildlife/fish/black-garfish', 'Prickly Pear': '/crops/prickly-pear', 'Concentrated Date Paste': null },
        'grilled-squid-w-apple-jam': { 'Japanese Flying Squid': '/wildlife/fish/japanese-flying-squid', Wakame: '/collectibles/wakame', 'Sea Grape': '/collectibles/sea-grape', 'Apple Jam': '/recipes/apple-jam' },
        'wild-burdock-celtuce-taco': { Burdock: '/collectibles/burdock', 'Romaine Lettuce Taco': '/recipes/romaine-lettuce-taco' },
        'ocean-iced-drink': { Starfruit: '/crops/starfruit', 'Spirulina Powder': null },
        'creamy-white-radish-soup': { 'White Radish': '/crops/white-radish' },
        'apple-pearl-cake': { Scallop: '/wildlife/fish/scallop' },
      }
      const wrong = []
      for (const [slug, expected] of Object.entries(LINKS)) {
        await go(`/recipes/${slug}`)
        const tiles = Object.fromEntries(await evaluate(`[...document.querySelectorAll('.ingredient-group .item-tile')].map((t) => [t.querySelector('.item-tile__name').textContent, t.querySelector('a')?.getAttribute('href') ?? null])`))
        for (const [name, href] of Object.entries(expected)) if (tiles[name] !== href) wrong.push(`${slug}: ${name} ${tiles[name]} ≠ ${href}`)
      }
      check('Bahan resep event tertaut: ikan event → /wildlife/fish/…, tanaman/collectible event → detailnya, resep → /recipes/…', wrong.length === 0, wrong.join('; '))
      await go('/recipes/prickly-pear-black-garfish-soup')
      await evaluate(`[...document.querySelectorAll('.item-tile a')].find(a => a.textContent.includes('Black Garfish'))?.click()`); await sleep(1200)
      let page = await evaluate(`({ path: location.pathname, title: document.querySelector('h1')?.textContent.trim() })`)
      check('Klik bahan Black Garfish (ikan event) membuka detail ikannya', page.path === '/wildlife/fish/black-garfish' && page.title === 'Black Garfish', page.path)
      await go('/recipes/wild-burdock-celtuce-taco')
      await evaluate(`[...document.querySelectorAll('.item-tile a')].find(a => a.textContent.includes('Burdock'))?.click()`); await sleep(1200)
      page = await evaluate(`({ path: location.pathname, title: document.querySelector('h1')?.textContent.trim() })`)
      check('Klik bahan Burdock (collectible event) membuka detail collectible-nya', page.path === '/collectibles/burdock' && page.title === 'Burdock', page.path)

      let e = await openEvent('mooncake')
      check('Detail resep event (Mooncake): badge kategori Autumn Moon Treasury (🍂), tanpa status event', e.tag === 'Autumn Moon Treasury' && e.tagEmoji === '🍂' && !e.status, e.tag)
      e = await openEvent('prickly-pear-golden-garfish-soup')
      check('Prickly Pear & Golden Garfish Soup: harga jual per bintang tidak ada di sumber ("Sell Price 0") → "—" semua', e.market.join() === dash.join(), e.market.join(' / '))
      await go('/recipes/raspberry-frosted-pancake')
      const pancake = await evaluate(`[...document.querySelectorAll('.ingredient-group .item-tile__name')].map((n) => n.textContent)`)
      check('Raspberry Frosted Pancake: bahan "Frosted" yang tercantum dua kali di sumber tampil apa adanya', pancake.join() === 'Frosted,Frosted,Egg,Raspberry', pancake.join(', '))
      for (const slug of ['retriever-canele', 'retriever-con-panna']) {
        check(`${slug}: deskripsi salah salin (menyebut maltese) → null, tampil "Deskripsi belum tersedia."`, await hiddenDescription(slug))
      }
      const qiaogou = await shownDescription('qiaogou')
      check('Qiaogou: deskripsi tetap tampil, tanpa potongan kata "Chi"', qiaogou.ok && !/\bChi\b/.test(qiaogou.text), qiaogou.text)
    }
  }

  const problems = tab.logs.filter((line) => !/\[vite\] connect|React DevTools/.test(line))
  check('Console bersih selama uji', problems.length === 0, problems.join(' | '))
  await tab.close()
  return results
}

async function main() {
  try {
    await fetch(`${BASE_URL}/wildlife/fish`)
  } catch {
    throw new Error(`Dev server tidak bisa dibuka di ${BASE_URL}. Jalankan "npm run dev" dulu.`)
  }
  const chrome = await startChrome()
  let failed = 0
  let total = 0
  try {
    for (const [slug, kind] of Object.entries(KINDS)) {
      if (ONLY_KINDS.length && !ONLY_KINDS.includes(slug)) continue
      for (const width of WIDTHS.length ? WIDTHS : [1280, 820, 390]) {
        console.log(`\n=== ${kind.name} — lebar ${width}px`)
        const results = await runSuite(width, kind)
        total += results.length
        failed += results.filter((ok) => !ok).length
      }
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
