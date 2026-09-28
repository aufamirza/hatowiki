import { BASE_GAME, compareSections, getSection } from '../../data/events'

/**
 * Hasil halaman daftar dibagi per section (field `section` tiap entri): Base Game paling atas, lalu event dari yang
 * terbaru sampai yang terlama (lihat src/data/events.js). Urutan entri di dalam section mengikuti `entries` (yang sudah
 * dicari, difilter, dan diurutkan), jadi pencarian, filter, dan urutan berlaku di dalam tiap section. Section tanpa
 * hasil tidak ikut.
 * @returns {{ name: string, emoji: string, isEvent: boolean, entries: object[] }[]}
 */
export function groupBySection(entries) {
  const groups = new Map()
  for (const entry of entries) {
    const name = entry.section ?? BASE_GAME
    if (!groups.has(name)) groups.set(name, [])
    groups.get(name).push(entry)
  }
  return [...groups.keys()].sort(compareSections).map((name) => ({ ...getSection(name), entries: groups.get(name) }))
}

/** Entri yang ada di section Base Game (bisa didapat kapan saja, bukan konten event). */
export const isBaseGame = (entry) => (entry.section ?? BASE_GAME) === BASE_GAME
