/**
 * Status halaman daftar katalog (wildlife, resep, …): pencarian, filter, dan urutan, disimpan di URL.
 * Kelompok filter tiap katalog didefinisikan di tempat lain (mis. buildListFilters untuk wildlife);
 * setiap kelompok punya `values(entry)` yang mengambil nilainya dari data.
 */
// `labelKey` = kunci teks di src/i18n/messages.
export const SORT_OPTIONS = [
  { id: 'default', labelKey: 'list.sortDefault' },
  { id: 'level', labelKey: 'list.sortLevel' },
  { id: 'level-desc', labelKey: 'list.sortLevelDesc' },
  { id: 'az', labelKey: 'list.sortAz' },
]

const SEARCH_PARAM = 'q'
const SORT_PARAM = 'urut'

// Katalog tanpa level (mis. hewan) hanya punya urutan default dan A–Z.
export const SORT_OPTIONS_NO_LEVEL = SORT_OPTIONS.filter((option) => !option.id.startsWith('level'))

// ---------- status <-> URL ----------
export function readListState(params, filters, sortOptions = SORT_OPTIONS) {
  const sort = params.get(SORT_PARAM)
  return {
    query: (params.get(SEARCH_PARAM) ?? '').trim(),
    sort: sortOptions.some((option) => option.id === sort) ? sort : 'default',
    filters: Object.fromEntries(filters.map((def) => [def.id, [...new Set(params.getAll(def.param))]])),
  }
}

export function withQuery(params, query) {
  const next = new URLSearchParams(params)
  const trimmed = query.trim()
  if (trimmed) next.set(SEARCH_PARAM, trimmed)
  else next.delete(SEARCH_PARAM)
  return next
}

export function withSort(params, sort) {
  const next = new URLSearchParams(params)
  if (sort === 'default') next.delete(SORT_PARAM)
  else next.set(SORT_PARAM, sort)
  return next
}

export function withToggledValue(params, def, value) {
  const next = new URLSearchParams(params)
  const current = next.getAll(def.param)
  next.delete(def.param)
  const updated = current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
  for (const item of updated) next.append(def.param, item)
  return next
}

// Hapus pencarian dan semua filter; urutan dibiarkan.
export function withoutFilters(params, filters) {
  const next = new URLSearchParams(params)
  next.delete(SEARCH_PARAM)
  for (const def of filters) next.delete(def.param)
  return next
}

export const countActiveFilters = (state, filters) => filters.reduce((sum, def) => sum + state.filters[def.id].length, 0)

// ---------- pencarian, filter, urutan ----------
const normalize = (text) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('en')
    .trim()

// Teks yang dicocokkan dengan kolom pencarian; bawaannya nama entri saja.
const nameOnly = (entry) => [entry.name]

/**
 * ATAU di dalam satu kelompok, DAN antar kelompok. Untuk nilai jamak (schedule, weather, lokasi serangga)
 * entri cocok kalau nilainya mengandung salah satu pilihan. `exceptFilterId` dipakai untuk menghitung opsi.
 * `searchText(entry)` = daftar teks yang dicari (mis. resep: nama resep dan nama bahannya).
 */
export function filterEntries(list, state, filters, { exceptFilterId = null, searchText = nameOnly } = {}) {
  const query = normalize(state.query)
  return list.filter((entry) => {
    if (query && !searchText(entry).some((text) => normalize(text).includes(query))) return false
    return filters.every((def) => {
      const selected = state.filters[def.id]
      if (def.id === exceptFilterId || !selected.length) return true
      const values = def.values(entry)
      return selected.some((value) => values.includes(value))
    })
  })
}

/**
 * Urutan default = urutan data. `rank(entry)` (opsional) menggantinya dengan posisi lain, mis. resep yang dikelompokkan
 * per jenis masakan; posisi itu juga jadi pemisah seri di urutan level (level sama tetap berkelompok). A–Z selalu abjad.
 */
export function sortEntries(list, sort, { rank } = {}) {
  const indexed = list.map((entry, index) => ({ entry, index: rank ? rank(entry) : index }))
  const byName = (a, b) => a.entry.name.localeCompare(b.entry.name, 'en')
  const level = (item) => item.entry.level ?? Infinity
  const tie = rank ? (a, b) => a.index - b.index : byName
  const comparators = {
    default: (a, b) => a.index - b.index,
    level: (a, b) => level(a) - level(b) || tie(a, b),
    'level-desc': (a, b) => level(b) - level(a) || tie(a, b),
    az: byName,
  }
  return indexed.sort(comparators[sort] ?? comparators.default).map((item) => item.entry)
}

/**
 * Opsi tiap kelompok beserta jumlah entri yang akan tampil kalau opsi itu dipilih
 * (memperhitungkan pencarian dan filter di kelompok lain).
 */
export function buildFilterGroups(list, state, filters, { searchText = nameOnly } = {}) {
  return filters.map((def) => {
    const counts = new Map()
    for (const entry of list) for (const value of def.values(entry)) counts.set(value, 0)
    for (const value of state.filters[def.id]) if (!counts.has(value)) counts.set(value, 0)
    for (const entry of filterEntries(list, state, filters, { exceptFilterId: def.id, searchText })) {
      for (const value of new Set(def.values(entry))) counts.set(value, counts.get(value) + 1)
    }
    const options = [...counts.keys()].sort(def.compare).map((value) => ({
      value,
      count: counts.get(value),
      emoji: def.emoji?.(value),
      selected: state.filters[def.id].includes(value),
    }))
    return { def, options, selectedCount: state.filters[def.id].length }
  })
}
