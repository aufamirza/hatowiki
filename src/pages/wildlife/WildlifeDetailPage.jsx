import { useLocation, useParams } from 'react-router-dom'
import { ArrowLeft, Award, CloudSun, Coins, ExternalLink, Globe, MapPin, Sunrise, Waves } from 'lucide-react'
import Breadcrumbs from '../../components/Breadcrumbs'
import PanelTitle from '../../components/PanelTitle'
import ServerTime from '../../components/ServerTime'
import AvailabilityChips from '../../components/wildlife/AvailabilityChips'
import EntryImage from '../../components/wildlife/EntryImage'
import LocationMap from '../../components/wildlife/LocationMap'
import MarketValue from '../../components/wildlife/MarketValue'
import ShadowIndicator from '../../components/wildlife/ShadowIndicator'
import { levelToneStyle } from '../../components/wildlife/levelTone'
import { categoryToneStyle } from '../../components/catalog/categoryTone'
import InHeartopia from '../../components/InHeartopia'
import { PERIODS, formatPeriodRange } from '../../data/gameTime'
import { WEATHERS } from '../../data/wildlife/attributes'
import { getEntryLocations } from '../../data/wildlife/entryLocations'
import { useI18n } from '../../i18n/I18nProvider'
import { Link } from '../../i18n/LocaleLink'
import NotFoundPage from '../NotFoundPage'
import AnimalDetailPanels from './AnimalDetailPanels'
import { WILDLIFE_KINDS } from './wildlifeKinds'
import './wildlifeTints.css'
import './WildlifeDetailPage.css'


/**
 * Halaman detail satu entri wildlife (ikan, serangga, burung) dengan lima kotak: identitas, gambar & statistik,
 * waktu & cuaca, waktu server, dan lokasi. Shadow hanya tampil kalau skema kategorinya punya shadow;
 * lokasi jamak ditampilkan sebagai daftar dan semua zonanya disorot di peta.
 * Hewan (skema dengan makanan favorit, tanpa level/jadwal/harga) memakai empat kotak di AnimalDetailPanels.
 */
