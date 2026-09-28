/**
 * Section di halaman daftar (Fish, Bugs, Birds, Animals, Resep, Crops, Collectibles). Setiap entri punya field
 * `section`: 'Base Game' atau nama salah satu event di bawah, diambil dari posisi entri di halaman daftar Heartodex
 * (bukan dari kategorinya: mis. Striped Red Mullet berkategori Sea Fishing tetap di section Base Game).
 *
 * Urutan section: Base Game selalu paling atas, lalu event dari yang paling baru dimulai sampai yang paling lama.
 * Heartodex mengurutkan section event menurut abjad, jadi urutannya diambil dari `startDate` di sini. Tanggal hanya
 * dipakai untuk mengurutkan dan tidak ditampilkan; status event (aktif/selesai) sengaja tidak disimpan.
 *
 * @typedef {Object} GameEvent
 * @property {string}  name       Sama persis dengan nama kategori di data dan judul section di Heartodex (mis. 'Winter
 *                                frost season', walaupun halaman event Heartodex menulis "Winter Frost Season").
 * @property {string}  emoji      Ikon kategori event, sama dengan di data kategori (attributes.js, recipes/categories.js, …).
 * @property {?string} startDate  Tanggal mulai (YYYY-MM-DD, waktu server). null + TODO kalau belum ketemu: section-nya
 *                                ditaruh paling bawah.
 * @property {?string} source     Halaman yang mencantumkan tanggal mulai itu.
 *
 * Kategori yang entrinya ada di section Base Game (Sea Fishing, Bait the Insects, Nest of Hundreds, Mermaid Fish
 * Attractor, Meteor Shower) bukan event di sini.
 */

export const BASE_GAME = 'Base Game'
export const BASE_GAME_EMOJI = '🎮'

// Tanggal mulai dari halaman tiap event di Heartodex ("Start Date"), diperiksa 2026-09-28.
/** @type {GameEvent[]} */
export const EVENTS = [
  {
    name: 'Autumn Moon Treasury',
    emoji: '🍂',
    startDate: '2026-09-24',
    source: 'https://www.heartodex.com/en/events/autumn-moon-treasury',
  },
  {
    name: 'Burger Bliss',
    emoji: '🍔',
    startDate: '2026-09-19',
    source: 'https://www.heartodex.com/en/events/burger-bliss',
  },
  {
    name: 'Echo of Ancients',
    emoji: '🦖',
    startDate: '2026-08-29',
    source: 'https://www.heartodex.com/en/events/echo-of-ancients',
  },
  {
    name: 'Qixi Fair',
    emoji: '🪷',
    startDate: '2026-08-15',
    source: 'https://www.heartodex.com/en/events/qixi-fair',
  },
  {
    name: 'Dave the Diver',
    emoji: '🤿',
    startDate: '2026-08-08',
    source: 'https://www.heartodex.com/en/events/dave-the-diver',
  },
  {
    name: 'SANRIO CHARACTERS',
    emoji: '🫧',
    startDate: '2026-07-17',
    source: 'https://www.heartodex.com/en/events/sanrio-characters',
  },
  {
    name: 'Call of Whales',
    emoji: '🐳',
    startDate: '2026-07-11',
    source: 'https://www.heartodex.com/en/events/call-of-whales',
  },
  {
    name: 'Midsummer Rhyme',
    emoji: '🌾',
    startDate: '2026-06-19',
    source: 'https://www.heartodex.com/en/events/midsummer-rhyme',
  },
  {
    name: 'Rainbow Verse',
    emoji: '🌈',
    startDate: '2026-05-28',
    source: 'https://www.heartodex.com/en/events/rainbow-verse',
  },
  {
    name: 'Modular Streets',
    emoji: '🧩',
    startDate: '2026-05-09',
    source: 'https://www.heartodex.com/en/events/modular-streets',
  },
  {
    name: 'Maltese',
    emoji: '🦴',
    startDate: '2026-04-30',
    source: 'https://www.heartodex.com/en/events/maltese',
  },
  {
    name: 'Dreamlight Cinematics',
    emoji: '🎬',
    startDate: '2026-03-21',
    source: 'https://www.heartodex.com/en/events/dreamlight-cinematics',
  },
  {
    name: 'Winter frost season',
    emoji: '⛄',
    startDate: '2026-01-24',
    source: 'https://www.heartodex.com/en/events/winter-frost-season',
  },
]

const EVENTS_BY_NAME = new Map(EVENTS.map((event) => [event.name, event]))

// Base Game → 0; event bertanggal → 1, 2, … dari yang terbaru; event tanpa tanggal lalu section tak dikenal di bawah.
const DATED = EVENTS.filter((event) => event.startDate).sort((a, b) => b.startDate.localeCompare(a.startDate))
const UNDATED = EVENTS.filter((event) => !event.startDate)
const RANK = new Map([[BASE_GAME, 0], ...[...DATED, ...UNDATED].map((event, index) => [event.name, index + 1])])

/** Emoji & nama untuk judul section. Section yang tidak dikenal tampil tanpa emoji khusus. */
export function getSection(name) {
  if (name === BASE_GAME) return { name, emoji: BASE_GAME_EMOJI, isEvent: false }
  const event = EVENTS_BY_NAME.get(name)
  return { name, emoji: event?.emoji ?? '📌', isEvent: true }
}

/** Pembanding urutan section: Base Game, lalu event terbaru → terlama, lalu tanpa tanggal, lalu yang tidak dikenal. */
export function compareSections(a, b) {
  const rank = (name) => RANK.get(name) ?? RANK.size
  return rank(a) - rank(b) || a.localeCompare(b, 'en')
}

/** null kalau `section` valid ('Base Game' atau nama event di EVENTS), selain itu pesan masalahnya. */
export function sectionProblem(section) {
  if (section === BASE_GAME || EVENTS_BY_NAME.has(section)) return null
  return section == null ? 'section wajib diisi' : `section "${section}" tidak dikenal (tambahkan eventnya di src/data/events.js)`
}

/**
 * Memeriksa data event. Dipakai saat development dan oleh tes.
 * @returns {string[]} daftar masalah
 */
export function findEventProblems(list = EVENTS) {
  const problems = []
  const seen = new Set()
  for (const event of list) {
    if (!event.name?.trim()) problems.push('event tanpa name')
    if (seen.has(event.name)) problems.push(`event "${event.name}" ganda`)
    seen.add(event.name)
    if (event.name === BASE_GAME) problems.push('"Base Game" bukan event')
    if (!event.emoji?.trim()) problems.push(`${event.name}: emoji wajib diisi`)
    if (event.startDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(event.startDate ?? '')) problems.push(`${event.name}: startDate harus YYYY-MM-DD atau null`)
    if (event.startDate && !/^https:\/\//.test(event.source ?? '')) problems.push(`${event.name}: source wajib diisi kalau startDate ada`)
  }
  return problems
}

if (import.meta.env?.DEV) {
  for (const problem of findEventProblems()) console.warn(`[data event] ${problem}`)
}
