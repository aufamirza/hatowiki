import { sectionProblem } from '../events'
import { ACHIEVEMENT_CATEGORIES } from './categories'

const isText = (value) => typeof value === 'string' && value.trim() !== ''
const isNullOr = (value, check) => value === null || check(value)

/**
 * Memeriksa daftar achievement terhadap skemanya (typedef di achievements.js). Nilai `null` diperbolehkan untuk data yang
 * belum ditemukan (harus diberi TODO), tapi nilai yang diisi wajib valid. Achievement tidak punya level, lokasi, maupun
 * harga. Dipakai oleh file data saat development dan oleh scripts/heartodex-sync-extra.mjs.
 * @param {object[]} list
 * @returns {{ slug: string, problems: string[] }[]} hanya achievement yang bermasalah
 */
export function findAchievementProblems(list) {
  const seen = new Set()
  const report = []
  for (const item of list) {
    const problems = []
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(item.slug ?? '')) problems.push('slug tidak valid')
    if (seen.has(item.slug)) problems.push('slug dipakai lebih dari sekali')
    seen.add(item.slug)
    if (!isText(item.name)) problems.push('name wajib diisi')
    if (!isText(item.source)) problems.push('source wajib diisi')
    if (item.category != null && !ACHIEVEMENT_CATEGORIES[item.category]) problems.push(`category "${item.category}" tidak dikenal`)
    const badSection = sectionProblem(item.section)
    if (badSection) problems.push(badSection)
    for (const key of ['description', 'descriptionOriginal', 'rewardTitle', 'rewardCategory', 'image']) {
      if (!isNullOr(item[key] ?? null, isText)) problems.push(`${key} harus teks atau null`)
    }
    if ('hidden' in item && item.hidden !== true) problems.push('hidden hanya ditulis untuk achievement tersembunyi (true)')
    for (const key of ['level', 'locations', 'price']) {
      if (key in item) problems.push(`achievement tidak punya ${key}`)
    }
    if (item.image && !(item.imageSize?.length === 2 && item.imageSize.every((v) => Number.isInteger(v) && v > 0))) {
      problems.push('imageSize harus [lebar, tinggi] bilangan bulat > 0')
    }
    if (problems.length) report.push({ slug: item.slug, problems })
  }
  return report
}
