import { CATALOGS, WILDLIFE_CATALOGS } from '../components/layout/catalogs'
import { PERIODS } from '../data/gameTime'
import { getItem } from '../data/items'
import { recipesUsingItem } from '../data/itemUsage'
import { sellersOf } from '../data/npcSales'
import { WEATHERS } from '../data/wildlife/attributes'
import { createTextTranslator, translateDataText } from '../i18n/format'
import { FALLBACK_LOCALE, LOCALES, getLocale, localizePath } from '../i18n/locales'
import idMessages from '../i18n/messages/id.json'
import { formatGrowthTime } from '../pages/goods/goodsKinds'

/**
 * Judul, deskripsi, alamat, dan data terstruktur (JSON-LD) tiap halaman untuk meta tag (SEO & pratinjau tautan), per
 * bahasa. Judul berformat "<nama> - Heartopia Wiki Indonesia" / "... - Heartopia Wiki ภาษาไทย" / "... - Heartopia Wiki |
 * Hatowiki" (messages meta.titlePage). Satu sumber untuk dua pemakai:
 * - browser: Layout memasangnya ke <head> setiap kali pindah halaman (src/seo/applyPageMeta.js);
 * - build: scripts/build-seo.mjs menulis satu HTML statis per halaman & bahasa (salinan index.html dengan meta tag yang
 *   sudah diisi, untuk crawler tanpa JavaScript seperti WhatsApp dan Discord) serta sitemap.xml.
 * Modul ini tidak memakai React maupun DOM. Deskripsi dibuat dari data dalam bahasa halamannya, paling panjang
 * MAX_DESCRIPTION karakter: kalimat pembuka (nama, jenis, level) selalu ada, keterangan lain ditambahkan menurut
 * prioritasnya selama masih muat. Nama entri, lokasi, dan istilah game tetap bahasa Inggris seperti di halamannya.
 */
export const SITE_URL = 'https://www.hatowiki.site'
export const MAX_DESCRIPTION = 160

const stripTrailingSlash = (route) => (route.length > 1 ? route.replace(/\/+$/, '') || '/' : route)

// Halaman alat yang bukan katalog (tanpa entri): Checklist.
const TOOL_ROUTES = ['/checklist']

/** Semua halaman yang ada (tanpa awalan bahasa): beranda, hub Wildlife, Checklist, tiap daftar, dan tiap detail. */
export function listRoutes() {
  return ['/', '/wildlife', ...TOOL_ROUTES, ...CATALOGS.flatMap((catalog) => [catalog.href(), ...catalog.entries.map((entry) => catalog.href(entry))])]
}

/** Halaman di balik sebuah route: beranda, hub, Checklist, daftar, detail, detail yang entrinya tidak ada, atau tidak dikenal. */
export function resolveRoute(path) {
  const route = stripTrailingSlash(path)
  if (route === '/') return { type: 'home', route }
  if (route === '/wildlife') return { type: 'hub', route }
  if (route === '/checklist') return { type: 'checklist', route }
  for (const catalog of CATALOGS) {
    const base = catalog.href()
    if (route === base) return { type: 'list', route, catalog }
    if (!route.startsWith(`${base}/`)) continue
    const slug = route.slice(base.length + 1)
    // Alamat yang lebih dalam dari halaman detail (mis. /recipes/a/b) tidak ada.
    if (slug.includes('/')) break
    const entry = catalog.entries.find((item) => item.slug === slug)
    return entry ? { type: 'detail', route, catalog, entry } : { type: 'missing', route, catalog }
  }
  return { type: 'notFound', route }
}

/** Alamat lengkap sebuah halaman untuk satu bahasa, mis. ('/recipes', 'th') → https://www.hatowiki.site/th/recipes. */
export function pageUrl(route, localeId) {
  return SITE_URL + localizePath(stripTrailingSlash(route), localeId)
}

/** Versi bahasa sebuah halaman untuk <link rel="alternate" hreflang>: tiap bahasa + x-default (versi Inggris). */
export function alternateLinks(route) {
  return [
    ...LOCALES.map((locale) => ({ hreflang: locale.hreflang, href: pageUrl(route, locale.id) })),
    { hreflang: 'x-default', href: pageUrl(route, FALLBACK_LOCALE) },
  ]
}

// ---------- potongan deskripsi ----------

// Daftar nama yang ringkas: paling banyak `max` nama, sisanya "+N".
function compactList(names, max) {
  const shown = names.slice(0, max).join(', ')
  return names.length > max ? `${shown} +${names.length - max}` : shown
}

