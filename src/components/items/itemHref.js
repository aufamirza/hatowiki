import { getCollectibleBySlug } from '../../data/collectibles/collectibles'
import { getCropBySlug } from '../../data/crops/crops'
import { getRecipeBySlug } from '../../data/recipes/recipes'
import { fish } from '../../data/wildlife/fish'
import { bugs } from '../../data/wildlife/bugs'
import { birds } from '../../data/wildlife/birds'

// Awalan id benda (= bagian URL di Heartodex) → kategori wildlife di Hatowiki.
const WILDLIFE_SEGMENTS = [
  { segment: 'fish', slug: 'fish', entries: fish },
  { segment: 'insects', slug: 'bugs', entries: bugs },
  { segment: 'birds', slug: 'birds', entries: birds },
]

// Awalan id benda → katalog Wiki dengan halaman detail sendiri.
const WIKI_SEGMENTS = {
  recipes: getRecipeBySlug,
  crops: getCropBySlug,
  collectibles: getCollectibleBySlug,
}

/**
 * Tautan internal sebuah benda (bahan resep / makanan hewan), atau null. Recipe, Crop, dan Collectible → halaman
 * detailnya (/recipes|crops|collectibles/<slug>); ikan, serangga, dan burung → /wildlife/<kategori>/<slug>. Tautan
 * hanya dibuat kalau entrinya ada di data Hatowiki, jadi entri yang ditambahkan nanti otomatis tertaut. Bahan generik
 * seperti "Any Fish" (`any/fish`) → halaman daftar kategorinya. Ingredient belum punya halaman, jadi tanpa tautan.
 */
export function itemHref(item) {
  const [segment, slug] = item.id.split('/')
  if (WIKI_SEGMENTS[segment]) return WIKI_SEGMENTS[segment](slug) ? `/${segment}/${slug}` : null
  if (segment === 'any') {
    const kind = WILDLIFE_SEGMENTS.find((entry) => entry.segment === slug || entry.slug === slug)
    return kind ? `/wildlife/${kind.slug}` : null
  }
  const kind = WILDLIFE_SEGMENTS.find((entry) => entry.segment === segment)
  return kind?.entries.some((entry) => entry.slug === slug) ? `/wildlife/${kind.slug}/${slug}` : null
}
