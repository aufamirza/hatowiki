/**
 * Definisi kelompok filter yang dipakai beberapa katalog (lihat listState.js untuk bentuknya). Opsi tiap kelompok
 * diambil dari data lewat `values(entry)`, jadi entri baru otomatis menambah opsi.
 */

// Level: angka, urut naik.
export const LEVEL_FILTER = {
  id: 'level',
  param: 'level',
  label: 'Level',
  values: (entry) => (entry.level == null ? [] : [String(entry.level)]),
  compare: (a, b) => Number(a) - Number(b),
  optionLabel: (value) => `Level ${value}`,
  chipLabel: (value) => `Level ${value}`,
}

// Lokasi (daftar `locations: [{ name }]`): entri dengan beberapa lokasi cocok kalau salah satunya dipilih. Urut A–Z.
export const LOCATION_FILTER = {
  id: 'location',
  param: 'lokasi',
  label: 'Lokasi',
  values: (entry) => (entry.locations ?? []).map((location) => location.name),
  compare: (a, b) => a.localeCompare(b, 'en', { ignorePunctuation: true }),
}

/**
 * Kategori entri (Common, event, …) dengan urutan & emoji dari peta kategori katalog itu; kategori yang belum
 * terdaftar ditaruh di belakang, A–Z.
 */
export function categoryFilter(categories) {
  const order = Object.keys(categories)
  const rank = (value) => (order.includes(value) ? order.indexOf(value) : Infinity)
  return {
    id: 'category',
    param: 'kategori',
    label: 'Kategori',
    values: (entry) => (entry.category == null ? [] : [entry.category]),
    compare: (a, b) => rank(a) - rank(b) || a.localeCompare(b, 'en'),
    emoji: (value) => categories[value]?.emoji,
  }
}
