/**
 * Waktu server dan periode waktu Heartopia.
 *
 * Sumber: script jam di halaman detail Heartodex, mis. https://www.heartodex.com/en/fish/sea-bass
 * (diperiksa 2026-09-26):
 *  - Waktu server = UTC + offset tetap per server (atribut `data-offset`). Tidak ada daylight saving.
 *  - Periode (fungsi `getPhase`): Night 00–06, Dawn 06–12, Day 12–18, Dusk 18–24.
 * Offset dicocokkan ulang dengan
 * https://www.heartopialog.com/2026/03/heartopia-server-list-timezone-guide.html
 */

export const SERVERS = [
  { id: 'america', name: 'America', utcOffset: -5 },
  { id: 'global', name: 'Global', utcOffset: 1 },
  { id: 'sea', name: 'SEA', utcOffset: 7 },
  { id: 'tw-hk-mo', name: 'TW HK MO', utcOffset: 8 },
  { id: 'asia', name: 'Asia', utcOffset: 9 },
]

// Urut kronologis mulai pagi; `id` sama persis dengan label schedule di data ikan.
export const PERIODS = [
  { id: 'Dawn', emoji: '🌅', startHour: 6, endHour: 12 },
  { id: 'Day', emoji: '☀️', startHour: 12, endHour: 18 },
  { id: 'Dusk', emoji: '🌇', startHour: 18, endHour: 24 },
  { id: 'Night', emoji: '🌙', startHour: 0, endHour: 6 },
]

const HOUR_MS = 3_600_000

export function getServerTime(date, utcOffset) {
  const shifted = new Date(date.getTime() + utcOffset * HOUR_MS)
  return { hours: shifted.getUTCHours(), minutes: shifted.getUTCMinutes() }
}

export function getPeriod(hour) {
  return PERIODS.find((period) => hour >= period.startHour && hour < period.endHour)
}

export function formatClock(hours, minutes) {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function formatUtcOffset(offset) {
  if (offset === 0) return 'UTC'
  return `UTC${offset > 0 ? '+' : '−'}${Math.abs(offset)}`
}

export function formatPeriodRange(period) {
  const pad = (hour) => `${String(hour).padStart(2, '0')}.00`
  return `${pad(period.startHour)}–${pad(period.endHour)}`
}
