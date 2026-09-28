import { sectionProblem } from '../events'
import { LOCATION_ZONES } from '../wildlife/locationZones'
import { COLLECTIBLE_CATEGORIES } from './categories'

const isText = (value) => typeof value === 'string' && value.trim() !== ''
const isNullOr = (value, check) => value === null || check(value)
const isCount = (value) => Number.isInteger(value) && value >= 0

/**
 * Memeriksa daftar collectible terhadap skemanya (typedef di collectibles.js). Nilai `null` diperbolehkan untuk data
 * yang belum ditemukan (harus diberi TODO), tapi nilai yang diisi wajib valid. Nilai jual dan energi bilangan bulat;
 * nilai desimal di sumber diisi null + TODO dan dicatat di `uncertain` (tampil "Belum pasti").
 * Dipakai oleh file data saat development dan oleh scripts/heartodex-sync.mjs.
 * @param {object[]} list
 * @returns {{ slug: string, problems: string[] }[]} hanya collectible yang bermasalah
 */
export function findCollectibleProblems(list) {
  const seen = new Set()
  const report = []
  for (const item of list) {
    const problems = []
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(item.slug ?? '')) problems.push('slug tidak valid')
    if (seen.has(item.slug)) problems.push('slug dipakai lebih dari sekali')
    seen.add(item.slug)
    if (!isText(item.name)) problems.push('name wajib diisi')
    if (!isText(item.source)) problems.push('source wajib diisi')
    if (item.category != null && !COLLECTIBLE_CATEGORIES[item.category]) problems.push(`category "${item.category}" tidak dikenal`)
    const badSection = sectionProblem(item.section)
    if (badSection) problems.push(badSection)
    for (const key of ['description', 'descriptionOriginal', 'image', 'locationImage']) {
      if (!isNullOr(item[key] ?? null, isText)) problems.push(`${key} harus teks atau null`)
    }
    if (item.descriptionSourceLang !== undefined && (!/^[a-z]{2}$/.test(item.descriptionSourceLang) || item.descriptionSourceLang === 'en')) {
      problems.push('descriptionSourceLang harus kode bahasa 2 huruf selain "en"')
    }
    if (!isNullOr(item.sellValue ?? null, isCount)) problems.push('sellValue harus bilangan bulat ≥ 0 atau null')
    if (!isNullOr(item.energy ?? null, isCount)) problems.push('energy harus bilangan bulat ≥ 0 atau null')
    for (const key of item.uncertain ?? []) {
      if (!['sellValue', 'energy'].includes(key) || item[key] !== null) problems.push(`uncertain "${key}" harus field angka yang nilainya null`)
    }
    if (!Array.isArray(item.locations)) problems.push('locations harus berupa array')
    else {
      const names = new Set()
      for (const location of item.locations) {
        if (!isText(location?.name)) problems.push('setiap lokasi wajib punya name')
        else if (names.has(location.name)) problems.push(`lokasi "${location.name}" ganda`)
        else names.add(location.name)
        if (location?.zone != null && !LOCATION_ZONES[location.zone]) problems.push(`zona "${location.zone}" tidak ada`)
      }
    }
    if (item.image && !(item.imageSize?.length === 2 && item.imageSize.every((v) => Number.isInteger(v) && v > 0))) {
      problems.push('imageSize harus [lebar, tinggi] bilangan bulat > 0')
    }
    if (problems.length) report.push({ slug: item.slug, problems })
  }
  return report
}
