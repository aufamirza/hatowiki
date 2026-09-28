import { Link, useLocation, useParams } from 'react-router-dom'
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
import { usePageTitle } from '../../hooks/usePageTitle'
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
  // Kalau dibuka dari daftar, kembali ke daftar dengan pencarian/filter yang sama.
  const listHref = `/recipes${location.state?.listSearch ?? ''}`
  usePageTitle(recipe ? recipe.name : 'Resep tidak ditemukan')

  if (!recipe) {
    return (
      <NotFoundPage
        title="Resep tidak ditemukan"
        message="Resep ini belum ada di database kami, atau alamatnya salah ketik."
        backTo="/recipes"
        backLabel={`Lihat daftar ${RECIPE_KIND.name}`}
      />
    )
  }

  const category = RECIPE_CATEGORIES[recipe.category]
  const hasBuffs = Boolean(recipe.buffs?.length)

  return (
    <div className="container page entry-detail" data-wildlife="recipes">
      <Breadcrumbs
        items={[
          { label: 'Beranda', to: '/' },
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
              <span className="visually-hidden">Kategori: </span>
              {category && <span aria-hidden="true">{category.emoji}</span>}
              {recipe.category}
            </p>
          )}
          {recipe.description ? (
            <p className="entry-detail__description">{recipe.description}</p>
          ) : (
            <p className="entry-detail__description is-missing">Deskripsi belum tersedia.</p>
          )}
        </section>

        {/* Kotak 1 — gambar dengan badge level, dan harga jual per kualitas */}
        <section className="panel panel--hero" aria-label={`Gambar, level, dan harga jual ${recipe.name}`}>
          <div className="hero-layout hero-layout--recipe">
            <div className="entry-stage">
              <EntryImage src={recipe.image} alt={recipe.name} className="entry-stage__image" loading="eager" size={recipe.imageSize} />
              {recipe.level != null && (
                <p className="stage-level" style={levelToneStyle(recipe.level)}>
                  <span aria-hidden="true">Lv. {recipe.level}</span>
                  <span className="visually-hidden">Syarat level {recipe.level}</span>
                </p>
              )}
            </div>
            <div className="market">
              <h2 className="market__title">
                <Coins aria-hidden="true" />
                {RECIPE_KIND.priceLabel}
                <span className="market__hint">per kualitas</span>
              </h2>
              <MarketValue values={recipe.marketValue} uncertain={recipe.uncertain?.marketValue} />
            </div>
          </div>
        </section>

        {/* Kotak 3 — energi per kualitas; buff hanya kalau ada datanya */}
        <section className="panel panel--energy" aria-labelledby="entry-energy">
          <PanelTitle icon={Zap} id="entry-energy">
            {hasBuffs ? 'Energi & Buff' : 'Energi'}
            <span className="panel__hint">per kualitas</span>
          </PanelTitle>
          <MarketValue
            values={recipe.energy}
            uncertain={recipe.uncertain?.energy}
            icon={Zap}
            iconClassName="market-value__energy"
            format={formatEnergy}
            unit="energi"
          />
          {recipe.energy == null && <p className="panel__note">Energi resep ini belum tercantum di sumber.</p>}
          {hasBuffs && (
            <ul className="recipe-buffs" aria-label="Buff">
              {recipe.buffs.map((buff) => (
                <li key={buff}>{buff}</li>
              ))}
            </ul>
          )}
        </section>

        {/* Kotak 4 — bahan: tetap (dengan jumlah) dan pilihan (pilih N, boleh dicampur) */}
        <section className="panel panel--ingredients" aria-labelledby="entry-ingredients">
          <PanelTitle icon={ShoppingBasket} id="entry-ingredients">
            Bahan
          </PanelTitle>
          {recipe.ingredients.length ? (
            <div className="ingredient-groups">
              {recipe.ingredients.map((group, index) =>
                group.type === 'fixed' ? (
                  <div key={index} className="ingredient-group">
                    <h3 className="ingredient-group__title">Bahan tetap</h3>
                    <p className="ingredient-group__hint">Pakai semua bahan ini.</p>
                    <ItemList entries={group.items.map(({ item, quantity }) => ({ id: item, quantity }))} />
                  </div>
                ) : (
                  <div key={index} className="ingredient-group ingredient-group--choose">
                    <h3 className="ingredient-group__title">{`Pilih ${group.count} dari bahan berikut`}</h3>
                    <p className="ingredient-group__hint">Boleh dicampur.</p>
                    <ItemList entries={group.options.map((id) => ({ id }))} />
                  </div>
                ),
              )}
            </div>
          ) : (
            <p className="entry-detail__description is-missing">Bahan resep ini tidak tercantum di sumber.</p>
          )}
        </section>
      </div>

      <footer className="entry-detail__footer">
        <Link to={listHref} className="btn btn--ghost">
          <ArrowLeft aria-hidden="true" />
          {`Kembali ke daftar ${RECIPE_KIND.name}`}
        </Link>
        <p className="source-credit">
          Sumber data:{' '}
          <a href={recipe.source} target="_blank" rel="noopener noreferrer">
            Heartodex — {recipe.name}
            <ExternalLink aria-hidden="true" />
            <span className="visually-hidden"> (membuka tab baru)</span>
          </a>
        </p>
      </footer>
    </div>
  )
}

export default RecipeDetailPage
