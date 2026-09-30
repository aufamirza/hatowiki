import { sectionProblem } from '../events'
import { LOCATION_ZONES } from '../wildlife/locationZones'
import { NPC_CATEGORIES } from './categories'

const isText = (value) => typeof value === 'string' && value.trim() !== ''
const isNullOr = (value, check) => value === null || check(value)
const isCount = (value) => Number.isInteger(value) && value >= 0
const isCoordinate = (value) => typeof value === 'number' && value >= 0 && value <= 1000

/**
 * Memeriksa daftar NPC terhadap skemanya (typedef di npcs.js). Nilai `null` diperbolehkan untuk data yang belum
 * ditemukan (harus diberi TODO), tapi nilai yang diisi wajib valid. `shop[].item` = id benda 'items/<slug>' atau null
 * (barang yang belum punya halaman di Hatowiki); keberadaan benda itu dicek oleh tes, bukan di sini, supaya data NPC
 * tidak bergantung pada urutan muat modul. Dipakai oleh file data saat development dan oleh
 * scripts/heartodex-sync-extra.mjs.
 * @param {object[]} list
 * @returns {{ slug: string, problems: string[] }[]} hanya NPC yang bermasalah
 */
export function findNpcProblems(list) {
  const seen = new Set()
  const report = []
  for (const npc of list) {
    const problems = []
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(npc.slug ?? '')) problems.push('slug tidak valid')
    if (seen.has(npc.slug)) problems.push('slug dipakai lebih dari sekali')
    seen.add(npc.slug)
    if (!isText(npc.name)) problems.push('name wajib diisi')
    if (!isText(npc.source)) problems.push('source wajib diisi')
    if (npc.category != null && !NPC_CATEGORIES[npc.category]) problems.push(`category "${npc.category}" tidak dikenal`)
    const badSection = sectionProblem(npc.section)
    if (badSection) problems.push(badSection)
    for (const key of ['role', 'description', 'descriptionOriginal', 'locationImage', 'image']) {
      if (!isNullOr(npc[key] ?? null, isText)) problems.push(`${key} harus teks atau null`)
    }
    if (!Array.isArray(npc.favoriteGifts) || !npc.favoriteGifts.every(isText)) problems.push('favoriteGifts harus daftar teks')
    if (!Array.isArray(npc.locations)) problems.push('locations harus daftar')
    for (const location of npc.locations ?? []) {
      if (!isText(location.name)) problems.push('nama lokasi wajib diisi')
      if (location.zone != null && !LOCATION_ZONES[location.zone]) problems.push(`zona "${location.zone}" tidak ada di locationZones.js`)
    }
    if (npc.mapPin !== null && !(isCoordinate(npc.mapPin?.x) && isCoordinate(npc.mapPin?.y))) problems.push('mapPin harus { x, y } (0–1000) atau null')
    if (!Array.isArray(npc.shop)) problems.push('shop harus daftar')
    for (const offer of npc.shop ?? []) {
      if (!isNullOr(offer.item ?? null, (id) => /^items\/[a-z0-9-]+$/.test(id))) problems.push(`shop.item "${offer.item}" harus 'items/<slug>' atau null`)
      if (!isText(offer.name)) problems.push('shop.name wajib diisi')
      if (!isNullOr(offer.price ?? null, isCount)) problems.push('shop.price harus bilangan bulat ≥ 0 atau null')
    }
    for (const key of ['level', 'price']) {
      if (key in npc) problems.push(`NPC tidak punya ${key}`)
    }
    if (npc.image && !(npc.imageSize?.length === 2 && npc.imageSize.every((v) => Number.isInteger(v) && v > 0))) {
      problems.push('imageSize harus [lebar, tinggi] bilangan bulat > 0')
    }
    if (problems.length) report.push({ slug: npc.slug, problems })
  }
  return report
}
