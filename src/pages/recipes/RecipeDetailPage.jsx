import { useLocation, useParams } from 'react-router-dom'
import { ArrowLeft, Coins, ExternalLink, ShoppingBasket, Zap } from 'lucide-react'
import Breadcrumbs from '../../components/Breadcrumbs'
import PanelTitle from '../../components/PanelTitle'
import { categoryToneStyle } from '../../components/catalog/categoryTone'
import ItemList from '../../components/items/ItemList'
import { formatEnergy } from '../../components/recipes/starValues'
import EntryImage from '../../components/wildlife/EntryImage'
import MarketValue from '../../components/wildlife/MarketValue'
import { levelToneStyle } from '../../components/wildlife/levelTone'
import { RECIPE_CATEGORIES } from '../../data/recipes/categories'
import { getRecipeBySlug } from '../../data/recipes/recipes'
import { useI18n } from '../../i18n/I18nProvider'
import { Link } from '../../i18n/LocaleLink'
import NotFoundPage from '../NotFoundPage'
import { RECIPE_KIND } from './recipeKind'
import '../wildlife/WildlifeDetailPage.css'
import './recipeTint.css'
import './RecipeDetailPage.css'

/**
 * Halaman detail satu resep dengan empat kotak: (1) gambar, badge level, dan harga jual per kualitas;
 * (2) nama, kategori, deskripsi; (3) energi per kualitas (buff hanya kalau sumbernya mencantumkan);
 * (4) bahan: bahan tetap beserta jumlahnya dan kelompok bahan pilihan. Bahan yang berupa resep lain ditautkan.
 * Resep tidak punya lokasi, jadwal, cuaca, maupun waktu server. Cooking Mastery tidak ditampilkan.
 */
