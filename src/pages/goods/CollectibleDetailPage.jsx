import { useLocation, useParams } from 'react-router-dom'
import { Coins, MapPin, Zap } from 'lucide-react'
import Breadcrumbs from '../../components/Breadcrumbs'
import PanelTitle from '../../components/PanelTitle'
import { formatCoins, formatEnergy } from '../../components/recipes/starValues'
import EntryImage from '../../components/wildlife/EntryImage'
import LocationMap from '../../components/wildlife/LocationMap'
import { getCollectibleBySlug } from '../../data/collectibles/collectibles'
import { useI18n } from '../../i18n/I18nProvider'
import NotFoundPage from '../NotFoundPage'
import { DetailFooter, IdentityPanel } from './GoodsDetailParts'
import { AnimalUsagePanel, RecipeUsagePanel, getItemUsage } from './UsagePanels'
import { COLLECTIBLE_KIND } from './goodsKinds'
import '../wildlife/WildlifeDetailPage.css'
import './goodsTints.css'
import './GoodsDetailPage.css'

/**
 * Halaman detail satu collectible: (1) nama, kategori, deskripsi; (2) gambar dengan nilai jual dan energi (kalau
 * sumber mencantumkan Energy Boost); (3) lokasi dan peta zona; (4) resep yang memakainya dan (5) hewan yang
 * menyukainya, dihitung dari data Hatowiki. Collectible tidak punya level.
 */
function CollectibleDetailPage() {
  const { slug } = useParams()
  const location = useLocation()
  const item = getCollectibleBySlug(slug)
  const i18n = useI18n()
  const { t, formatNumber } = i18n
  const text = i18n.kind('collectibles')
  const listHref = `/collectibles${location.state?.listSearch ?? ''}`

  if (!item) {
    return (
      <NotFoundPage
        title={text.notFoundTitle}
        message={text.notFoundMessage}
        backTo="/collectibles"
        backLabel={t('detail.seeList', { name: COLLECTIBLE_KIND.name })}
      />
    )
  }

  const usage = getItemUsage(`collectibles/${item.slug}`)
  const locations = item.locations ?? []
  const amount = (key, format) =>
    item[key] != null ? format(item[key], formatNumber) : item.uncertain?.includes(key) ? t('common.uncertain') : '—'

  return (
    <div className="container page entry-detail" data-wildlife="collectibles">
      <Breadcrumbs
        items={[
          { label: t('common.home'), to: '/' },
          { label: COLLECTIBLE_KIND.name, to: listHref },
          { label: item.name },
        ]}
      />

      <div
        className={`entry-detail__grid entry-detail__grid--goods entry-detail__grid--collectible${
          usage.animals.length ? '' : ' entry-detail__grid--no-animals'
        }`}
      >
        {/* Kotak 1 — identitas. Pertama di DOM supaya nama terbaca paling awal. */}
        <IdentityPanel kind={COLLECTIBLE_KIND} entry={item} />

        {/* Kotak 2 — gambar | nilai jual & energi */}
        <section className="panel panel--hero" aria-label={t('goods.collectibleHero', { name: item.name })}>
          <div className="hero-layout hero-layout--split">
            <div className="entry-stage">
              <EntryImage src={item.image} alt={item.name} className="entry-stage__image" loading="eager" size={item.imageSize} />
            </div>
            <dl className="spec-list goods-specs goods-specs--hero">
              <div className="spec">
                <dt className="spec__label">
                  <Coins aria-hidden="true" />
                  {t('card.sellValue')}
                </dt>
                <dd className={`spec__value${item.sellValue == null ? ' is-missing' : ''}`}>
                  {amount('sellValue', formatCoins)}
                  {item.sellValue != null && <span className="spec__unit">{t('common.coins')}</span>}
                </dd>
              </div>
              {(item.energy != null || item.uncertain?.includes('energy')) && (
                <div className="spec">
                  <dt className="spec__label">
                    <Zap aria-hidden="true" />
                    {t('card.energy')}
                  </dt>
                  <dd className="spec__value">
                    {amount('energy', formatEnergy)}
                    {item.energy != null && <span className="spec__unit">{t('common.energy')}</span>}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </section>

        {/* Kotak 3 — lokasi & peta zona */}
        <section className="panel panel--aside panel--location" aria-labelledby="entry-location">
          <div className="location-layout">
            <div className="location-info">
              <PanelTitle icon={MapPin} id="entry-location">
                {t('common.location')}
              </PanelTitle>
              {locations.length > 1 ? (
                <ul className="location-info__list">
                  {locations.map((place) => (
                    <li key={place.name}>{place.name}</li>
                  ))}
                </ul>
              ) : (
                <p className="location-info__name">{locations[0]?.name ?? '—'}</p>
              )}
            </div>
            <LocationMap locations={locations} image={item.locationImage} />
          </div>
        </section>

        {/* Kotak 4 & 5 — dihitung dari data resep & hewan Hatowiki */}
        <RecipeUsagePanel usage={usage} name={item.name} />
        <AnimalUsagePanel usage={usage} name={item.name} />
      </div>

      <DetailFooter kind={COLLECTIBLE_KIND} entry={item} listHref={listHref} />
    </div>
  )
}

export default CollectibleDetailPage
