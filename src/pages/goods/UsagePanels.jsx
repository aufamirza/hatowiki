import { CookingPot, PawPrint } from 'lucide-react'
import PanelTitle from '../../components/PanelTitle'
import LinkTileList from '../../components/items/LinkTileList'
import { animalsFavoringItem, recipesUsingItem } from '../../data/itemUsage'
import { useI18n } from '../../i18n/I18nProvider'

// Keterangan cara pakai di resep: bahan tetap (dengan jumlah) atau salah satu pilihan di kelompok "pilih N".
function useText(uses, t) {
  return uses
    .map((use) => (use.type === 'fixed' ? t('goods.useFixed', { quantity: use.quantity }) : t('goods.useChoose', { count: use.count })))
    .join(' · ')
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
  const { t } = useI18n()
  return (
    <section className="panel panel--recipes" aria-labelledby="entry-recipes">
      <PanelTitle icon={CookingPot} id="entry-recipes">
        {t('goods.usedIn')}
        {usage.recipes.length > 0 && <span className="panel__hint">{t('goods.recipeCount', { count: usage.recipes.length })}</span>}
      </PanelTitle>
      {usage.recipes.length ? (
        <LinkTileList
          label={t('goods.recipesUsing', { name })}
          entries={usage.recipes.map(({ recipe, uses }) => ({
            key: recipe.slug,
            href: `/recipes/${recipe.slug}`,
            image: recipe.image,
            imageSize: recipe.imageSize,
            name: recipe.name,
            meta: t('goods.recipeMeta', { level: recipe.level ?? '—', uses: useText(uses, t) }),
          }))}
        />
      ) : (
        <p className="entry-detail__description is-missing">{t('goods.noRecipes', { name })}</p>
      )}
    </section>
  )
}

export function AnimalUsagePanel({ usage, name }) {
  const { t } = useI18n()
  if (!usage.animals.length) return null
  return (
    <section className="panel panel--animals" aria-labelledby="entry-animals">
      <PanelTitle icon={PawPrint} id="entry-animals">
        {t('goods.favoredBy')}
      </PanelTitle>
      <LinkTileList
        label={t('goods.animalsLiking', { name })}
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
