import { CATALOGS } from '../layout/catalogs'

/**
 * Indeks pencarian global: nama semua entri di semua katalog (ikan, serangga, burung, hewan, resep, tanaman,
 * collectible), termasuk entri event.
 * Datanya lokal (file data yang sudah dimuat aplikasi), jadi pencarian berjalan langsung di browser.
 */

// Huruf kecil tanpa diakritik; tanda kutip dibuang ("Alexandra's" = "alexandras"), tanda baca lain jadi spasi.
export function normalizeSearchText(text) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('en')
    .replace(/['’]/g, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
}

const INDEX = CATALOGS.flatMap((catalog) =>
  catalog.entries.map((entry) => ({
    id: `${catalog.slug}/${entry.slug}`,
    name: entry.name,
    normalized: normalizeSearchText(entry.name),
    catalog,
    href: catalog.href(entry),
    image: entry.image,
    imageSize: entry.imageSize ?? [400, 400],
  })),
)

/**
 * Cari nama yang mengandung `query`. Urutan: nama yang diawali kata kunci, lalu yang salah satu katanya diawali
 * kata kunci, lalu sisanya; di tiap tingkat A–Z.
 * @returns {{ items: object[], total: number }} `items` paling banyak `limit` hasil teratas
 */
export function searchCatalogs(query, limit = 8) {
  const needle = normalizeSearchText(query)
  if (!needle) return { items: [], total: 0 }
  const matches = []
  for (const item of INDEX) {
    const at = item.normalized.indexOf(needle)
    if (at < 0) continue
    const rank = at === 0 ? 0 : item.normalized[at - 1] === ' ' ? 1 : 2
    matches.push({ item, rank })
  }
  matches.sort((a, b) => a.rank - b.rank || a.item.name.localeCompare(b.item.name, 'en'))
  return { items: matches.slice(0, limit).map((match) => match.item), total: matches.length }
}
