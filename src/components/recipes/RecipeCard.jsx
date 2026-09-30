import { Coins, Zap } from 'lucide-react'
import { RECIPE_CATEGORIES } from '../../data/recipes/categories'
import { useI18n } from '../../i18n/I18nProvider'
import CatalogCard from '../catalog/CatalogCard'
import { formatCoins, formatEnergy, summarizeStars } from './starValues'

/**
 * Kartu resep di halaman daftar: gambar, nama, badge kategori & level (warna per level seperti wildlife), serta
 * rentang energi dan harga jual dari kualitas 1★ sampai 5★.
 */
function RecipeCard({ recipe, linkState }) {
  const { t, formatNumber } = useI18n()
  const uncertain = t('common.uncertain')
  const energy = (value) => formatEnergy(value, formatNumber)
  const coins = (value) => formatCoins(value, formatNumber)
  const facts = [
    { key: 'energy', label: t('card.energy'), Icon: Zap, ...summarizeStars(recipe.energy, energy, recipe.uncertain?.energy, uncertain) },
    { key: 'price', label: t('common.sellPrice'), Icon: Coins, ...summarizeStars(recipe.marketValue, coins, recipe.uncertain?.marketValue, uncertain) },
  ]
  return (
    <CatalogCard
      to={`/recipes/${recipe.slug}`}
      linkState={linkState}
      image={recipe.image}
      imageSize={recipe.imageSize}
      name={recipe.name}
      category={recipe.category}
      categoryEmoji={RECIPE_CATEGORIES[recipe.category]?.emoji}
      level={recipe.level}
      facts={facts}
    />
  )
}

export default RecipeCard
