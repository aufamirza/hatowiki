const formatNumber = new Intl.NumberFormat('id-ID')

export const formatEnergy = (value) => `+${formatNumber.format(value)}`
export const formatCoins = (value) => formatNumber.format(value)

/**
 * Ringkasan 5 nilai per kualitas (energi / harga jual resep) untuk kartu: `short` = rentang 1★ sampai 5★,
 * `full` = semua nilai per bintang (untuk atribut title). Nilai yang tidak ada tampil "—"; yang desimal di sumber
 * (`uncertain`) "Belum pasti". Kalau 1★ atau 5★ tidak ada, yang ditampilkan nilai yang ada beserta bintangnya.
 */
export function summarizeStars(values, format, uncertain = []) {
  if (!values || values.every((value) => value == null)) return { short: '—', full: '—' }
  const full = values
    .map((value, i) => `${i + 1}★ ${value != null ? format(value) : uncertain.includes(i) ? 'Belum pasti' : '—'}`)
    .join(', ')
  const [first, last] = [values[0], values[4]]
  if (first != null && last != null) return { short: first === last ? format(first) : `${format(first)} – ${format(last)}`, full }
  const known = values.map((value, i) => ({ value, stars: i + 1 })).filter(({ value }) => value != null)
  const label = ({ value, stars }) => `${format(value)} (${stars}★)`
  return { short: known.length === 1 ? label(known[0]) : `${label(known[0])} – ${label(known.at(-1))}`, full }
}
