import { compareSections } from './events'
import { recipes } from './recipes/recipes'
import { animals } from './wildlife/animals'

/**
 * Kegunaan sebuah benda (id di src/data/items.js, mis. 'crops/tomato'), dihitung dari data resep dan hewan Hatowiki
 * sendiri (bukan disalin dari daftar "Recipes with this Crop" / "Culinary Uses" di Heartodex). Jadi resep atau hewan
 * yang belum ada di data belum ikut, dan otomatis ikut begitu ditambahkan.
 */

const byLevelAndName = (a, b) =>
  compareSections(a.recipe.section, b.recipe.section) ||
  (a.recipe.level ?? Infinity) - (b.recipe.level ?? Infinity) ||
  a.recipe.name.localeCompare(b.recipe.name, 'en')

/**
 * Resep yang memakai benda ini, beserta caranya: `fixed` (bahan tetap, dengan jumlah) atau `choose` (salah satu pilihan
 * di kelompok "pilih N"). Urut section, level, lalu nama.
 * @returns {{ recipe: object, uses: ({ type: 'fixed', quantity: number } | { type: 'choose', count: number })[] }[]}
 */
export function recipesUsingItem(itemId) {
  const found = []
  for (const recipe of recipes) {
    const uses = []
    for (const group of recipe.ingredients) {
      if (group.type === 'fixed') {
        for (const entry of group.items) if (entry.item === itemId) uses.push({ type: 'fixed', quantity: entry.quantity })
      } else if (group.options.includes(itemId)) {
        uses.push({ type: 'choose', count: group.count })
      }
    }
    if (uses.length) found.push({ recipe, uses })
  }
  return found.sort(byLevelAndName)
}

/** Hewan yang makanan favoritnya termasuk benda ini, urut seperti data hewan. */
export function animalsFavoringItem(itemId) {
  return animals.filter((animal) => animal.favoriteFood?.includes(itemId))
}
