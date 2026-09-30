import { Clock, Cloud, MapPin } from 'lucide-react'
import { PERIODS } from '../../data/gameTime'
import { WEATHERS } from '../../data/wildlife/attributes'
import { getEntryLocations } from '../../data/wildlife/entryLocations'
import { useI18n } from '../../i18n/I18nProvider'
import CatalogCard from '../catalog/CatalogCard'

// Nilai yang berlaku dalam urutan kanonik (Dawn, Day, Dusk, Night / Rainbow, Sunny, Rainy).
const activeValues = (options, active = []) => options.filter((option) => active.includes(option.id)).map((option) => option.id)

// "Semua …" hanya kalau entri mencakup seluruh daftar kanonik; dihitung dari data, bukan per entri.
function summarize(options, active, allLabel) {
  const values = activeValues(options, active)
  if (!values.length) return { short: '—', full: '—' }
  const full = values.join(', ')
  return { short: values.length === options.length ? allLabel : full, full }
}

/**
 * Kartu entri wildlife (ikan, serangga, burung, hewan) di halaman daftar. `category` = kategori wildlife dari
 * WILDLIFE_CATEGORIES (menentukan URL, emoji kategori entri, lokasi tunggal/jamak, dan baris info yang ada:
 * hewan tidak punya jadwal, dan cuacanya "Cuaca favorit").
 * Lokasi jamak ditulis "lokasi pertama +N"; daftar lengkap ada di atribut title.
 */
function EntryCard({ entry, category, linkState }) {
  const { t } = useI18n()
  const locations = getEntryLocations(category, entry).map((location) => location.name)
  const locationFull = locations.length ? locations.join(', ') : '—'
  const facts = [
    { key: 'location', label: t('common.location'), Icon: MapPin, short: locations[0] ?? '—', more: locations.length - 1, full: locationFull },
    category.hasSchedule && { key: 'schedule', label: t('card.time'), Icon: Clock, ...summarize(PERIODS, entry.schedule, t('card.allTimes')) },
    { key: 'weather', label: t(`filter.${category.weatherKey}`), Icon: Cloud, ...summarize(WEATHERS, entry.weather, t('card.allWeather')) },
  ].filter(Boolean)

  return (
    <CatalogCard
      to={`/wildlife/${category.slug}/${entry.slug}`}
      linkState={linkState}
      image={entry.image}
      imageSize={entry.imageSize}
      name={entry.name}
      category={entry.category}
      categoryEmoji={category.entryCategories[entry.category]?.emoji}
      level={entry.level}
      facts={facts}
    />
  )
}

export default EntryCard
