import { sectionProblem } from '../events'
import { INGREDIENT_CATEGORIES } from './categories'

const isText = (value) => typeof value === 'string' && value.trim() !== ''
const isNullOr = (value, check) => value === null || check(value)
const isCount = (value) => Number.isInteger(value) && value >= 0

/**
 * Memeriksa daftar bahan terhadap skemanya (typedef di ingredients.js). Nilai `null` diperbolehkan untuk data yang
 * belum ditemukan (harus diberi TODO), tapi nilai yang diisi wajib valid. Harga beli dan harga jual bilangan bulat;
 * nilai desimal di sumber diisi null + TODO dan dicatat di `uncertain` (tampil "Belum pasti"). Bahan tidak punya
 * level, lokasi, maupun peta.
 * Dipakai oleh file data saat development dan oleh scripts/heartodex-sync.mjs.
 * @param {object[]} list
 * @returns {{ slug: string, problems: string[] }[]} hanya bahan yang bermasalah
 */
export function findIngredientProblems(list) {
  const seen = new Set()
  const report = []
  for (const item of list) {
    const problems = []
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(item.slug ?? '')) problems.push('slug tidak valid')
    if (seen.has(item.slug)) problems.push('slug dipakai lebih dari sekali')
    seen.add(item.slug)
    if (!isText(item.name)) problems.push('name wajib diisi')
    if (!isText(item.source)) problems.push('source wajib diisi')
    if (item.category != null && !INGREDIENT_CATEGORIES[item.category]) problems.push(`category "${item.category}" tidak dikenal`)
    const badSection = sectionProblem(item.section)
    if (badSection) problems.push(badSection)
    for (const key of ['description', 'descriptionOriginal', 'origin', 'image']) {
      if (!isNullOr(item[key] ?? null, isText)) problems.push(`${key} harus teks atau null`)
    }
    if (item.descriptionSourceLang !== undefined && (!/^[a-z]{2}$/.test(item.descriptionSourceLang) || item.descriptionSourceLang === 'en')) {
      problems.push('descriptionSourceLang harus kode bahasa 2 huruf selain "en"')
    }
    if (!isNullOr(item.buyPrice ?? null, isCount)) problems.push('buyPrice harus bilangan bulat ≥ 0 atau null')
    if (!isNullOr(item.sellPrice ?? null, isCount)) problems.push('sellPrice harus bilangan bulat ≥ 0 atau null')
    for (const key of item.uncertain ?? []) {
      if (!['buyPrice', 'sellPrice'].includes(key) || item[key] !== null) problems.push(`uncertain "${key}" harus field angka yang nilainya null`)
    }
    for (const key of ['level', 'locations', 'location', 'locationImage']) {
      if (key in item) problems.push(`bahan tidak punya ${key}`)
    }
    if (item.image && !(item.imageSize?.length === 2 && item.imageSize.every((v) => Number.isInteger(v) && v > 0))) {
      problems.push('imageSize harus [lebar, tinggi] bilangan bulat > 0')
    }
    if (problems.length) report.push({ slug: item.slug, problems })
  }
  return report
}
