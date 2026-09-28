import { Coins, Zap } from 'lucide-react'
import { RECIPE_CATEGORIES } from '../../data/recipes/categories'
import CatalogCard from '../catalog/CatalogCard'
import { formatCoins, formatEnergy, summarizeStars } from './starValues'

/**
 * Kartu resep di halaman daftar: gambar, nama, badge kategori & level (warna per level seperti wildlife), serta
 * rentang energi dan harga jual dari kualitas 1★ sampai 5★.
 */
function RecipeCard({ recipe, linkState }) {
  const facts = [
    { key: 'energy', label: 'Energi', Icon: Zap, ...summarizeStars(recipe.energy, formatEnergy, recipe.uncertain?.energy) },
    { key: 'price', label: 'Harga jual', Icon: Coins, ...summarizeStars(recipe.marketValue, formatCoins, recipe.uncertain?.marketValue) },
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
