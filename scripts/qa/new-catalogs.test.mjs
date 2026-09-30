#!/usr/bin/env node
/**
 * Uji katalog Achievements, Items, dan NPCs beserta tautan NPC, di Chrome headless (lewat Chrome DevTools Protocol):
 * - Data: jumlah entri = konstanta *_TOTAL_IN_GAME (70 / 23 / 19), validator tanpa masalah, semua entri di section Base
 *   Game, tiap barang dagangan NPC mengarah ke item yang ada (harga bilangan bulat atau null), tiap item punya penjual
 *   menurut data NPC, achievement tersembunyi ditandai `hidden` dengan title null, tanpa tanda pisah panjang di
 *   terjemahan Indonesia/Thai dan teks antarmuka katalog baru.
 * - Halaman daftar /achievements, /items, /npcs: jumlah kartu = data, filter kategori hobi / lokasi, pencarian (title
 *   hadiah untuk achievement, peran untuk NPC), urutan A–Z; kartu achievement tersembunyi tidak membocorkan tujuannya.
 * - Detail achievement: tujuan & hadiah dari data; tujuan achievement tersembunyi buram dan disembunyikan dari pembaca
 *   layar sampai tombolnya diklik, lalu bisa disembunyikan lagi.
 * - Detail item (semua 23): harga, "Dijual oleh" berisi tautan ke semua NPC penjualnya (dihitung dari data NPC); klik
 *   tautan membuka halaman NPC.
 * - Detail NPC (semua 19): peran, lokasi, pin di peta kalau ada `mapPin` (kalau tidak, zona), hadiah favorit (tertaut
 *   hanya yang ada di GIFT_LINKS), barang yang dijual tertaut ke halaman item dengan harganya; klik barang membuka item.
 * - Tautan NPC di katalog lain: "Didapat dari" bahan masak menautkan nama NPC (Toko Massimo → /npcs/massimo) di tiga
 *   bahasa; bahan/tanaman/collectible yang tidak dijual NPC tidak menampilkan "Dijual oleh".
 * - Navigasi: menu Wiki (desktop) atau drawer (ponsel) memuat Items, NPCs, Achievements dengan jumlah entri; pencarian
 *   global menemukan NPC, item, dan achievement; kartu bento beranda memuat ketiganya dengan jumlah dari data.
 * - Bahasa: deskripsi Thai/Inggris dari berkas terjemahan, label hadiah favorit diterjemahkan, peran tetap Inggris.
 * - Tidak ada error di console selama uji.
 *
 * Pemakaian (dev server harus sudah jalan):
 *   npm run dev
 *   node scripts/qa/new-catalogs.test.mjs          → lebar 1280
 *   node scripts/qa/new-catalogs.test.mjs 390      → lebar tertentu
 *
 * Variabel lingkungan: BASE_URL (bawaan http://localhost:5173), CHROME_PATH (lokasi Chrome/Edge).
 */
import { openTab, sleep, startChrome } from './cdp.mjs'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173'
const WIDTHS = process.argv.slice(2).map(Number).filter(Boolean)
const PORT = 9940 + Math.floor(Math.random() * 40)
const DASH = /[—―]/

