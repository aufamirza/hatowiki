import CatalogListPage from '../catalog/CatalogListPage'
import RecipeCard from '../../components/recipes/RecipeCard'
import { useI18n } from '../../i18n/I18nProvider'
import { RECIPE_KIND } from './recipeKind'
import './recipeTint.css'

// Halaman daftar resep (/recipes): pencarian nama resep & bahan, filter Level dan Kategori, urutan.
function RecipeListPage() {
  const { t, kind } = useI18n()
  return (
    <CatalogListPage
      kind={RECIPE_KIND}
      tint="recipes"
      breadcrumbs={[{ label: t('common.home'), to: '/' }, { label: RECIPE_KIND.name }]}
      eyebrow={t('list.eyebrowCollection', { hobby: kind('recipes').hobby })}
      renderCard={(recipe, linkState) => <RecipeCard recipe={recipe} linkState={linkState} />}
    />
  )
}

export default RecipeListPage