// Rentang nilai per kualitas (1★–5★): "50–400"; satu nilai kalau semuanya sama; null kalau tidak ada angka sama sekali.
function rangeOf(values, format) {
  const known = (values ?? []).filter((value) => value != null)
  if (!known.length) return null
  const [low, high] = [Math.min(...known), Math.max(...known)]
  return low === high ? format(low) : `${format(low)}–${format(high)}`
}

// Nilai yang berlaku dari daftar tetap (periode, cuaca), urut seperti daftarnya; semuanya berlaku → teks "semua".
function availability(options, active, allText) {
  const on = options.map((option) => option.id).filter((id) => active?.includes(id))
  if (!on.length) return null
  return on.length === options.length ? allText : on.join(', ')
}

const itemName = (id) => getItem(id)?.name ?? id

// Bahan utama resep: bahan tetap (dengan jumlah kalau lebih dari satu); resep tanpa bahan tetap memakai pilihannya.
function mainIngredients(recipe) {
  const fixed = recipe.ingredients.filter((group) => group.type === 'fixed').flatMap((group) => group.items)
  if (fixed.length) return fixed.map(({ item, quantity }) => (quantity > 1 ? `${itemName(item)} x${quantity}` : itemName(item)))
  return (recipe.ingredients.find((group) => group.type === 'choose')?.options ?? []).map(itemName)
}

/**
 * Keterangan halaman detail per katalog, urut tampil. `priority` kecil = lebih dulu dipertahankan kalau tidak semuanya
 * muat. `value` null = datanya tidak ada, keterangannya dilewati.
 */
function detailFacts(catalog, entry, { t, formatNumber }) {
  // Resep: energi per kualitas (array); collectible: satu angka.
  const energyRange = Array.isArray(entry.energy) ? rangeOf(entry.energy, formatNumber) : null
  const locations = (entry.locations ?? (entry.location ? [{ name: entry.location }] : [])).map((location) => location.name)
  const location = { key: 'seo.location', value: locations.length ? compactList(locations, 2) : null }
  const usedIn = () => {
    const count = recipesUsingItem(`${catalog.slug}/${entry.slug}`).length
    return { key: 'seo.usedIn', value: count || null, vars: { count: formatNumber(count) } }
  }
  switch (catalog.slug) {
    case 'animals':
      return [
        { ...location, priority: 1 },
        { key: 'seo.favoriteWeather', value: availability(WEATHERS, entry.weather, t('card.allWeather')), priority: 3 },
        { key: 'seo.favoriteFood', value: entry.favoriteFood?.length ? compactList(entry.favoriteFood.map(itemName), 3) : null, priority: 2 },
      ]
    case 'recipes':
      return [
        { key: 'seo.energy', value: energyRange && `+${energyRange}`, priority: 1 },
        { key: 'seo.ingredients', value: compactList(mainIngredients(entry), 4) || null, priority: 2 },
        { key: 'seo.sellPrice', value: rangeOf(entry.marketValue, formatNumber), priority: 3 },
      ]
    case 'crops':
      return [
        { key: 'seo.seedPrice', value: entry.seedPrice == null ? null : formatNumber(entry.seedPrice), priority: 1 },
        { key: 'seo.growthTime', value: entry.growthTime == null ? null : formatGrowthTime(entry.growthTime, { t, formatNumber }), priority: 2 },
        { key: 'seo.sellPrice', value: rangeOf(entry.starValues?.find((row) => row.label === 'Market Value')?.values, formatNumber), priority: 3 },
        { ...usedIn(), priority: 4 },
      ]
    case 'collectibles':
      return [
        { ...location, priority: 1 },
        { key: 'seo.sellValue', value: entry.sellValue == null ? null : formatNumber(entry.sellValue), priority: 2 },
        { key: 'seo.energy', value: entry.energy == null ? null : `+${formatNumber(entry.energy)}`, priority: 4 },
        { ...usedIn(), priority: 3 },
      ]
    case 'ingredients': {
      const from = entry.obtainedFrom && [entry.obtainedFrom.place, entry.obtainedFrom.when].filter(Boolean).map((text) => t.dataText(text)).join(', ')
      return [
        { key: 'seo.buyPrice', value: entry.buyPrice == null ? null : formatNumber(entry.buyPrice), priority: 1 },
        { key: 'seo.obtainedFrom', value: from || null, priority: 2 },
        { ...usedIn(), priority: 3 },
      ]
    }
    case 'items':
      return [
        { key: 'seo.price', value: entry.price == null ? null : formatNumber(entry.price), priority: 1 },
        { key: 'seo.soldBy', value: sellersOf(`items/${entry.slug}`).map(({ npc }) => npc.name).join(', ') || null, priority: 2 },
      ]
    case 'npcs':
      return [
        { ...location, priority: 1 },
        { key: 'seo.shop', value: entry.shop.length ? compactList(entry.shop.map((offer) => (offer.item ? itemName(offer.item) : offer.name)), 3) : null, priority: 2 },
        { key: 'seo.gifts', value: entry.favoriteGifts.length ? entry.favoriteGifts.map((gift) => t.gift(gift)).join(', ') : null, priority: 3 },
      ]
    case 'achievements':
      // Tujuan achievement tidak dimasukkan: teksnya panjang, dan tujuan achievement tersembunyi tidak boleh bocor ke
      // hasil pencarian.
      return [
        entry.hidden
          ? { key: 'seo.hiddenAchievement', value: true, priority: 1 }
          : { key: 'seo.rewardTitle', value: entry.rewardTitle, priority: 1 },
      ]
    default:
      // Ikan, serangga, burung: lokasi, waktu muncul, cuaca, dan rentang harga jual (burung: harga jual Info Card).
      return [
        { ...location, priority: 1 },
        { key: 'seo.schedule', value: availability(PERIODS, entry.schedule, t('card.allTimes')), priority: 2 },
        { key: 'seo.weather', value: availability(WEATHERS, entry.weather, t('card.allWeather')), priority: 4 },
        { key: catalog.slug === 'birds' ? 'seo.infoCardPrice' : 'seo.sellPrice', value: rangeOf(entry.marketValue, formatNumber), priority: 3 },
      ]
  }
}

