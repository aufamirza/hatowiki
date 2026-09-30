import { PERIODS } from '../../data/gameTime'
import { SHADOWS, WEATHERS } from '../../data/wildlife/attributes'
import { getEntryLocations } from '../../data/wildlife/entryLocations'

// Urutan kanonik untuk nilai yang sudah dikenal; nilai baru (belum ada di daftar) ditaruh di belakang, A–Z.
const byCanonical = (order) => (a, b) => {
  const rankA = order.indexOf(a)
  const rankB = order.indexOf(b)
  return (rankA < 0 ? Infinity : rankA) - (rankB < 0 ? Infinity : rankB) || a.localeCompare(b, 'en')
}
// Tanda baca diabaikan supaya "[EVENT] Sea Fishing" diurutkan di huruf E, bukan paling atas.
const alphabetical = (a, b) => a.localeCompare(b, 'en', { ignorePunctuation: true })
const single = (value) => (value == null ? [] : [String(value)])

/**
 * Kelompok filter sebuah kategori wildlife (mengikuti kategori & urutan filter di heartodex). Opsi tiap
 * kelompok tidak ditulis manual: `values(entry)` mengambil nilainya dari data, jadi entri baru otomatis
 * menambah opsi. Level, Shadow, dan Waktu muncul hanya ada kalau skemanya punya atribut itu (`hasLevel`,
 * `hasShadow`, `hasSchedule`). Lokasi selalu berupa daftar, jadi entri dengan beberapa lokasi cocok kalau
 * salah satu lokasinya dipilih. Status di URL, pencarian, dan urutan ada di pages/catalog/listState.js.
 * @param {object} category kategori wildlife dari WILDLIFE_CATEGORIES
 */
export function buildListFilters(category) {
  const { entryCategories } = category
  return [
    category.hasLevel && {
      id: 'level',
      param: 'level',
      labelKey: 'filter.level',
      values: (entry) => single(entry.level),
      compare: (a, b) => Number(a) - Number(b),
      optionKey: 'filter.levelOption',
      chipKey: 'filter.levelOption',
    },
    category.hasShadow && {
      id: 'shadow',
      param: 'shadow',
      labelKey: 'filter.shadow',
      values: (entry) => single(entry.shadow),
      compare: byCanonical(Object.keys(SHADOWS)),
    },
    {
      id: 'location',
      param: 'lokasi',
      labelKey: 'filter.location',
      values: (entry) => getEntryLocations(category, entry).map((location) => location.name),
      compare: alphabetical,
    },
    {
      id: 'weather',
      param: 'cuaca',
      labelKey: `filter.${category.weatherKey}`,
      values: (entry) => entry.weather ?? [],
      compare: byCanonical(WEATHERS.map((weather) => weather.id)),
      emoji: (value) => WEATHERS.find((weather) => weather.id === value)?.emoji,
    },
    category.hasSchedule && {
      id: 'schedule',
      param: 'waktu',
      labelKey: 'filter.schedule',
      values: (entry) => entry.schedule ?? [],
      compare: byCanonical(PERIODS.map((period) => period.id)),
      emoji: (value) => PERIODS.find((period) => period.id === value)?.emoji,
    },
    {
      id: 'category',
      param: 'kategori',
      labelKey: 'filter.category',
      values: (entry) => single(entry.category),
      compare: byCanonical(Object.keys(entryCategories)),
      emoji: (value) => entryCategories[value]?.emoji,
    },
  ].filter(Boolean)
}