function WildlifeDetailPage({ kindSlug }) {
  const kind = WILDLIFE_KINDS[kindSlug]
  const i18n = useI18n()
  const { t } = i18n
  const text = i18n.kind(kind.slug)
  const { slug } = useParams()
  const location = useLocation()
  const entry = kind.entries.find((item) => item.slug === slug)
  // Kalau dibuka dari daftar, kembali ke daftar dengan pencarian/filter yang sama.
  const listHref = `/wildlife/${kind.slug}${location.state?.listSearch ?? ''}`

  if (!entry) {
    return (
      <NotFoundPage
        title={text.notFoundTitle}
        message={text.notFoundMessage}
        backTo={`/wildlife/${kind.slug}`}
        backLabel={t('detail.seeList', { name: kind.name })}
      />
    )
  }

  const category = kind.entryCategories[entry.category]
  const locations = getEntryLocations(kind, entry)
  const description = i18n.description(kind.slug, entry)
  const priceLabel = text.priceLabel ?? t('common.sellPrice')
  const missingPrice = kind.missingPrice === 'uncertain' ? t('common.uncertain') : '—'
  const scheduleOptions = PERIODS.map((period) => ({ ...period, hint: formatPeriodRange(period, (hour) => t('common.hour', { hour })) }))

  return (
    <div className="container page entry-detail" data-wildlife={kind.slug}>
      <Breadcrumbs
        items={[
          { label: 'Wildlife', to: '/wildlife' },
          { label: kind.name, to: listHref },
          { label: entry.name },
        ]}
      />

      {kind.hasFavoriteFood ? (
        <AnimalDetailPanels kind={kind} entry={entry} category={category} locations={locations} />
      ) : (
        <div className="entry-detail__grid">
          {/* Kotak 2 — identitas. Diletakkan pertama di DOM supaya nama terbaca paling awal. */}
          <section className="panel panel--info" aria-labelledby="entry-name">
            <p className="eyebrow">{kind.name}</p>
            <h1 id="entry-name" className="entry-detail__name">
              {entry.name}
            </h1>
            <InHeartopia kindSlug={kind.slug} />
            {entry.category && (
              <p className="category-tag" style={categoryToneStyle(entry.category)}>
                <span className="visually-hidden">{t('common.categoryPrefix')}</span>
                {category && <span aria-hidden="true">{category.emoji}</span>}
                {entry.category}
              </p>
            )}
            {description ? (
              <p className="entry-detail__description">{description}</p>
            ) : (
              <p className="entry-detail__description is-missing">{t('detail.noDescription')}</p>
            )}
          </section>

          {/* Kotak 1 — gambar, level, shadow, harga jual. Kategori dengan shadow (ikan): tiga kolom gambar | level &
              shadow | harga. Tanpa shadow (serangga, burung): dua bagian seimbang, gambar dengan badge level di
              pojoknya | harga jual (burung: harga jual Info Card), seperti detail resep. */}
          <section className="panel panel--hero" aria-label={t('detail.heroWildlife', { name: entry.name })}>
            {kind.hasShadow ? (
              <div className="hero-layout">
                <div className={`entry-stage${kind.waterStage ? ' entry-stage--water' : ''}`}>
                  <EntryImage src={entry.image} alt={entry.name} className="entry-stage__image" loading="eager" size={entry.imageSize} />
                </div>

                <div className="hero-details">
                  <dl className="spec-list">
                    <div className="spec">
                      <dt className="spec__label">
                        <Award aria-hidden="true" />
                        {t('detail.levelRequirement')}
                      </dt>
                      <dd className="spec__value">{t('common.level', { level: entry.level ?? '—' })}</dd>
                    </div>
                    <div className="spec">
                      <dt className="spec__label">
                        <Waves aria-hidden="true" />
                        {t('detail.shadow')}
                      </dt>
                      <dd className="spec__value spec__value--text">
                        <ShadowIndicator shadow={entry.shadow} />
                        {entry.shadow ?? '—'}
                      </dd>
                    </div>
                  </dl>

                  <div className="market">
                    <h2 className="market__title">
                      <Coins aria-hidden="true" />
                      {priceLabel}
                      <span className="market__hint">{t('common.perQuality')}</span>
                    </h2>
                    <MarketValue values={entry.marketValue} missingLabel={missingPrice} absent={entry.marketValueMissing} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="hero-layout hero-layout--split">
                <div className={`entry-stage${kind.waterStage ? ' entry-stage--water' : ''}`}>
                  <EntryImage src={entry.image} alt={entry.name} className="entry-stage__image" loading="eager" size={entry.imageSize} />
                  {kind.hasLevel && (
                    <p className="stage-level" style={levelToneStyle(entry.level)}>
                      <span aria-hidden="true">{t('common.levelShort', { level: entry.level ?? '—' })}</span>
                      <span className="visually-hidden">
                        {entry.level != null ? t('common.levelRequired', { level: entry.level }) : t('common.levelRequiredUnknown')}
                      </span>
                    </p>
                  )}
                </div>
                <div className="market">
                  <h2 className="market__title">
                    <Coins aria-hidden="true" />
                    {priceLabel}
                    <span className="market__hint">{t('common.perQuality')}</span>
                  </h2>
                  <MarketValue values={entry.marketValue} missingLabel={missingPrice} absent={entry.marketValueMissing} />
                </div>
              </div>
            )}
          </section>

          {/* Kotak 3 — schedule & weather */}
          <section className="panel panel--when" aria-labelledby="entry-when">
            <PanelTitle icon={Sunrise} id="entry-when">
              {t('detail.schedule')}
            </PanelTitle>
            <AvailabilityChips options={scheduleOptions} active={entry.schedule} label={t('detail.scheduleList')} columns={2} />

            <PanelTitle icon={CloudSun}>{t('detail.weather')}</PanelTitle>
            <AvailabilityChips options={WEATHERS} active={entry.weather} label={t('detail.weatherList')} columns={3} layout="stack" />

            <p className="panel__legend">
              <span className="legend-swatch legend-swatch--on" aria-hidden="true" /> {t('detail.applies')}
              <span className="legend-swatch legend-swatch--off" aria-hidden="true" /> {t('detail.notApplies')}
            </p>
          </section>

          {/* Kotak 4 — waktu server */}
          <section className="panel panel--time" aria-labelledby="entry-server-time">
            <PanelTitle icon={Globe} id="entry-server-time">
              {t('detail.serverTime')}
            </PanelTitle>
            <ServerTime />
          </section>

          {/* Kotak 5 — lokasi: satu nama, atau daftar semua lokasi (yang tanpa zona tetap ditulis) */}
          <section className="panel panel--location" aria-labelledby="entry-location">
            <div className="location-layout">
              <div className="location-info">
                <PanelTitle icon={MapPin} id="entry-location">
                  {t('common.location')}
                </PanelTitle>
                {locations.length > 1 ? (
                  <ul className="location-info__list">
                    {locations.map((item) => (
                      <li key={item.name}>{item.name}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="location-info__name">{locations[0]?.name ?? '—'}</p>
                )}
              </div>
              <LocationMap locations={locations} image={entry.locationImage} />
            </div>
          </section>
        </div>
      )}

      <footer className="entry-detail__footer">
        <Link to={listHref} className="btn btn--ghost">
          <ArrowLeft aria-hidden="true" />
          {t('detail.back', { name: kind.name })}
        </Link>
        <p className="source-credit">
          {t('detail.source')}{' '}
          <a href={entry.source} target="_blank" rel="noopener noreferrer">
            {t('detail.sourceLink', { name: entry.name })}
            <ExternalLink aria-hidden="true" />
            <span className="visually-hidden">{t('common.newTab')}</span>
          </a>
        </p>
      </footer>
    </div>
  )
}

export default WildlifeDetailPage
