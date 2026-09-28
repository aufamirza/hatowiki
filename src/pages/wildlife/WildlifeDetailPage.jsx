import { Link, useLocation, useParams } from 'react-router-dom'
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
import { PERIODS, formatPeriodRange } from '../../data/gameTime'
import { WEATHERS } from '../../data/wildlife/attributes'
import { getEntryLocations } from '../../data/wildlife/entryLocations'
import { usePageTitle } from '../../hooks/usePageTitle'
import NotFoundPage from '../NotFoundPage'
import AnimalDetailPanels from './AnimalDetailPanels'
import { WILDLIFE_KINDS } from './wildlifeKinds'
import './wildlifeTints.css'
import './WildlifeDetailPage.css'

const SCHEDULE_OPTIONS = PERIODS.map((period) => ({ ...period, hint: formatPeriodRange(period) }))

/**
 * Halaman detail satu entri wildlife (ikan, serangga, burung) dengan lima kotak: identitas, gambar & statistik,
 * waktu & cuaca, waktu server, dan lokasi. Shadow hanya tampil kalau skema kategorinya punya shadow;
 * lokasi jamak ditampilkan sebagai daftar dan semua zonanya disorot di peta.
 * Hewan (skema dengan makanan favorit, tanpa level/jadwal/harga) memakai empat kotak di AnimalDetailPanels.
 */
function WildlifeDetailPage({ kindSlug }) {
  const kind = WILDLIFE_KINDS[kindSlug]
  const { slug } = useParams()
  const location = useLocation()
  const entry = kind.entries.find((item) => item.slug === slug)
  // Kalau dibuka dari daftar, kembali ke daftar dengan pencarian/filter yang sama.
  const listHref = `/wildlife/${kind.slug}${location.state?.listSearch ?? ''}`
  const notFoundTitle = `${kind.label} tidak ditemukan`
  usePageTitle(entry ? entry.name : notFoundTitle)

  if (!entry) {
    return (
      <NotFoundPage
        title={notFoundTitle}
        message={`${kind.label} ini belum ada di database kami, atau alamatnya salah ketik.`}
        backTo={`/wildlife/${kind.slug}`}
        backLabel={`Lihat daftar ${kind.name}`}
      />
    )
  }

  const category = kind.entryCategories[entry.category]
  const locations = getEntryLocations(kind, entry)

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
            {entry.category && (
              <p className="category-tag" style={categoryToneStyle(entry.category)}>
                <span className="visually-hidden">Kategori: </span>
                {category && <span aria-hidden="true">{category.emoji}</span>}
                {entry.category}
              </p>
            )}
            {entry.description ? (
              <p className="entry-detail__description">{entry.description}</p>
            ) : (
              <p className="entry-detail__description is-missing">Deskripsi belum tersedia.</p>
            )}
          </section>

          {/* Kotak 1 — gambar, level, shadow, harga jual. Kategori dengan shadow (ikan): tiga kolom gambar | level &
              shadow | harga. Tanpa shadow (serangga, burung): dua bagian seimbang, gambar dengan badge level di
              pojoknya | harga jual (burung: harga jual Info Card), seperti detail resep. */}
          <section className="panel panel--hero" aria-label={`Gambar dan statistik ${entry.name}`}>
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
                        Syarat level
                      </dt>
                      <dd className="spec__value">Level {entry.level ?? '—'}</dd>
                    </div>
                    <div className="spec">
                      <dt className="spec__label">
                        <Waves aria-hidden="true" />
                        Shadow
                      </dt>
                      <dd className="spec__value">
                        <ShadowIndicator shadow={entry.shadow} />
                        {entry.shadow ?? '—'}
                      </dd>
                    </div>
                  </dl>

                  <div className="market">
                    <h2 className="market__title">
                      <Coins aria-hidden="true" />
                      {kind.priceLabel}
                      <span className="market__hint">per kualitas</span>
                    </h2>
                    <MarketValue values={entry.marketValue} missingLabel={kind.missingPrice} absent={entry.marketValueMissing} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="hero-layout hero-layout--split">
                <div className={`entry-stage${kind.waterStage ? ' entry-stage--water' : ''}`}>
                  <EntryImage src={entry.image} alt={entry.name} className="entry-stage__image" loading="eager" size={entry.imageSize} />
                  {kind.hasLevel && (
                    <p className="stage-level" style={levelToneStyle(entry.level)}>
                      <span aria-hidden="true">Lv. {entry.level ?? '—'}</span>
                      <span className="visually-hidden">Syarat level {entry.level ?? 'belum diketahui'}</span>
                    </p>
                  )}
                </div>
                <div className="market">
                  <h2 className="market__title">
                    <Coins aria-hidden="true" />
                    {kind.priceLabel}
                    <span className="market__hint">per kualitas</span>
                  </h2>
                  <MarketValue values={entry.marketValue} missingLabel={kind.missingPrice} absent={entry.marketValueMissing} />
                </div>
              </div>
            )}
          </section>

          {/* Kotak 3 — schedule & weather */}
          <section className="panel panel--when" aria-labelledby="entry-when">
            <PanelTitle icon={Sunrise} id="entry-when">
              Waktu muncul
            </PanelTitle>
            <AvailabilityChips options={SCHEDULE_OPTIONS} active={entry.schedule} label="Schedule" columns={2} />

            <PanelTitle icon={CloudSun}>Cuaca</PanelTitle>
            <AvailabilityChips options={WEATHERS} active={entry.weather} label="Weather" columns={3} layout="stack" />

            <p className="panel__legend">
              <span className="legend-swatch legend-swatch--on" aria-hidden="true" /> Berlaku
              <span className="legend-swatch legend-swatch--off" aria-hidden="true" /> Tidak berlaku
            </p>
          </section>

          {/* Kotak 4 — waktu server */}
          <section className="panel panel--time" aria-labelledby="entry-server-time">
            <PanelTitle icon={Globe} id="entry-server-time">
              Waktu server
            </PanelTitle>
            <ServerTime />
          </section>

          {/* Kotak 5 — lokasi: satu nama, atau daftar semua lokasi (yang tanpa zona tetap ditulis) */}
          <section className="panel panel--location" aria-labelledby="entry-location">
            <div className="location-layout">
              <div className="location-info">
                <PanelTitle icon={MapPin} id="entry-location">
                  Lokasi
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
          {`Kembali ke daftar ${kind.name}`}
        </Link>
        <p className="source-credit">
          Sumber data:{' '}
          <a href={entry.source} target="_blank" rel="noopener noreferrer">
            Heartodex — {entry.name}
            <ExternalLink aria-hidden="true" />
            <span className="visually-hidden"> (membuka tab baru)</span>
          </a>
        </p>
      </footer>
    </div>
  )
}

export default WildlifeDetailPage
