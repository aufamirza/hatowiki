import { sectionProblem } from '../events'
import { HOBBY_ITEM_CATEGORIES } from './categories'

const isText = (value) => typeof value === 'string' && value.trim() !== ''
const isNullOr = (value, check) => value === null || check(value)
const isCount = (value) => Number.isInteger(value) && value >= 0

/**
 * Memeriksa daftar item (benda pakai) terhadap skemanya (typedef di hobbyItems.js). Nilai `null` diperbolehkan untuk
 * data yang belum ditemukan (harus diberi TODO), tapi nilai yang diisi wajib valid. Harga bilangan bulat. Penjual tidak
 * disimpan di item (dihitung dari data NPC). Dipakai oleh file data saat development dan oleh
 * scripts/heartodex-sync-extra.mjs.
 * @param {object[]} list
 * @returns {{ slug: string, problems: string[] }[]} hanya item yang bermasalah
 */
export function findHobbyItemProblems(list) {
  const seen = new Set()
  const report = []
  for (const item of list) {
    const problems = []
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(item.slug ?? '')) problems.push('slug tidak valid')
    if (seen.has(item.slug)) problems.push('slug dipakai lebih dari sekali')
    seen.add(item.slug)
    if (!isText(item.name)) problems.push('name wajib diisi')
    if (!isText(item.source)) problems.push('source wajib diisi')
    if (item.category != null && !HOBBY_ITEM_CATEGORIES[item.category]) problems.push(`category "${item.category}" tidak dikenal`)
    const badSection = sectionProblem(item.section)
    if (badSection) problems.push(badSection)
    for (const key of ['description', 'descriptionOriginal', 'image']) {
      if (!isNullOr(item[key] ?? null, isText)) problems.push(`${key} harus teks atau null`)
    }
    if (item.descriptionSourceLang !== undefined && (!/^[a-z]{2}$/.test(item.descriptionSourceLang) || item.descriptionSourceLang === 'en')) {
      problems.push('descriptionSourceLang harus kode bahasa 2 huruf selain "en"')
    }
    if (!isNullOr(item.price ?? null, isCount)) problems.push('price harus bilangan bulat ≥ 0 atau null')
    for (const key of ['level', 'locations', 'soldBy']) {
      if (key in item) problems.push(`item tidak menyimpan ${key}`)
    }
    if (item.image && !(item.imageSize?.length === 2 && item.imageSize.every((v) => Number.isInteger(v) && v > 0))) {
      problems.push('imageSize harus [lebar, tinggi] bilangan bulat > 0')
    }
    if (problems.length) report.push({ slug: item.slug, problems })
  }
  return report
}
