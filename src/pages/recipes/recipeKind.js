import { CookingPot } from 'lucide-react'
import { getItem } from '../../data/items'
import { RECIPE_CATEGORIES } from '../../data/recipes/categories'
import { RECIPES_TOTAL_IN_GAME, recipes } from '../../data/recipes/recipes'
import { SORT_OPTIONS } from '../catalog/listState'
import { buildRecipeOrder } from './recipeOrder'

// Semua id benda di bahan sebuah resep (bahan tetap dan semua opsi bahan pilihan).
export const recipeItemIds = (recipe) =>
  recipe.ingredients.flatMap((group) => (group.type === 'fixed' ? group.items.map((entry) => entry.item) : group.options))

/**
 * Konfigurasi halaman daftar resep untuk CatalogListPage. Filter mengikuti heartodex (Level, Kategori);
 * pencarian mencocokkan nama resep dan nama bahannya.
 */
// Posisi tiap resep di Urutan Default: satu jenis masakan (field family) selalu berdampingan.
const RECIPE_ORDER = buildRecipeOrder(recipes)

export const RECIPE_KIND = {
  slug: 'recipes',
  name: 'Recipes',
  label: 'Resep',
  noun: 'resep',
  icon: CookingPot,
  hobby: 'Hobi cooking',
  intro: 'Resep yang bisa kamu masak lewat hobi cooking. Pilih resep untuk melihat bahan, energi, dan harga jualnya.',
  entries: recipes,
  totalInGame: RECIPES_TOTAL_IN_GAME,
  entryCategories: RECIPE_CATEGORIES,
  sortOptions: SORT_OPTIONS,
  sortRank: (recipe) => RECIPE_ORDER.get(recipe.slug),
  searchLabel: 'Cari nama resep atau bahan',
  searchText: (recipe) => [recipe.name, ...recipeItemIds(recipe).map((id) => getItem(id)?.name ?? '')],
  filters: [
    {
      id: 'level',
      param: 'level',
      label: 'Level',
      values: (recipe) => (recipe.level == null ? [] : [String(recipe.level)]),
      compare: (a, b) => Number(a) - Number(b),
      optionLabel: (value) => `Level ${value}`,
      chipLabel: (value) => `Level ${value}`,
    },
    {
      id: 'category',
      param: 'kategori',
      label: 'Kategori',
      values: (recipe) => (recipe.category == null ? [] : [recipe.category]),
      compare: (a, b) => {
        const order = Object.keys(RECIPE_CATEGORIES)
        const rank = (value) => (order.includes(value) ? order.indexOf(value) : Infinity)
        return rank(a) - rank(b) || a.localeCompare(b, 'en')
      },
      emoji: (value) => RECIPE_CATEGORIES[value]?.emoji,
    },
  ],
  priceLabel: 'Harga jual',
}
