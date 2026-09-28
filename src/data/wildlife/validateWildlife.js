import { PERIODS } from '../gameTime'
import { sectionProblem } from '../events'
import { getItem } from '../items'
import { WEATHERS, SHADOWS } from './attributes'
import { getWildlifeCategory } from './categories'
import { LOCATION_ZONES } from './locationZones'

const PERIOD_IDS = PERIODS.map((period) => period.id)
const WEATHER_IDS = WEATHERS.map((weather) => weather.id)

const isText = (value) => typeof value === 'string' && value.trim() !== ''
const isNullOr = (value, check) => value === null || check(value)

/**
 * Memeriksa daftar entri wildlife terhadap skema kategorinya (lihat WILDLIFE_CATEGORIES di categories.js
 * dan typedef di fish.js / bugs.js / birds.js / animals.js). Nilai `null` diperbolehkan untuk data yang belum ditemukan
 * (harus diberi TODO), tapi nilai yang diisi wajib valid.
 * Dipakai oleh file data saat development dan oleh scripts/heartodex-sync.mjs.
 * @param {object[]} list
 * @param {'fish' | 'bugs' | 'birds' | 'animals'} kind slug kategori wildlife
 * @returns {{ slug: string, problems: string[] }[]} hanya entri yang bermasalah
 */
export function findWildlifeProblems(list, kind) {
  const schema = getWildlifeCategory(kind)
  const seen = new Set()
  const report = []

  for (const item of list) {
    const problems = []
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(item.slug ?? '')) problems.push('slug tidak valid')
    if (seen.has(item.slug)) problems.push('slug dipakai lebih dari sekali')
    seen.add(item.slug)
    if (!isText(item.name)) problems.push('name wajib diisi')
    if (!isText(item.source)) problems.push('source wajib diisi')
    if (item.category != null && !schema.entryCategories[item.category]) problems.push(`category "${item.category}" tidak dikenal`)
    const badSection = sectionProblem(item.section)
    if (badSection) problems.push(badSection)
    if (schema.hasShadow) {
      if (item.shadow != null && !SHADOWS[item.shadow]) problems.push(`shadow "${item.shadow}" tidak dikenal`)
    } else if ('shadow' in item) {
      problems.push(`${kind} tidak punya field shadow`)
    }
    if (!isNullOr(item.level ?? null, (v) => Number.isInteger(v) && v >= 1)) problems.push('level harus bilangan bulat ≥ 1')
    // Field yang tidak ada di skema kategori ini (mis. hewan tanpa level, jadwal, dan harga) tidak boleh diisi.
    for (const [flag, key] of [['hasLevel', 'level'], ['hasSchedule', 'schedule'], ['hasMarketValue', 'marketValue'], ['hasMarketValue', 'marketValueMissing'], ['hasFavoriteFood', 'favoriteFood'], ['hasFavoriteFood', 'feedingSpot']]) {
      if (!schema[flag] && key in item) problems.push(`${kind} tidak punya field ${key}`)
    }
    if (schema.hasFavoriteFood) {
      if (!Array.isArray(item.favoriteFood)) problems.push('favoriteFood harus berupa array')
      else {
        for (const id of item.favoriteFood) if (!getItem(id)) problems.push(`makanan "${id}" tidak ada di items.js`)
        if (new Set(item.favoriteFood).size !== item.favoriteFood.length) problems.push('favoriteFood berisi makanan ganda')
      }
      const spot = item.feedingSpot ?? null
      const inMap = (v) => Number.isFinite(v) && v >= 0 && v <= 1000
      if (!isNullOr(spot, (v) => inMap(v.x) && inMap(v.y) && Object.keys(v).length === 2)) problems.push('feedingSpot harus { x, y } di dalam peta 0–1000 atau null')
    }
    if (item.marketValue != null) {
      if (item.marketValue.length !== 5) problems.push('marketValue harus berisi 5 angka')
      if (schema.integerPrices) {
        // Harga desimal di sumber diisi null + TODO (tampil "Belum pasti"), tidak dibulatkan.
        if (!item.marketValue.every((v) => v === null || (Number.isInteger(v) && v >= 0))) {
          problems.push('isi marketValue harus bilangan bulat ≥ 0 atau null')
        }
      } else if (!item.marketValue.every((v) => v === null || (Number.isFinite(v) && v >= 0))) {
        // Bisa pecahan: harga 2★ ikan di sumber kadang desimal, mis. "232,5".
        problems.push('isi marketValue harus angka ≥ 0')
      }
    }
    // Opsional: indeks bintang (0 = 1★) yang tidak dicantumkan di sumber; harga jualnya null dan tampil "—".
    if (item.marketValueMissing !== undefined) {
      const missing = item.marketValueMissing
      const valid = Array.isArray(missing) && missing.length > 0 && new Set(missing).size === missing.length &&
        missing.every((i) => Number.isInteger(i) && i >= 0 && i <= 4 && item.marketValue?.[i] === null)
      if (!valid) problems.push('marketValueMissing harus berisi indeks bintang 0–4 (tanpa ganda) yang harga jualnya null')
    }
    for (const value of item.schedule ?? []) {
      if (!PERIOD_IDS.includes(value)) problems.push(`schedule "${value}" tidak dikenal`)
    }
    for (const value of item.weather ?? []) {
      if (!WEATHER_IDS.includes(value)) problems.push(`weather "${value}" tidak dikenal`)
    }
    for (const key of ['description', 'descriptionOriginal', 'image', 'locationImage']) {
      if (!isNullOr(item[key] ?? null, isText)) problems.push(`${key} harus teks atau null`)
    }
    // Opsional: ukuran asli gambar [lebar, tinggi] untuk width/height <img>; tanpa field ini dianggap 400×400.
    if (item.imageSize != null && !(item.imageSize.length === 2 && item.imageSize.every((v) => Number.isInteger(v) && v > 0))) {
      problems.push('imageSize harus [lebar, tinggi] bilangan bulat > 0')
    }
    // Ikan: satu `location` + `locationZone`; ikan dengan beberapa lokasi di sumber memakai `locations` (≥ 2) seperti serangga.
    const fishWithLocations = !schema.multiLocation && 'locations' in item
    if (schema.multiLocation || fishWithLocations) {
      if (!Array.isArray(item.locations)) problems.push('locations harus berupa array')
      else {
        const names = new Set()
        for (const location of item.locations) {
          if (!isText(location?.name)) problems.push('setiap lokasi wajib punya name')
          else if (names.has(location.name)) problems.push(`lokasi "${location.name}" ganda`)
          else names.add(location.name)
          if (location?.zone != null && !LOCATION_ZONES[location.zone]) problems.push(`zona "${location.zone}" tidak ada`)
        }
        if (fishWithLocations && item.locations.length < 2) problems.push('locations hanya untuk ikan dengan beberapa lokasi; satu lokasi memakai location/locationZone')
      }
      if ('location' in item || 'locationZone' in item) problems.push(`${kind} memakai locations, bukan location/locationZone`)
    } else {
      if (!isNullOr(item.location ?? null, isText)) problems.push('location harus teks atau null')
      if (item.locationZone && !LOCATION_ZONES[item.locationZone]) problems.push(`locationZone: zona "${item.locationZone}" tidak ada`)
    }
    if (problems.length) report.push({ slug: item.slug, problems })
  }

  return report
}
