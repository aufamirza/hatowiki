import { ALL_ITEMS } from '../items'

/**
 * Lokasi wildlife yang hanya bisa diakses lewat aktivitas atau item khusus, dipakai Target Sekarang di Checklist untuk
 * memisahkan entri di lokasi itu ke kelompok "Lokasi khusus". Ditentukan dari label lokasi di data (sama dengan label
 * lokasi di Heartodex), bukan ditebak per entri:
 * - label berawalan "[EVENT] " atau berakhiran " Event" = aktivitas khusus, mis. "[EVENT] Sea Fishing" (aktivitas Sea
 *   Fishing), "[EVENT] Nest of Hundreds", "Garfish Event";
 * - label yang sama persis dengan nama sebuah item = butuh item itu, mis. "Inflatable Insect Attractor" (katalog Items).
 * Keterangan tambahan hanya kalau ada di sumber: Sea Fishing adalah event harian (achievement Sea Fishing Master:
 * "Obtain all titles in Daily Sea Fishing Events.", https://www.heartodex.com/en/achievements/sea-fishing-master).
 * Ikan berkategori Mermaid Fish Attractor tidak termasuk: lokasinya di sumber lokasi biasa (All Lakes, All Rivers, …).
 */
const DAILY_ACTIVITIES = new Set(['Sea Fishing'])
const EVENT_PREFIX = '[EVENT] '
const EVENT_SUFFIX = ' Event'

/**
 * @returns {null | { type: 'item', item: string, name: string } | { type: 'activity', activity: string, daily: boolean }}
 *   null = lokasi biasa. `item` = id benda di src/data/items.js (items/<slug>).
 */
export function getSpecialLocation(name) {
  if (!name) return null
  const item = ALL_ITEMS.find((candidate) => candidate.id.startsWith('items/') && candidate.name === name)
  if (item) return { type: 'item', item: item.id, name: item.name }
  const activity = name.startsWith(EVENT_PREFIX) ? name.slice(EVENT_PREFIX.length) : name.endsWith(EVENT_SUFFIX) ? name : null
  return activity ? { type: 'activity', activity, daily: DAILY_ACTIVITIES.has(activity) } : null
}
