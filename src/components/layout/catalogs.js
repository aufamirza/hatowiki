import { CookingPot } from 'lucide-react'
import { COLLECTIBLE_KIND, CROP_KIND, INGREDIENT_KIND } from '../../pages/goods/goodsKinds'
import { RECIPE_KIND } from '../../pages/recipes/recipeKind'
import { WILDLIFE_KINDS } from '../../pages/wildlife/wildlifeKinds'

/**
 * Semua katalog yang punya halaman, dipakai toolbar (menu Wildlife & Wiki, drawer seluler), pencarian global, dan
 * kartu kategori di beranda. Jumlah entri selalu dihitung dari `entries` (termasuk entri event), bukan ditulis manual.
 * - `slug`: kunci warna (data-wildlife, lihat wildlifeTints.css & recipeTint.css) sekaligus segmen URL.
 * - `href(entry?)`: halaman daftar, atau halaman detail kalau diberi entri.
 */
function wildlifeCatalog(slug) {
  const kind = WILDLIFE_KINDS[slug]
  return {
    slug,
    group: 'wildlife',
    name: kind.name,
    label: kind.label,
    noun: kind.noun,
    hobby: kind.hobby,
    description: kind.description,
    icon: kind.icon,
    entries: kind.entries,
    hasSchedule: kind.hasSchedule,
    href: (entry) => (entry ? `/wildlife/${slug}/${entry.slug}` : `/wildlife/${slug}`),
  }
}

export const WILDLIFE_CATALOGS = ['fish', 'bugs', 'birds', 'animals'].map(wildlifeCatalog)

export const RECIPE_CATALOG = {
  slug: 'recipes',
  group: 'recipes',
  name: RECIPE_KIND.name,
  label: RECIPE_KIND.label,
  noun: RECIPE_KIND.noun,
  hobby: RECIPE_KIND.hobby,
  description: 'Resep yang bisa kamu masak lewat hobi cooking, lengkap dengan bahan, energi, dan harga jualnya.',
  icon: CookingPot,
  entries: RECIPE_KIND.entries,
  hasSchedule: false,
  href: (entry) => (entry ? `/recipes/${entry.slug}` : '/recipes'),
}

// Tanaman, collectible & bahan masak (grup Wiki bersama resep).
function goodsCatalog(kind) {
  return {
    slug: kind.slug,
    group: 'wiki',
    name: kind.name,
    label: kind.label,
    noun: kind.noun,
    hobby: kind.hobby,
    description: kind.description,
    icon: kind.icon,
    entries: kind.entries,
    hasSchedule: false,
    href: kind.href,
  }
}

export const CROP_CATALOG = goodsCatalog(CROP_KIND)
export const COLLECTIBLE_CATALOG = goodsCatalog(COLLECTIBLE_KIND)
export const INGREDIENT_CATALOG = goodsCatalog(INGREDIENT_KIND)

// Isi menu "Wiki" di toolbar dan drawer: Resep, Crops, Collectibles, Ingredients.
export const WIKI_CATALOGS = [RECIPE_CATALOG, CROP_CATALOG, COLLECTIBLE_CATALOG, INGREDIENT_CATALOG]

export const CATALOGS = [...WILDLIFE_CATALOGS, ...WIKI_CATALOGS]
