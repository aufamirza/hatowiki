import { useLocation, useParams } from 'react-router-dom'
import { Coins, MapPinned, Store } from 'lucide-react'
import Breadcrumbs from '../../components/Breadcrumbs'
import { formatCoins } from '../../components/recipes/starValues'
import EntryImage from '../../components/wildlife/EntryImage'
import { getIngredientBySlug } from '../../data/ingredients/ingredients'
import { useI18n } from '../../i18n/I18nProvider'
import NotFoundPage from '../NotFoundPage'
import { DetailFooter, IdentityPanel, NpcMentions, SoldBySpec } from './GoodsDetailParts'
import { AnimalUsagePanel, RecipeUsagePanel, getItemUsage } from './UsagePanels'
import { INGREDIENT_KIND } from './goodsKinds'
import '../wildlife/WildlifeDetailPage.css'
import './goodsTints.css'
import './GoodsDetailPage.css'

/**
 * Halaman detail satu bahan masak: (1) nama, kategori, deskripsi; (2) gambar dengan harga beli, harga jual, tempat
 * membelinya (Didapat dari; nama NPC di dalamnya tertaut ke halaman NPC), NPC penjualnya menurut data NPC (Dijual oleh,
 * hanya kalau ada), dan info asal kalau sumber mencantumkannya; (3) resep yang memakainya dan (4) hewan yang menyukainya, dihitung dari data
 * Hatowiki. Bahan tidak punya level, lokasi, maupun peta.
 */
function IngredientDetailPage() {
  const { slug } = useParams()
  const location = useLocation()
  const item = getIngredientBySlug(slug)
  const i18n = useI18n()
  const { t, formatNumber, dataText } = i18n
  const text = i18n.kind('ingredients')
  const listHref = `/ingredients${location.state?.listSearch ?? ''}`

  if (!item) {
    return (
      <NotFoundPage
        title={text.notFoundTitle}
        message={text.notFoundMessage}
        backTo="/ingredients"
        backLabel={t('detail.seeList', { name: INGREDIENT_KIND.name })}
      />
    )
  }

  const usage = getItemUsage(`ingredients/${item.slug}`)
  const obtained = item.obtainedFrom
  const amount = (key) =>
    item[key] != null ? formatCoins(item[key], formatNumber) : item.uncertain?.includes(key) ? t('common.uncertain') : '—'
  const prices = [
    { key: 'buyPrice', label: t('card.buyPrice') },
    { key: 'sellPrice', label: t('common.sellPrice') },
  ]

  return (
    <div className="container page entry-detail" data-wildlife="ingredients">
      <Breadcrumbs
        items={[
          { label: t('common.home'), to: '/' },
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
        <section className="panel panel--hero" aria-label={t('goods.ingredientHero', { name: item.name })}>
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
                    {item[key] != null && <span className="spec__unit">{t('common.coins')}</span>}
                  </dd>
                </div>
              ))}
              <div className="spec spec--wide">
                <dt className="spec__label">
                  <Store aria-hidden="true" />
                  {t('card.obtainedFrom')}
                </dt>
                <dd className={`spec__value spec__value--text${obtained ? '' : ' is-missing'}`}>
                  {obtained ? <NpcMentions text={dataText(obtained.place)} /> : '—'}
                  {obtained?.when && <span className="spec__note">{dataText(obtained.when)}</span>}
                </dd>
              </div>
              <SoldBySpec itemId={`ingredients/${item.slug}`} />
              {item.origin && (
                <div className="spec">
                  <dt className="spec__label">
                    <MapPinned aria-hidden="true" />
                    {t('goods.origin')}
                  </dt>
                  <dd className="spec__value spec__value--text">{item.origin}</dd>
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
