import { CookingPot, PawPrint } from 'lucide-react'
import PanelTitle from '../../components/PanelTitle'
import LinkTileList from '../../components/items/LinkTileList'
import { animalsFavoringItem, recipesUsingItem } from '../../data/itemUsage'

// Keterangan cara pakai di resep: bahan tetap (dengan jumlah) atau salah satu pilihan di kelompok "pilih N".
function useText(uses) {
  return uses.map((use) => (use.type === 'fixed' ? `Bahan tetap x${use.quantity}` : `Bahan pilihan (pilih ${use.count})`)).join(' · ')
}

/**
 * Kotak "Dipakai di resep" dan "Makanan favorit hewan" di halaman detail tanaman, collectible & bahan masak. Keduanya dihitung dari
 * data resep dan hewan Hatowiki (src/data/itemUsage.js). "Dipakai di resep" selalu tampil (dengan keterangan kalau
 * kosong); "Makanan favorit hewan" hanya kalau ada hewan yang menyukainya.
 */
export function getItemUsage(itemId) {
  return { recipes: recipesUsingItem(itemId), animals: animalsFavoringItem(itemId) }
}

export function RecipeUsagePanel({ usage, name }) {
  return (
    <section className="panel panel--recipes" aria-labelledby="entry-recipes">
      <PanelTitle icon={CookingPot} id="entry-recipes">
        Dipakai di resep
        {usage.recipes.length > 0 && <span className="panel__hint">{`${usage.recipes.length} resep`}</span>}
      </PanelTitle>
      {usage.recipes.length ? (
        <LinkTileList
          label={`Resep yang memakai ${name}`}
          entries={usage.recipes.map(({ recipe, uses }) => ({
            key: recipe.slug,
            href: `/recipes/${recipe.slug}`,
            image: recipe.image,
            imageSize: recipe.imageSize,
            name: recipe.name,
            meta: `Lv. ${recipe.level ?? '—'} · ${useText(uses)}`,
          }))}
        />
      ) : (
        <p className="entry-detail__description is-missing">{`Belum ada resep di Hatowiki yang memakai ${name}.`}</p>
      )}
    </section>
  )
}

export function AnimalUsagePanel({ usage, name }) {
  if (!usage.animals.length) return null
  return (
    <section className="panel panel--animals" aria-labelledby="entry-animals">
      <PanelTitle icon={PawPrint} id="entry-animals">
        Makanan favorit hewan
      </PanelTitle>
      <LinkTileList
        label={`Hewan yang menyukai ${name}`}
        entries={usage.animals.map((animal) => ({
          key: animal.slug,
          href: `/wildlife/animals/${animal.slug}`,
          image: animal.image,
          imageSize: animal.imageSize,
          name: animal.name,
          meta: animal.locations.map((location) => location.name).join(', '),
        }))}
      />
    </section>
  )
}