// Data dari modul aplikasi (lewat dev server), dipakai sebagai pembanding.
const LOAD = `
  const [{ achievements, ACHIEVEMENTS_TOTAL_IN_GAME }, { hobbyItems, HOBBY_ITEMS_TOTAL_IN_GAME }, { npcs, NPCS_TOTAL_IN_GAME }, { sellersOf },
    { GIFT_LINKS }, { findAchievementProblems }, { findHobbyItemProblems }, { findNpcProblems }, { ingredients }] = await Promise.all([
    '/src/data/achievements/achievements.js', '/src/data/hobbyItems/hobbyItems.js', '/src/data/npcs/npcs.js', '/src/data/npcSales.js',
    '/src/data/npcs/giftLinks.js', '/src/data/achievements/validateAchievements.js', '/src/data/hobbyItems/validateHobbyItems.js',
    '/src/data/npcs/validateNpcs.js', '/src/data/ingredients/ingredients.js',
  ].map((p) => import(p)))
`

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

  const go = async (route, wait = 1600) => {
    await send('Page.navigate', { url: BASE_URL + route })
    await sleep(wait)
  }
  const path = () => evaluate('location.pathname')
  const listState = () => evaluate(`(() => ({
    shown: Number(document.querySelector('.list-status__count strong')?.textContent),
    cards: [...document.querySelectorAll('.entry-grid .entry-card')].map((card) => ({
      name: card.querySelector('.entry-card__name-text').textContent,
      href: card.getAttribute('href'),
      facts: [...card.querySelectorAll('.entry-card__facts li')].map((li) => li.getAttribute('title')),
    })),
  }))()`)

  // ================= 1. Data =================
  await go('/')
  const data = await evaluate(`(async () => {
    ${LOAD}
    const itemSlugs = new Set(hobbyItems.map((item) => item.slug))
    const offers = npcs.flatMap((npc) => npc.shop.map((offer) => ({ npc: npc.slug, ...offer })))
    const translations = {}
    for (const kind of ['achievements', 'items', 'npcs']) {
      for (const lang of ['id', 'th']) translations[kind + '.' + lang] = (await import('/scripts/translations/' + kind + '.' + lang + '.json')).default
    }
    const messages = Object.fromEntries(await Promise.all(['id', 'th', 'en'].map(async (lang) => [lang, (await import('/src/i18n/messages/' + lang + '.json')).default])))
    const pick = (m) => JSON.stringify([m.kinds.items, m.kinds.npcs, m.kinds.achievements, m.achievement, m.item, m.npc, m.giftLabels])
    return {
      counts: [achievements.length, ACHIEVEMENTS_TOTAL_IN_GAME, hobbyItems.length, HOBBY_ITEMS_TOTAL_IN_GAME, npcs.length, NPCS_TOTAL_IN_GAME],
      problems: [...findAchievementProblems(achievements), ...findHobbyItemProblems(hobbyItems), ...findNpcProblems(npcs)].map((p) => p.slug + ': ' + p.problems.join('; ')),
      sections: [...new Set([...achievements, ...hobbyItems, ...npcs].map((entry) => entry.section))],
      offers: offers.length,
      badOffers: offers.filter((offer) => !offer.item || !itemSlugs.has(offer.item.split('/')[1]) || !(offer.price === null || Number.isInteger(offer.price))).map((offer) => offer.npc + ':' + offer.name),
      unsold: hobbyItems.filter((item) => !sellersOf('items/' + item.slug).length).map((item) => item.slug),
      hidden: achievements.filter((a) => a.hidden).map((a) => a.slug + ':' + a.rewardTitle),
      hiddenByName: achievements.filter((a) => /^Hidden Achievement/.test(a.name)).map((a) => a.slug),
      dashes: [
        ...[...achievements, ...hobbyItems, ...npcs].filter((entry) => ${DASH}.test(entry.description ?? '')).map((entry) => 'id:' + entry.slug),
        ...Object.entries(translations).flatMap(([file, table]) => Object.entries(table).filter(([key, text]) => key !== '_meta' && ${DASH}.test(typeof text === 'string' ? text : text.text)).map(([key]) => file + ':' + key)),
        ...Object.entries(messages).filter(([, m]) => ${DASH}.test(pick(m))).map(([lang]) => 'ui:' + lang),
      ],
    }
  })()`)
  check('Data: 70 achievement, 23 item, 19 NPC, sama dengan *_TOTAL_IN_GAME', JSON.stringify(data.counts) === JSON.stringify([70, 70, 23, 23, 19, 19]), data.counts.join('/'))
  check('Data: validator tanpa masalah, semua entri di section Base Game (sumber tidak punya section event)', data.problems.length === 0 && data.sections.join() === 'Base Game', [...data.problems.slice(0, 3), data.sections.join()].join(' | '))
  check(`Data: ${data.offers} barang dagangan NPC semuanya item yang ada di katalog Items, harga bilangan bulat atau null`, data.offers > 0 && data.badOffers.length === 0, data.badOffers.join(', '))
  check('Data: setiap item punya NPC penjual menurut data NPC', data.unsold.length === 0, data.unsold.join(', '))
  check('Data: achievement tersembunyi = yang di sumber bernama "Hidden Achievement N", ditandai hidden dengan title null',
    data.hidden.length > 0 && data.hidden.length === data.hiddenByName.length && data.hidden.every((row) => row.endsWith(':null')), data.hidden.join(', '))
  check('Teks: tanpa tanda pisah panjang di terjemahan Indonesia & Thai dan teks antarmuka katalog baru', data.dashes.length === 0, data.dashes.slice(0, 5).join(', '))

  // ================= 2. Halaman daftar =================
  const lists = await evaluate(`(async () => {
    ${LOAD}
    return {
      fishing: achievements.filter((a) => a.category === 'Fishing').length,
      gardening: hobbyItems.filter((i) => i.category === 'Gardening').length,
      central: npcs.filter((n) => n.locations.some((l) => l.name === 'Central Square')).length,
      mentors: npcs.filter((n) => /mentor/i.test(n.name + ' ' + n.role)).map((n) => n.name).sort(),
      azAchievement: [...achievements].sort((a, b) => a.name.localeCompare(b.name, 'en'))[0].name,
      hidden: achievements.find((a) => a.hidden),
      sellers: Object.fromEntries(hobbyItems.map((item) => [item.name, sellersOf('items/' + item.slug).map(({ npc }) => npc.name).join(', ')])),
    }
  })()`)
  await go('/achievements')
  let list = await listState()
  check('Daftar Achievements: 70 kartu, tiap kartu tertaut ke /achievements/<slug>', list.shown === 70 && list.cards.length === 70 && list.cards.every((card) => /^\/achievements\/[a-z0-9-]+$/.test(card.href)), `${list.cards.length} kartu`)
  const hiddenCard = list.cards.find((card) => card.name === lists.hidden.name)
  check('Daftar Achievements: kartu achievement tersembunyi tidak menampilkan tujuan maupun title-nya',
    hiddenCard && hiddenCard.facts.some((fact) => fact.includes('Tujuan dirahasiakan')) && !hiddenCard.facts.some((fact) => fact.includes(lists.hidden.description.slice(0, 20))), hiddenCard?.facts.join(' | '))
  await go('/achievements?kategori=Fishing')
  list = await listState()
  check(`Daftar Achievements: filter kategori Fishing → ${lists.fishing} kartu`, list.cards.length === lists.fishing && list.shown === lists.fishing, `${list.cards.length}`)
  await go('/achievements?q=Shark%20Cage')
  list = await listState()
  check('Daftar Achievements: pencarian mencocokkan title hadiah ("Shark Cage" → Shark Frenzy)', list.cards.map((card) => card.name).join() === 'Shark Frenzy', list.cards.map((card) => card.name).join())
  await go('/achievements?urut=az')
  list = await listState()
  check('Daftar Achievements: urutan A–Z', list.cards[0]?.name === lists.azAchievement, list.cards[0]?.name)

  await go('/items')
  list = await listState()
  check('Daftar Items: 23 kartu dengan harga & penjual (dari data NPC)',
    list.cards.length === 23 && list.cards.every((card) => card.facts.some((fact) => fact.endsWith(lists.sellers[card.name]))), list.cards.slice(0, 2).map((card) => card.facts.join(' / ')).join(' | '))
  await go('/items?kategori=Gardening')
  list = await listState()
  check(`Daftar Items: filter kategori Gardening → ${lists.gardening} kartu`, list.cards.length === lists.gardening, `${list.cards.length}`)

  await go('/npcs')
  list = await listState()
  check('Daftar NPCs: 19 kartu dengan peran & lokasi', list.cards.length === 19 && list.cards.every((card) => card.facts.length === 2), list.cards[0]?.facts.join(' / '))
  await go('/npcs?lokasi=Central%20Square')
  list = await listState()
  check(`Daftar NPCs: filter lokasi Central Square → ${lists.central} kartu`, list.cards.length === lists.central, `${list.cards.length}`)
  await go('/npcs?q=mentor')
  list = await listState()
  check('Daftar NPCs: pencarian mencocokkan peran ("mentor")', list.cards.map((card) => card.name).sort().join() === lists.mentors.join(), list.cards.map((card) => card.name).join(', '))

  // ================= 3. Detail achievement =================
  await go('/achievements/shark-frenzy')
  const shark = await evaluate(`(() => ({
    name: document.querySelector('h1').textContent,
    category: document.querySelector('.category-tag')?.textContent,
    objective: document.querySelector('.panel--info .entry-detail__description')?.textContent,
    specs: [...document.querySelectorAll('.goods-specs .spec')].map((s) => s.querySelector('dt').textContent + '=' + s.querySelector('dd').textContent),
  }))()`)
  check('Detail achievement: nama, kategori, tujuan, dan title hadiah dari data',
    shark.name === 'Shark Frenzy' && shark.category.includes('Fishing') && shark.objective === 'Tangkap 3 hiu dari bayangan ikan yang bersinar keemasan dalam satu event Sea Fishing.' &&
      shark.specs.join() === 'Title=Shark Cage,Kategori hadiah=Achievement', JSON.stringify(shark))
  await go(`/achievements/${lists.hidden.slug}`)
  const spoiler = () => evaluate(`(() => {
    const text = document.querySelector('.spoiler__text')
    return {
      blur: text && getComputedStyle(text).filter, ariaHidden: text?.getAttribute('aria-hidden'), text: text?.textContent,
      reveal: document.querySelector('.spoiler__cover')?.textContent.trim() ?? null, hide: document.querySelector('.spoiler__hide')?.textContent.trim() ?? null,
      badge: document.querySelector('.achievement-hidden')?.textContent.trim(), title: document.querySelector('.goods-specs .spec dd')?.textContent,
    }
  })()`)
  let state = await spoiler()
  check('Achievement tersembunyi: tujuan buram & aria-hidden, tombol "Tampilkan tujuan", title "Dirahasiakan", penanda tersembunyi',
    state.blur?.includes('blur') && state.ariaHidden === 'true' && state.reveal === 'Tampilkan tujuan' && state.title === 'Dirahasiakan' && state.badge === 'Pencapaian tersembunyi' && state.text === lists.hidden.description,
    JSON.stringify(state))
  await evaluate(`document.querySelector('.spoiler__cover').click()`); await sleep(300)
  state = await spoiler()
  check('Achievement tersembunyi: klik → tujuan terlihat (tanpa blur, terbaca pembaca layar), ada tombol "Sembunyikan lagi"', state.blur === 'none' && state.ariaHidden === 'false' && state.reveal === null && state.hide === 'Sembunyikan lagi', JSON.stringify(state))
  await evaluate(`document.querySelector('.spoiler__hide').click()`); await sleep(300)
  state = await spoiler()
  check('Achievement tersembunyi: "Sembunyikan lagi" membuat tujuan buram kembali', state.blur?.includes('blur') && state.ariaHidden === 'true', state.blur)

  // ================= 4. Detail item =================
  const items = await evaluate(`(async () => { ${LOAD} return hobbyItems.map((item) => ({ slug: item.slug, name: item.name, price: item.price, sellers: sellersOf('items/' + item.slug).map(({ npc }) => '/npcs/' + npc.slug) })) })()`)
  const itemProblems = []
  for (const item of items) {
    await go(`/items/${item.slug}`, 1100)
    const page = await evaluate(`(() => {
      const specs = Object.fromEntries([...document.querySelectorAll('.goods-specs .spec')].map((s) => [s.querySelector('dt').textContent, s.querySelector('dd')]))
      return { name: document.querySelector('h1')?.textContent, price: specs['Harga']?.textContent, sold: [...(specs['Dijual oleh']?.querySelectorAll('a') ?? [])].map((a) => a.getAttribute('href')) }
    })()`)
    const price = item.price == null ? '—' : `${item.price.toLocaleString('id-ID')}koin`
    if (page.name !== item.name || page.price !== price || page.sold.join() !== item.sellers.join()) itemProblems.push(`${item.slug}: ${JSON.stringify(page)}`)
  }
  check('Detail item (23): nama, harga, dan "Dijual oleh" berisi tautan ke semua NPC penjual', itemProblems.length === 0, itemProblems.slice(0, 2).join(' | '))
  await go('/items/amazing-seasoning')
  await evaluate(`window.__spa = true; document.querySelector('.goods-specs a[href="/npcs/massimo"]').click()`); await sleep(1200)
  check('Detail item: klik penjual membuka halaman NPC-nya (tanpa memuat ulang)', (await path()) === '/npcs/massimo' && (await evaluate('window.__spa === true')), await path())

  // ================= 5. Detail NPC =================
  const npcRows = await evaluate(`(async () => {
    ${LOAD}
    const { getItem } = await import('/src/data/items.js')
    return npcs.map((npc) => ({
      slug: npc.slug, name: npc.name, role: npc.role, location: npc.locations[0]?.name ?? '—', pin: Boolean(npc.mapPin), zone: Boolean(npc.locations[0]?.zone),
      gifts: npc.favoriteGifts.map((gift) => GIFT_LINKS[gift] ?? null),
      shop: npc.shop.map((offer) => ({ href: offer.item ? '/' + offer.item : null, name: getItem(offer.item)?.name ?? offer.name, price: offer.price })),
    }))
  })()`)
  const npcProblems = []
  for (const npc of npcRows) {
    await go(`/npcs/${npc.slug}`, 1100)
    const page = await evaluate(`(() => ({
      name: document.querySelector('h1')?.textContent, role: document.querySelector('.npc-role')?.textContent.replace('Peran: ', ''),
      location: document.querySelector('.location-info__name')?.textContent,
      pin: !!document.querySelector('.location-map__pin'), zone: !!document.querySelector('.location-map__zone'),
      gifts: [...document.querySelectorAll('.gift-list li')].map((li) => li.querySelector('a')?.getAttribute('href') ?? null),
      shop: [...document.querySelectorAll('.panel--shop .item-tile')].map((tile) => ({ href: tile.querySelector('a')?.getAttribute('href') ?? null, name: tile.querySelector('.item-tile__name').textContent, meta: tile.querySelector('.item-tile__type').textContent })),
      empty: document.querySelector('.panel--shop .is-missing')?.textContent ?? null,
    }))()`)
    const shopOk = npc.shop.length
      ? JSON.stringify(page.shop.map(({ href, name }) => ({ href, name }))) === JSON.stringify(npc.shop.map(({ href, name }) => ({ href, name }))) &&
        page.shop.every((tile, i) => tile.meta.startsWith(npc.shop[i].price == null ? 'Harga belum tercantum' : `${npc.shop[i].price.toLocaleString('id-ID')} koin`))
      : page.shop.length === 0 && Boolean(page.empty)
    const mapOk = npc.pin ? page.pin && !page.zone : page.zone === npc.zone && !page.pin
    if (page.name !== npc.name || page.role !== npc.role || page.location !== npc.location || !mapOk || page.gifts.join() !== npc.gifts.join() || !shopOk) {
      npcProblems.push(`${npc.slug}: ${JSON.stringify(page)}`)
    }
  }
  check('Detail NPC (19): peran, lokasi, pin/zona peta, hadiah favorit (tertaut sesuai GIFT_LINKS), barang dijual tertaut ke item dengan harga', npcProblems.length === 0, npcProblems.slice(0, 2).join(' | '))
  await go('/npcs/massimo')
  await evaluate(`document.querySelector('.panel--shop a[href="/items/amazing-seasoning"]').click()`); await sleep(1200)
  check('Detail NPC: klik barang yang dijual membuka halaman item', (await path()) === '/items/amazing-seasoning', await path())
  await go('/npcs/vanya')
  const giftLink = await evaluate(`[...document.querySelectorAll('.gift-list a')].map((a) => a.textContent.trim() + '>' + a.getAttribute('href')).join()`)
  check('Detail NPC: hadiah favorit berupa jenis ditautkan ke daftarnya (Vanya: Ikan apa saja → Fish, Perlengkapan memancing → Items Fishing)',
    giftLink === 'Ikan apa saja>/wildlife/fish,Perlengkapan memancing>/items?kategori=Fishing', giftLink)

  // ================= 6. Tautan NPC di katalog lain =================
  const obtained = async (route) => {
    await go(route, 1100)
    return evaluate(`(() => {
      const dd =[...document.querySelectorAll('.goods-specs .spec')].find((s) => /Didapat|หาได้|Obtained/.test(s.querySelector('dt').textContent))?.querySelector('dd')
      return { text: dd?.firstChild ? [...dd.childNodes].filter((n) => !n.classList?.contains('spec__note')).map((n) => n.textContent).join('') : null, links: [...(dd?.querySelectorAll('a') ?? [])].map((a) => a.textContent + '>' + a.getAttribute('href')), soldBy: [...document.querySelectorAll('.goods-specs dt')].some((dt) => /Dijual oleh|ขายโดย|Sold by/.test(dt.textContent)) }
    })()`)
  }
  let found = await obtained('/ingredients/egg')
  check('Bahan masak: "Didapat dari" Toko Massimo → nama Massimo tertaut ke /npcs/massimo; tidak ada "Dijual oleh" (Massimo tidak menjual bahan di data NPC)',
    found.text === 'Toko Massimo' && found.links.join() === 'Massimo>/npcs/massimo' && !found.soldBy, JSON.stringify(found))
  found = await obtained('/ingredients/yellow-sugar')
  check('Bahan masak: Toko Doris → tautan /npcs/doris', found.links.join() === 'Doris>/npcs/doris', JSON.stringify(found))
  const eventShop = await evaluate(`(async () => { ${LOAD} return ingredients.find((i) => i.obtainedFrom && !/Massimo|Doris/.test(i.obtainedFrom.place))?.slug })()`)
  found = await obtained(`/ingredients/${eventShop}`)
  check('Bahan masak: tempat tanpa nama NPC (toko event) tidak bertaut', found.links.length === 0 && Boolean(found.text), `${eventShop}: ${found.text}`)
  found = await obtained('/th/ingredients/egg')
  const thLink = found.links.join()
  found = await obtained('/en/ingredients/egg')
  check('Bahan masak: tautan NPC mengikuti bahasa (/th/npcs/massimo, /en/npcs/massimo di "Massimo\'s store")',
    thLink === 'Massimo>/th/npcs/massimo' && found.links.join() === 'Massimo>/en/npcs/massimo' && found.text === "Massimo's store", `${thLink} · ${found.text} ${found.links.join()}`)
  let soldElsewhere = []
  for (const route of ['/crops/tomato', '/collectibles/apple']) {
    await go(route, 1100)
    if (await evaluate(`[...document.querySelectorAll('dt')].some((dt) => dt.textContent === 'Dijual oleh')`)) soldElsewhere.push(route)
  }
  check('Tanaman & collectible yang tidak dijual NPC tidak menampilkan "Dijual oleh"', soldElsewhere.length === 0, soldElsewhere.join())

  // ================= 7. Navigasi & pencarian =================
  if (desktop) {
    await go('/')
    await evaluate(`[...document.querySelectorAll('.nav-menu__button')].find((b) => b.textContent.trim() === 'Wiki').click()`); await sleep(400)
    const wiki = await evaluate(`[...document.querySelectorAll('.nav-menu__panel .nav-menu__link')].map((a) => a.querySelector('.nav-menu__name').textContent + '|' + a.querySelector('.nav-menu__meta').textContent + '>' + a.getAttribute('href')).slice(-3).join()`)
    check('Menu Wiki: Items, NPCs, Achievements dengan label & jumlah entri', wiki === 'Items|Benda Pakai · 23 entri>/items,NPCs|Penduduk Kota · 19 entri>/npcs,Achievements|Pencapaian · 70 entri>/achievements', wiki)
  } else {
    await go('/')
    await evaluate(`document.querySelector('.site-header .menu-button').click()`); await sleep(500)
    const drawer = await evaluate(`[...document.querySelectorAll('.drawer__panel .drawer__link')].map((a) => a.getAttribute('href')).slice(-3).join()`)
    check('Drawer: Items, NPCs, Achievements di grup Wiki', drawer === '/items,/npcs,/achievements', drawer)
    await evaluate(`document.querySelector('.drawer__close')?.click()`); await sleep(300)
  }
  const searchFirst = async (text) => {
    await go('/wildlife', 1300)
    await evaluate(`(() => {
      const box = document.querySelector('.site-header .global-search')
      const toggle = box.querySelector('.global-search__toggle')
      if (toggle && toggle.offsetParent && toggle.getAttribute('aria-expanded') !== 'true') toggle.click()
    })()`)
    await sleep(300)
    await evaluate(`document.querySelector('.site-header .global-search input').focus()`)
    await send('Input.insertText', { text })
    await sleep(600)
    return evaluate(`(() => { const o = document.querySelector('.site-header [role="option"]'); return o && (o.querySelector('.search-option__name').textContent + '|' + o.querySelector('.search-option__kind').textContent + '>' + o.getAttribute('href')) })()`)
  }
  const searches = [await searchFirst('Massimo'), await searchFirst('Shark Frenzy'), await searchFirst('Mermaid Perfume')]
  check('Pencarian global: NPC, achievement, dan item muncul dengan label kategori & tautan detailnya',
    searches[0] === 'Massimo|Penduduk Kota>/npcs/massimo' && searches[1] === 'Shark Frenzy|Pencapaian>/achievements/shark-frenzy' && searches[2] === 'Mermaid Perfume|Benda Pakai>/items/mermaid-perfume', searches.join(' · '))
  await go('/', 2000)
  const bento = await evaluate(`(async () => {
    document.querySelector('.category-grid').scrollIntoView(); await new Promise((r) => setTimeout(r, 600))
    return [...document.querySelectorAll('.category-card')].filter((c) => ['items', 'npcs', 'achievements'].includes(c.dataset.wildlife)).map((c) => c.getAttribute('href') + ':' + c.querySelector('.category-card__count strong').textContent).sort().join()
  })()`)
  check('Beranda: kartu bento Achievements (70), Items (23), NPCs (19) dengan tautan ke daftarnya', bento === '/achievements:70,/items:23,/npcs:19', bento)

  // ================= 8. Bahasa =================
  await go('/th/npcs/massimo')
  const th = await evaluate(`(() => ({ description: document.querySelector('.panel--ident .entry-detail__description')?.textContent, role: document.querySelector('.npc-role')?.lastChild.textContent, gifts: [...document.querySelectorAll('.gift-list li')].map((li) => li.textContent.trim()).join() }))()`)
  check('Thai: deskripsi NPC dari npcs.th.json, label hadiah favorit Thai, peran tetap Inggris',
    th.description === 'เชฟร้านอาหารและครูสอนทำอาหาร ใส่ใจในทุกจาน' && th.gifts === 'อาหารปรุงสำเร็จ,วัตถุดิบหายาก' && th.role === 'Cooking mentor', JSON.stringify(th))
  await go('/en/items/cat-food')
  const enItem = await evaluate(`document.querySelector('.panel--info .entry-detail__description')?.textContent`)
  await go('/en/achievements/foreman-beaver')
  const enAchievement = await evaluate(`document.querySelector('.panel--info .entry-detail__description')?.textContent`)
  check('Inggris: deskripsi item berbahasa Spanyol di sumber tampil terjemahan Inggrisnya; salah ketik "succesfully" dibetulkan',
    enItem === "Nutritious food for cats. Don't let your cat go hungry!" && enAchievement?.includes('successfully'), `${enItem} · ${enAchievement}`)
  await go('/th/achievements/hidden-achievement-1')
  const thSpoiler = await evaluate(`document.querySelector('.spoiler__cover')?.textContent.trim()`)
  check('Thai: tombol spoiler berbahasa Thai', thSpoiler === 'แสดงเป้าหมาย', thSpoiler)

  // ================= 9. Console =================
  const errors = tab.logs.filter((line) => /EXCEPTION|console\.error|\[i18n\]|\[data /.test(line) && !line.includes('[Vercel Web Analytics]'))
  check('Tidak ada error, teks i18n yang hilang, atau peringatan data di console', errors.length === 0, errors.slice(0, 3).join(' | '))

  await tab.close()
  return results
}

const chrome = await startChrome(PORT)
let all = []
try {
  for (const width of WIDTHS.length ? WIDTHS : [1280]) {
    console.log(`\n=== Achievements, Items, NPCs & tautan NPC — lebar ${width}px`)
    all = all.concat(await runSuite(width))
  }
} finally {
  chrome.stop()
}
const passed = all.filter(Boolean).length
console.log(`\n${passed}/${all.length} lulus`)
process.exitCode = passed === all.length ? 0 : 1
