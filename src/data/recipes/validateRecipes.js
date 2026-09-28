import { sectionProblem } from '../events'
import { getItem } from '../items'
import { RECIPE_CATEGORIES } from './categories'

const isText = (value) => typeof value === 'string' && value.trim() !== ''
const isNullOr = (value, check) => value === null || check(value)
const isSlug = (value) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value ?? '')
const isStarList = (value) => value.length === 5 && value.every((v) => v === null || (Number.isInteger(v) && v >= 0))

/**
 * Memeriksa daftar resep terhadap skemanya (typedef di recipes.js). Nilai `null` diperbolehkan untuk data
 * yang belum ditemukan (harus diberi TODO), tapi nilai yang diisi wajib valid. Energi dan harga jual hanya
 * bilangan bulat; nilai desimal di sumber diisi null + TODO, tidak dibulatkan.
 * Dipakai oleh file data saat development dan oleh scripts/heartodex-sync.mjs.
 * @param {object[]} list
 * @returns {{ slug: string, problems: string[] }[]} hanya resep yang bermasalah
 */
export function findRecipeProblems(list) {
  const seen = new Set()
  const report = []

  for (const recipe of list) {
    const problems = []
    if (!isSlug(recipe.slug)) problems.push('slug tidak valid')
    if (seen.has(recipe.slug)) problems.push('slug dipakai lebih dari sekali')
    seen.add(recipe.slug)
    if (!isText(recipe.name)) problems.push('name wajib diisi')
    if (!isText(recipe.source)) problems.push('source wajib diisi')
    if (recipe.category != null && !RECIPE_CATEGORIES[recipe.category]) problems.push(`category "${recipe.category}" tidak dikenal`)
    const badSection = sectionProblem(recipe.section)
    if (badSection) problems.push(badSection)
    // Kelompok jenis masakan (tampilan): wajib; versi dasar paling banyak satu per kelompok (dicek setelah loop).
    if (!isSlug(recipe.family)) problems.push('family wajib diisi (huruf kecil & tanda hubung, mis. "pie")')
    if (recipe.familyBase !== undefined && recipe.familyBase !== true) problems.push('familyBase hanya boleh true (atau tidak diisi)')
    if (recipe.familyOrder !== undefined && !(Number.isInteger(recipe.familyOrder) && recipe.familyOrder >= 1)) {
      problems.push('familyOrder harus bilangan bulat ≥ 1 (atau tidak diisi)')
    }
    if (!isNullOr(recipe.level ?? null, (v) => Number.isInteger(v) && v >= 1)) problems.push('level harus bilangan bulat ≥ 1')
    if (!isNullOr(recipe.energy ?? null, isStarList)) problems.push('energy harus 5 bilangan bulat ≥ 0 (atau null) per bintang')
    if (!isNullOr(recipe.marketValue ?? null, isStarList)) problems.push('marketValue harus 5 bilangan bulat ≥ 0 (atau null) per bintang')
    if (!isNullOr(recipe.buffs ?? null, (v) => Array.isArray(v) && v.every(isText))) problems.push('buffs harus daftar teks atau null')
    // Opsional: indeks bintang yang nilainya desimal di sumber (null, tampil "Belum pasti").
    for (const [key, indexes] of Object.entries(recipe.uncertain ?? {})) {
      if (!['energy', 'marketValue'].includes(key)) problems.push(`uncertain.${key} tidak dikenal`)
      else if (!indexes.every((i) => Number.isInteger(i) && i >= 0 && i < 5 && recipe[key]?.[i] === null)) {
        problems.push(`uncertain.${key} harus berisi indeks bintang 0–4 yang nilainya null`)
      }
    }
    for (const key of ['description', 'descriptionOriginal', 'image']) {
      if (!isNullOr(recipe[key] ?? null, isText)) problems.push(`${key} harus teks atau null`)
    }
    if (recipe.image && !(recipe.imageSize?.length === 2 && recipe.imageSize.every((v) => Number.isInteger(v) && v > 0))) {
      problems.push('imageSize harus [lebar, tinggi] bilangan bulat > 0')
    }
    // Deskripsi disimpan tanpa tanda kutip pembuka/penutup seperti di sumber.
    if (/^["“]|["”]$/.test(recipe.descriptionOriginal ?? '')) problems.push('descriptionOriginal masih diapit tanda kutip')
    // Opsional: bahasa teks asli kalau bukan English (mis. 'es'); hanya berarti kalau teks aslinya ada.
    if (recipe.descriptionSourceLang !== undefined) {
      if (!/^[a-z]{2}$/.test(recipe.descriptionSourceLang ?? '') || recipe.descriptionSourceLang === 'en') {
        problems.push('descriptionSourceLang harus kode bahasa 2 huruf selain "en"')
      } else if (!recipe.descriptionOriginal) problems.push('descriptionSourceLang butuh descriptionOriginal')
    }

    if (!Array.isArray(recipe.ingredients)) problems.push('ingredients harus berupa array kelompok')
    else {
      for (const group of recipe.ingredients) {
        if (group.type === 'fixed') {
          if (!Array.isArray(group.items) || !group.items.length) problems.push('kelompok fixed harus punya items')
          for (const entry of group.items ?? []) {
            if (!getItem(entry.item)) problems.push(`bahan "${entry.item}" tidak ada di items.js`)
            if (!(Number.isInteger(entry.quantity) && entry.quantity >= 1)) problems.push(`jumlah bahan "${entry.item}" harus bilangan bulat ≥ 1`)
          }
        } else if (group.type === 'choose') {
          if (!Array.isArray(group.options) || !group.options.length) problems.push('kelompok choose harus punya options')
          if (!(Number.isInteger(group.count) && group.count >= 1)) problems.push('count kelompok choose harus bilangan bulat ≥ 1')
          for (const id of group.options ?? []) if (!getItem(id)) problems.push(`bahan "${id}" tidak ada di items.js`)
          if (new Set(group.options).size !== group.options?.length) problems.push('opsi bahan ganda dalam satu kelompok')
        } else {
          problems.push(`jenis kelompok bahan "${group.type}" tidak dikenal`)
        }
      }
    }
    if (problems.length) report.push({ slug: recipe.slug, problems })
  }

  const bases = new Map()
  const orders = new Map()
  // Kelompok hanya berlaku di dalam satu section, jadi versi dasar & urutan manual dihitung per (section, family).
  const groupOf = (recipe) => `${recipe.family} (${recipe.section})`
  for (const recipe of list) {
    if (recipe.familyBase === true) bases.set(groupOf(recipe), [...(bases.get(groupOf(recipe)) ?? []), recipe.slug])
    if (recipe.familyOrder !== undefined) {
      const key = `${groupOf(recipe)}#${recipe.familyOrder}`
      orders.set(key, [...(orders.get(key) ?? []), recipe.slug])
    }
  }
  for (const [group, slugs] of bases) {
    if (slugs.length > 1) report.push({ slug: slugs.join(', '), problems: [`kelompok "${group}" punya lebih dari satu familyBase`] })
  }
  for (const [key, slugs] of orders) {
    if (slugs.length > 1) report.push({ slug: slugs.join(', '), problems: [`familyOrder ${key.split('#')[1]} dipakai lebih dari sekali di kelompok "${key.split('#')[0]}"`] })
  }

  return report
}