// Kalimat pembuka: nama, jenis, dan level (atau kategori hobi untuk item & achievement, peran untuk NPC).
function leadOf(catalog, entry, t) {
  const key = `kinds.${catalog.slug}`
  if (catalog.slug === 'items' || catalog.slug === 'achievements') {
    return entry.category == null ? t(`${key}.metaLeadNoCategory`, { name: entry.name }) : t(`${key}.metaLead`, { name: entry.name, category: entry.category })
  }
  if (catalog.slug === 'npcs') {
    return entry.role == null ? t(`${key}.metaLeadNoRole`, { name: entry.name }) : t(`${key}.metaLead`, { name: entry.name, role: entry.role })
  }
  return entry.level == null ? t(`${key}.metaLeadNoLevel`, { name: entry.name }) : t(`${key}.metaLead`, { name: entry.name, level: entry.level })
}

function detailDescription(catalog, entry, i18n) {
  const { t } = i18n
  const lead = leadOf(catalog, entry, t)
  const separator = t('seo.separator')
  const facts = detailFacts(catalog, entry, i18n)
    .filter((fact) => fact.value != null)
    .map((fact, order) => ({ order, priority: fact.priority, text: t(fact.key, { value: fact.value, ...fact.vars }) }))
  // Pilih menurut prioritas selama masih muat, lalu tampilkan lagi menurut urutan aslinya.
  let length = lead.length
  const kept = []
  for (const fact of [...facts].sort((a, b) => a.priority - b.priority)) {
    const next = length + separator.length + fact.text.length
    if (next > MAX_DESCRIPTION) continue
    length = next
    kept.push(fact)
  }
  return [lead, ...kept.sort((a, b) => a.order - b.order).map((fact) => fact.text)].join(separator)
}

// ---------- meta per halaman ----------

// Nama yang dipakai lebih dari satu entri di katalog berbeda (mis. Egg: resep & bahan masak). Judul halamannya diberi
// nama kategori dalam bahasa halaman, "Egg (Resep)" / "Egg (Recipes)", supaya tiap halaman punya judul sendiri.
const SHARED_NAMES = (() => {
  const counts = new Map()
  for (const catalog of CATALOGS) for (const entry of catalog.entries) counts.set(entry.name, (counts.get(entry.name) ?? 0) + 1)
  return new Set([...counts].filter(([, count]) => count > 1).map(([name]) => name))
})()

const entryTitle = (catalog, entry, t) => (SHARED_NAMES.has(entry.name) ? `${entry.name} (${t(`kinds.${catalog.slug}.label`)})` : entry.name)

function createI18n(localeId, messages) {
  const locale = getLocale(localeId)
  const number = new Intl.NumberFormat(locale.intl)
  const t = createTextTranslator(messages, idMessages)
  // Teks data Indonesia (tempat membeli bahan) → bahasa halaman; versi Indonesia tidak punya tabel, jadi apa adanya.
  t.dataText = (text) => translateDataText(text, locale.id === 'id' ? null : messages.dataText)
  // Label hadiah favorit NPC (bahasa Inggris di data) → bahasa halaman.
  t.gift = (label) => messages.giftLabels?.[label] ?? idMessages.giftLabels?.[label] ?? label
  return { t, formatNumber: (value) => number.format(value) }
}

// ---------- data terstruktur (JSON-LD) ----------

