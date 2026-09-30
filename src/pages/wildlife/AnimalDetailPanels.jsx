import { CloudSun, MapPin, Utensils } from 'lucide-react'
import PanelTitle from '../../components/PanelTitle'
import { categoryToneStyle } from '../../components/catalog/categoryTone'
import ItemList from '../../components/items/ItemList'
import AvailabilityChips from '../../components/wildlife/AvailabilityChips'
import EntryImage from '../../components/wildlife/EntryImage'
import LocationMap from '../../components/wildlife/LocationMap'
import { WEATHERS } from '../../data/wildlife/attributes'
import { useI18n } from '../../i18n/I18nProvider'

/**
 * Isi halaman detail hewan, empat kotak: (1) gambar, nama, kategori, deskripsi; (2) lokasi dan peta dengan pin
 * titik tempat makan (kalau tidak ada, zona lokasi atau placeholder); (3) cuaca favorit; (4) makanan favorit.
 * Hewan tidak punya level, jadwal, maupun harga, jadi tidak ada kotak harga dan waktu server.
 */
function AnimalDetailPanels({ kind, entry, category, locations }) {
  const i18n = useI18n()
  const { t } = i18n
  const description = i18n.description(kind.slug, entry)
  const weatherLabel = t(`filter.${kind.weatherKey}`)
  return (
    <div className="entry-detail__grid entry-detail__grid--animal">
      {/* Kotak 1 — identitas & gambar. Teks lebih dulu di DOM supaya nama terbaca paling awal. */}
      <section className="panel panel--ident" aria-labelledby="entry-name">
        <div className="ident-layout">
          <div className="ident-layout__text">
            <p className="eyebrow">{kind.name}</p>
            <h1 id="entry-name" className="entry-detail__name">
              {entry.name}
            </h1>
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
          </div>
          <div className="entry-stage">
            <EntryImage src={entry.image} alt={entry.name} className="entry-stage__image" loading="eager" size={entry.imageSize} />
          </div>
        </div>
      </section>

      {/* Kotak 2 — lokasi: daftar lokasi dan pin titik tempat makan di peta */}
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
          <LocationMap
            locations={locations}
            image={entry.locationImage}
            spot={entry.feedingSpot}
            spotLabel={t('detail.feedingSpotOf', { name: entry.name })}
          />
        </div>
      </section>

      {/* Kotak 3 — cuaca favorit */}
      <section className="panel panel--weather" aria-labelledby="entry-weather">
        <PanelTitle icon={CloudSun} id="entry-weather">
          {weatherLabel}
        </PanelTitle>
        <AvailabilityChips options={WEATHERS} active={entry.weather} label={weatherLabel} columns={3} layout="stack" />
        <p className="panel__legend">
          <span className="legend-swatch legend-swatch--on" aria-hidden="true" /> {t('detail.favorite')}
          <span className="legend-swatch legend-swatch--off" aria-hidden="true" /> {t('detail.notFavorite')}
        </p>
      </section>

      {/* Kotak 4 — makanan favorit: gambar, nama, dan jenis */}
      <section className="panel panel--food" aria-labelledby="entry-food">
        <PanelTitle icon={Utensils} id="entry-food">
          {t('detail.favoriteFood')}
        </PanelTitle>
        {entry.favoriteFood.length ? (
          <ItemList entries={entry.favoriteFood.map((id) => ({ id }))} showType />
        ) : (
          <p className="entry-detail__description is-missing">{t('detail.noFavoriteFood')}</p>
        )}
      </section>
    </div>
  )
}

export default AnimalDetailPanels
