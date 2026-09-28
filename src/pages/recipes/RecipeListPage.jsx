import CatalogListPage from '../catalog/CatalogListPage'
import RecipeCard from '../../components/recipes/RecipeCard'
import { RECIPE_KIND } from './recipeKind'
import './recipeTint.css'

// Halaman daftar resep (/recipes): pencarian nama resep & bahan, filter Level dan Kategori, urutan.
function RecipeListPage() {
  return (
    <CatalogListPage
      kind={RECIPE_KIND}
      tint="recipes"
      breadcrumbs={[{ label: 'Beranda', to: '/' }, { label: RECIPE_KIND.name }]}
      eyebrow={`Koleksi · ${RECIPE_KIND.hobby}`}
      renderCard={(recipe, linkState) => <RecipeCard recipe={recipe} linkState={linkState} />}
    />
  )
}

export default RecipeListPage