// Jalur halaman untuk BreadcrumbList, sama dengan breadcrumb di halamannya: Beranda > (Wildlife >) katalog > entri.
function breadcrumbTrail(page, t) {
  const home = { name: t('common.home'), route: '/' }
  const wildlife = { name: 'Wildlife', route: '/wildlife' }
  switch (page.type) {
    case 'hub':
      return [home, wildlife]
    case 'checklist':
      return [home, { name: t('checklist.title'), route: '/checklist' }]
    case 'list':
    case 'detail': {
      const { catalog } = page
      return [
        home,
        ...(WILDLIFE_CATALOGS.includes(catalog) ? [wildlife] : []),
        { name: catalog.name, route: catalog.href() },
        ...(page.type === 'detail' ? [{ name: page.entry.name, route: catalog.href(page.entry) }] : []),
      ]
    }
    default:
      return null
  }
}

/**
 * JSON-LD halaman: WebSite (nama situs & nama lain per bahasa, alamat beranda bahasanya) di semua halaman, ditambah
 * BreadcrumbList di halaman yang punya jalur. Tanpa SearchAction: pencarian global situs tidak bisa dibuka lewat URL
 * (hanya pencarian per katalog, mis. /recipes?q=…).
 */
function structuredData(page, localeId, t) {
  const home = pageUrl('/', localeId)
  const graph = [
    {
      '@type': 'WebSite',
      '@id': `${home}#website`,
      name: 'Hatowiki',
      alternateName: t('meta.siteAlternateName'),
      url: home,
      inLanguage: getLocale(localeId).hreflang,
    },
  ]
  const trail = breadcrumbTrail(page, t)
  if (trail) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: trail.map((step, index) => ({ '@type': 'ListItem', position: index + 1, name: step.name, item: pageUrl(step.route, localeId) })),
    })
  }
  return { '@context': 'https://schema.org', '@graph': graph }
}

/** JSON-LD sebagai teks untuk <script type="application/ld+json">; "<" ditulis sebagai escape Unicode supaya teks data tidak bisa menutup tag. */
export const serializeStructuredData = (data) => JSON.stringify(data).replace(/</g, '\\u003c')

/**
 * Meta tag satu halaman. `messages` = teks antarmuka bahasa itu (src/i18n/messages/<bahasa>.json).
 * `found` false = alamat tidak dikenal atau entrinya tidak ada (judul & pesan "tidak ditemukan").
 * @returns {{ found: boolean, lang: string, title: string, description: string, ogDescription: string, ogLocale: string,
 *   ogImageAlt: string, url: string, alternates: { hreflang: string, href: string }[], structuredData: object }}
 */
export function getPageMeta(path, localeId, messages) {
  const locale = getLocale(localeId)
  const i18n = createI18n(locale.id, messages)
  const { t, formatNumber } = i18n
  const page = resolveRoute(path)
  const pageTitle = (title) => t('meta.titlePage', { title })
  const countOf = (slug) => t(`kinds.${slug}.count`, { count: formatNumber(CATALOGS.find((catalog) => catalog.slug === slug).entries.length) })

  let title
  let description
  let ogDescription
  switch (page.type) {
    case 'home':
      title = t('meta.titleDefault')
      description = t('meta.description')
      ogDescription = t('meta.ogDescription')
      break
    case 'hub':
      title = pageTitle('Wildlife')
      description = t('wildlifeHub.metaDescription', { fish: countOf('fish'), bugs: countOf('bugs'), birds: countOf('birds'), animals: countOf('animals') })
      break
    case 'checklist':
      title = pageTitle(t('checklist.title'))
      description = t('checklist.metaDescription')
      break
    case 'list':
      title = pageTitle(t(`kinds.${page.catalog.slug}.listTitle`))
      description = t(`kinds.${page.catalog.slug}.metaList`, { count: formatNumber(page.catalog.entries.length) })
      break
    case 'detail':
      title = pageTitle(entryTitle(page.catalog, page.entry, t))
      description = detailDescription(page.catalog, page.entry, i18n)
      break
    case 'missing':
      title = pageTitle(t(`kinds.${page.catalog.slug}.notFoundTitle`))
      description = t(`kinds.${page.catalog.slug}.notFoundMessage`)
      break
    default:
      title = pageTitle(t('notFound.title'))
      description = t('notFound.message')
  }

  return {
    found: page.type !== 'missing' && page.type !== 'notFound',
    lang: locale.hreflang,
    title,
    description,
    ogDescription: ogDescription ?? description,
    ogLocale: locale.ogLocale,
    ogImageAlt: t('meta.ogImageAlt'),
    url: pageUrl(page.route, locale.id),
    alternates: alternateLinks(page.route),
    structuredData: structuredData(page, locale.id, t),
  }
}