function RecipeDetailPage() {
  const { slug } = useParams()
  const location = useLocation()
  const recipe = getRecipeBySlug(slug)
  const i18n = useI18n()
  const { t, formatNumber } = i18n
  const text = i18n.kind('recipes')
  // Kalau dibuka dari daftar, kembali ke daftar dengan pencarian/filter yang sama.
  const listHref = `/recipes${location.state?.listSearch ?? ''}`

  if (!recipe) {
    return (
      <NotFoundPage
        title={text.notFoundTitle}
        message={text.notFoundMessage}
        backTo="/recipes"
        backLabel={t('detail.seeList', { name: RECIPE_KIND.name })}
      />
    )
  }

  const category = RECIPE_CATEGORIES[recipe.category]
  const hasBuffs = Boolean(recipe.buffs?.length)
  const description = i18n.description('recipes', recipe)

  return (
    <div className="container page entry-detail" data-wildlife="recipes">
      <Breadcrumbs
        items={[
          { label: t('common.home'), to: '/' },
          { label: RECIPE_KIND.name, to: listHref },
          { label: recipe.name },
        ]}
      />

      <div className="entry-detail__grid entry-detail__grid--recipe">
        {/* Kotak 2 — identitas. Diletakkan pertama di DOM supaya nama terbaca paling awal. */}
        <section className="panel panel--info" aria-labelledby="entry-name">
          <p className="eyebrow">{RECIPE_KIND.name}</p>
          <h1 id="entry-name" className="entry-detail__name">
            {recipe.name}
          </h1>
          {recipe.category && (
            <p className="category-tag" style={categoryToneStyle(recipe.category)}>
              <span className="visually-hidden">{t('common.categoryPrefix')}</span>
              {category && <span aria-hidden="true">{category.emoji}</span>}
              {recipe.category}
            </p>
          )}
          {description ? (
            <p className="entry-detail__description">{description}</p>
          ) : (
            <p className="entry-detail__description is-missing">{t('detail.noDescription')}</p>
          )}
        </section>

        {/* Kotak 1 — gambar dengan badge level, dan harga jual per kualitas */}
        <section className="panel panel--hero" aria-label={t('recipe.hero', { name: recipe.name })}>
          <div className="hero-layout hero-layout--recipe">
            <div className="entry-stage">
              <EntryImage src={recipe.image} alt={recipe.name} className="entry-stage__image" loading="eager" size={recipe.imageSize} />
              {recipe.level != null && (
                <p className="stage-level" style={levelToneStyle(recipe.level)}>
                  <span aria-hidden="true">{t('common.levelShort', { level: recipe.level })}</span>
                  <span className="visually-hidden">{t('common.levelRequired', { level: recipe.level })}</span>
                </p>
              )}
            </div>
            <div className="market">
              <h2 className="market__title">
                <Coins aria-hidden="true" />
                {t('common.sellPrice')}
                <span className="market__hint">{t('common.perQuality')}</span>
              </h2>
              <MarketValue values={recipe.marketValue} uncertain={recipe.uncertain?.marketValue} />
            </div>
          </div>
        </section>

        {/* Kotak 3 — energi per kualitas; buff hanya kalau ada datanya */}
        <section className="panel panel--energy" aria-labelledby="entry-energy">
          <PanelTitle icon={Zap} id="entry-energy">
            {hasBuffs ? t('recipe.energyBuffs') : t('recipe.energy')}
            <span className="panel__hint">{t('common.perQuality')}</span>
          </PanelTitle>
          <MarketValue
            values={recipe.energy}
            uncertain={recipe.uncertain?.energy}
            icon={Zap}
            iconClassName="market-value__energy"
            format={(value) => formatEnergy(value, formatNumber)}
            unit={t('common.energy')}
          />
          {recipe.energy == null && <p className="panel__note">{t('recipe.noEnergy')}</p>}
          {hasBuffs && (
            <ul className="recipe-buffs" aria-label={t('recipe.buffs')}>
              {recipe.buffs.map((buff) => (
                <li key={buff}>{buff}</li>
              ))}
            </ul>
          )}
        </section>

        {/* Kotak 4 — bahan: tetap (dengan jumlah) dan pilihan (pilih N, boleh dicampur) */}
        <section className="panel panel--ingredients" aria-labelledby="entry-ingredients">
          <PanelTitle icon={ShoppingBasket} id="entry-ingredients">
            {t('recipe.ingredients')}
          </PanelTitle>
          {recipe.ingredients.length ? (
            <div className="ingredient-groups">
              {recipe.ingredients.map((group, index) =>
                group.type === 'fixed' ? (
                  <div key={index} className="ingredient-group">
                    <h3 className="ingredient-group__title">{t('recipe.fixed')}</h3>
                    <p className="ingredient-group__hint">{t('recipe.fixedHint')}</p>
                    <ItemList entries={group.items.map(({ item, quantity }) => ({ id: item, quantity }))} />
                  </div>
                ) : (
                  <div key={index} className="ingredient-group ingredient-group--choose">
                    <h3 className="ingredient-group__title">{t('recipe.choose', { count: group.count })}</h3>
                    <p className="ingredient-group__hint">{t('recipe.chooseHint')}</p>
                    <ItemList entries={group.options.map((id) => ({ id }))} />
                  </div>
                ),
              )}
            </div>
          ) : (
            <p className="entry-detail__description is-missing">{t('recipe.noIngredients')}</p>
          )}
        </section>
      </div>

      <footer className="entry-detail__footer">
        <Link to={listHref} className="btn btn--ghost">
          <ArrowLeft aria-hidden="true" />
          {t('detail.back', { name: RECIPE_KIND.name })}
        </Link>
        <p className="source-credit">
          {t('detail.source')}{' '}
          <a href={recipe.source} target="_blank" rel="noopener noreferrer">
            {t('detail.sourceLink', { name: recipe.name })}
            <ExternalLink aria-hidden="true" />
            <span className="visually-hidden">{t('common.newTab')}</span>
          </a>
        </p>
      </footer>
    </div>
  )
}

export default RecipeDetailPage
