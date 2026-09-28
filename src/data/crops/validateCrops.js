import { sectionProblem } from '../events'
import { CROP_CATEGORIES } from './categories'

const isText = (value) => typeof value === 'string' && value.trim() !== ''
const isNullOr = (value, check) => value === null || check(value)
const isCount = (value) => Number.isInteger(value) && value >= 0

/**
 * Memeriksa daftar tanaman terhadap skemanya (typedef di crops.js). Nilai `null` diperbolehkan untuk data yang belum
 * ditemukan (harus diberi TODO), tapi nilai yang diisi wajib valid. Semua angka bilangan bulat; nilai desimal di
 * sumber diisi null + TODO dan dicatat di `uncertain` (tampil "Belum pasti").
 * Dipakai oleh file data saat development dan oleh scripts/heartodex-sync.mjs.
 * @param {object[]} list
 * @returns {{ slug: string, problems: string[] }[]} hanya tanaman yang bermasalah
 */
export function findCropProblems(list) {
  const seen = new Set()
  const report = []
  for (const crop of list) {
    const problems = []
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(crop.slug ?? '')) problems.push('slug tidak valid')
    if (seen.has(crop.slug)) problems.push('slug dipakai lebih dari sekali')
    seen.add(crop.slug)
    if (!isText(crop.name)) problems.push('name wajib diisi')
    if (!isText(crop.source)) problems.push('source wajib diisi')
    if (crop.category != null && !CROP_CATEGORIES[crop.category]) problems.push(`category "${crop.category}" tidak dikenal`)
    const badSection = sectionProblem(crop.section)
    if (badSection) problems.push(badSection)
    for (const key of ['description', 'descriptionOriginal', 'image']) {
      if (!isNullOr(crop[key] ?? null, isText)) problems.push(`${key} harus teks atau null`)
    }
    if (crop.descriptionSourceLang !== undefined && (!/^[a-z]{2}$/.test(crop.descriptionSourceLang) || crop.descriptionSourceLang === 'en')) {
      problems.push('descriptionSourceLang harus kode bahasa 2 huruf selain "en"')
    }
    if (!isNullOr(crop.level ?? null, (v) => Number.isInteger(v) && v >= 1)) problems.push('level harus bilangan bulat ≥ 1')
    if (!isNullOr(crop.seedPrice ?? null, isCount)) problems.push('seedPrice harus bilangan bulat ≥ 0 atau null')
    if (!isNullOr(crop.growthTime ?? null, isCount)) problems.push('growthTime harus jumlah detik (bilangan bulat ≥ 0) atau null')
    if (!Array.isArray(crop.starValues)) problems.push('starValues harus berupa array deret')
    else {
      for (const row of crop.starValues) {
        if (!isText(row.label)) problems.push('setiap deret starValues wajib punya label')
        if (!(Array.isArray(row.values) && row.values.length === 5 && row.values.every((v) => v === null || isCount(v)))) {
          problems.push(`deret "${row.label}" harus 5 bilangan bulat ≥ 0 (atau null)`)
        }
        if (row.uncertain !== undefined && !row.uncertain.every((i) => Number.isInteger(i) && row.values?.[i] === null)) {
          problems.push(`uncertain deret "${row.label}" harus berisi indeks bintang yang nilainya null`)
        }
      }
      if (new Set(crop.starValues.map((row) => row.label)).size !== crop.starValues.length) problems.push('label deret starValues ganda')
    }
    for (const key of crop.uncertain ?? []) {
      if (key !== 'seedPrice' || crop.seedPrice !== null) problems.push(`uncertain "${key}" harus field angka yang nilainya null`)
    }
    if (crop.image && !(crop.imageSize?.length === 2 && crop.imageSize.every((v) => Number.isInteger(v) && v > 0))) {
      problems.push('imageSize harus [lebar, tinggi] bilangan bulat > 0')
    }
    if (problems.length) report.push({ slug: crop.slug, problems })
  }
  return report
}
