import { PERIODS } from '../../data/gameTime'
import { getEntryLocations } from '../../data/wildlife/entryLocations'
import { getSpecialLocation } from '../../data/wildlife/specialLocations'
import { isBaseGame } from '../catalog/sections'

/** Periode sesudah `period` (Dawn → Day → Dusk → Night → Dawn). */
export const nextPeriodOf = (period) => PERIODS.find((item) => item.startHour === period.endHour % 24)

/**
 * Kelompok per lokasi: { groups, special }, masing-masing [{ name, entries, special? }]. Lokasi dengan entri terbanyak
 * (yang levelnya cukup) paling atas, seri urut nama. Entri dengan beberapa lokasi masuk ke setiap lokasinya, jadi entri
 * yang punya lokasi biasa dan lokasi khusus tampil di keduanya. Lokasi khusus (aktivitas atau item khusus, lihat
 * specialLocations.js) dipisah ke `special`, yang ditampilkan paling bawah. Di dalam lokasi: level terendah dulu, lalu
 * urutan data. Entri yang levelnya terlalu tinggi (`locked`) ditaruh di bawah entri lain di lokasinya.
 */
function groupByLocation(items, kind) {
  const groups = new Map()
  for (const item of items) {
    for (const location of getEntryLocations(kind.wildlife, item.entry)) {
      if (!groups.has(location.name)) groups.set(location.name, [])
      groups.get(location.name).push(item)
    }
  }
  const open = (list) => list.filter((item) => !item.locked).length
  const sorted = [...groups]
    .map(([name, list]) => ({
      name,
      special: getSpecialLocation(name),
      entries: [...list].sort((a, b) => Number(a.locked) - Number(b.locked) || a.entry.level - b.entry.level || a.index - b.index),
    }))
    .sort((a, b) => open(b.entries) - open(a.entries) || b.entries.length - a.entries.length || a.name.localeCompare(b.name, 'en'))
  return { groups: sorted.filter((group) => !group.special), special: sorted.filter((group) => group.special) }
}

/**
 * Target Sekarang untuk satu kategori wildlife: entri yang belum didapat, cocok dengan cuaca pilihan, dan muncul di
 * `period` (now) atau baru muncul di periode berikutnya (next: jadwalnya mencakup periode berikutnya tapi tidak periode
 * sekarang). Entri Base Game selalu ikut; entri event hanya kalau eventnya ada di `events` (event yang menurut pemain
 * sedang berjalan di game).
 * Entri dengan syarat level di atas `level` pemain dihitung terpisah (`lockedCount`); kalau `showLocked`, entri itu ikut
 * dikelompokkan dengan tanda `locked: true` (tampil redup).
 * @returns {{ now: Section, next: Section }} Section = { groups, special, count, lockedCount }
 */
export function buildCatchNow({ kind, obtained, level, period, weather, showLocked, events = [] }) {
  const next = nextPeriodOf(period)
  const candidates = kind.entries
    .map((entry, index) => ({ entry, index, locked: (entry.level ?? 1) > level }))
    .filter(({ entry }) => (isBaseGame(entry) || events.includes(entry.section)) && !obtained.has(entry.slug) && entry.weather?.includes(weather))
  const section = (items) => {
    const open = items.filter((item) => !item.locked)
    return {
      ...groupByLocation(showLocked ? items : open, kind),
      count: open.length,
      lockedCount: items.length - open.length,
    }
  }
  return {
    now: section(candidates.filter(({ entry }) => entry.schedule?.includes(period.id))),
    next: section(candidates.filter(({ entry }) => !entry.schedule?.includes(period.id) && entry.schedule?.includes(next.id))),
  }
}
