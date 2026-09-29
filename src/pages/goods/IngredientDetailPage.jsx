import { useLocation, useParams } from 'react-router-dom'
import { Coins, MapPinned, Store } from 'lucide-react'
import Breadcrumbs from '../../components/Breadcrumbs'
import { formatCoins } from '../../components/recipes/starValues'
import EntryImage from '../../components/wildlife/EntryImage'
import { getIngredientBySlug } from '../../data/ingredients/ingredients'
import { usePageTitle } from '../../hooks/usePageTitle'
import NotFoundPage from '../NotFoundPage'
import { DetailFooter, IdentityPanel } from './GoodsDetailParts'
import { AnimalUsagePanel, RecipeUsagePanel, getItemUsage } from './UsagePanels'
import { INGREDIENT_KIND } from './goodsKinds'
import '../wildlife/WildlifeDetailPage.css'
import './goodsTints.css'
import './GoodsDetailPage.css'

/**
 * Halaman detail satu bahan masak: (1) nama, kategori, deskripsi; (2) gambar dengan harga beli, harga jual, tempat
 * membelinya (Didapat dari), dan info asal kalau sumber mencantumkannya; (3) resep yang memakainya dan (4) hewan yang menyukainya, dihitung dari data
 * Hatowiki. Bahan tidak punya level, lokasi, maupun peta.
 */
function IngredientDetailPage() {
  const { slug } = useParams()
  const location = useLocation()
  const item = getIngredientBySlug(slug)
  const listHref = `/ingredients${location.state?.listSearch ?? ''}`
  usePageTitle(item ? item.name : 'Bahan masak tidak ditemukan')

  if (!item) {
    return (
      <NotFoundPage
        title="Bahan masak tidak ditemukan"
        message="Bahan ini belum ada di database kami, atau alamatnya salah ketik."
        backTo="/ingredients"
        backLabel={`Lihat daftar ${INGREDIENT_KIND.name}`}
      />
    )
  }

  const usage = getItemUsage(`ingredients/${item.slug}`)
  const obtained = item.obtainedFrom
  const amount = (key) => (item[key] != null ? formatCoins(item[key]) : item.uncertain?.includes(key) ? 'Belum pasti' : '—')
  const prices = [
    { key: 'buyPrice', label: 'Harga beli' },
    { key: 'sellPrice', label: 'Harga jual' },
  ]

  return (
    <div className="container page entry-detail" data-wildlife="ingredients">
      <Breadcrumbs
        items={[
          { label: 'Beranda', to: '/' },
          { label: INGREDIENT_KIND.name, to: listHref },
          { label: item.name },
        ]}
      />

      <div
        className={`entry-detail__grid entry-detail__grid--goods entry-detail__grid--ingredient${
          usage.animals.length ? '' : ' entry-detail__grid--no-animals'
        }`}
      >
        {/* Kotak 1 — identitas. Pertama di DOM supaya nama terbaca paling awal. */}
        <IdentityPanel kind={INGREDIENT_KIND} entry={item} />

        {/* Kotak 2 — gambar | harga beli, harga jual & tempat membeli */}
        <section className="panel panel--hero" aria-label={`Gambar dan harga ${item.name}`}>
          <div className="hero-layout hero-layout--split">
            <div className="entry-stage">
              <EntryImage src={item.image} alt={item.name} className="entry-stage__image" loading="eager" size={item.imageSize} />
            </div>
            <dl className="spec-list goods-specs goods-specs--hero">
              {prices.map(({ key, label }) => (
                <div key={key} className="spec">
                  <dt className="spec__label">
                    <Coins aria-hidden="true" />
                    {label}
                  </dt>
                  <dd className={`spec__value${item[key] == null ? ' is-missing' : ''}`}>
                    {amount(key)}
                    {item[key] != null && <span className="spec__unit">koin</span>}
                  </dd>
                </div>
              ))}
              <div className="spec spec--wide">
                <dt className="spec__label">
                  <Store aria-hidden="true" />
                  Didapat dari
                </dt>
                <dd className={`spec__value${obtained ? '' : ' is-missing'}`}>
                  {obtained ? obtained.place : '—'}
                  {obtained?.when && <span className="spec__note">{obtained.when}</span>}
                </dd>
              </div>
              {item.origin && (
                <div className="spec">
                  <dt className="spec__label">
                    <MapPinned aria-hidden="true" />
                    Asal
                  </dt>
                  <dd className="spec__value">{item.origin}</dd>
                </div>
              )}
            </dl>
          </div>
        </section>

        {/* Kotak 3 & 4 — dihitung dari data resep & hewan Hatowiki */}
        <RecipeUsagePanel usage={usage} name={item.name} />
        <AnimalUsagePanel usage={usage} name={item.name} />
      </div>

      <DetailFooter kind={INGREDIENT_KIND} entry={item} listHref={listHref} />
    </div>
  )
}

export default IngredientDetailPage
