/**
 * Nilai atribut yang valid untuk data wildlife.
 *
 * Daftar ini dikumpulkan dari seluruh 124 ikan di https://www.heartodex.com/en/fish (diperiksa 2026-09-26),
 * seluruh 101 serangga di https://www.heartodex.com/en/insects, dan seluruh 103 burung di
 * https://www.heartodex.com/en/birds (keduanya diperiksa 2026-09-27), jadi komponen sudah siap menampilkan
 * ikan, serangga, atau burung mana pun tanpa diubah. Cuaca & waktu sama untuk ketiganya. Hewan liar
 * (Animals) memakai daftar cuaca yang sama untuk cuaca favoritnya.
 * Label memakai nama resmi berbahasa Inggris seperti di game.
 */

// Small/Medium/Large adalah ukuran bayangan; Gold dan Blue adalah bayangan berwarna.
export const SHADOWS = {
  Small: { size: 1 },
  Medium: { size: 2 },
  Large: { size: 3 },
  Gold: { tone: 'gold' },
  Blue: { tone: 'blue' },
}

export const WEATHERS = [
  { id: 'Rainbow', emoji: '🌈' },
  { id: 'Sunny', emoji: '🌞' },
  { id: 'Rainy', emoji: '🌧️' },
]

// Kategori beserta ikonnya persis seperti di Heartodex. Ditampilkan apa adanya, bukan tingkat rarity.
export const FISH_CATEGORIES = {
  Common: { emoji: '🏠' },
  'Sea Fishing': { emoji: '🎣' },
  'Call of Whales': { emoji: '🐳' },
  'Mermaid Fish Attractor': { emoji: '🧜‍♀️' },
  'Dreamlight Cinematics': { emoji: '🎬' },
  'Modular Streets': { emoji: '🧩' },
  'Winter frost season': { emoji: '⛄' },
  'Echo of Ancients': { emoji: '🦖' },
}

// Kategori serangga beserta ikonnya persis seperti di Heartodex (semua bagian, termasuk event).
export const BUG_CATEGORIES = {
  Common: { emoji: '🏠' },
  'Bait the Insects': { emoji: '🐞' },
  'Call of Whales': { emoji: '🐳' },
  'Dreamlight Cinematics': { emoji: '🎬' },
  'Modular Streets': { emoji: '🧩' },
  'Winter frost season': { emoji: '⛄' },
  'Echo of Ancients': { emoji: '🦖' },
}

// Kategori burung beserta ikonnya persis seperti di Heartodex (semua bagian, termasuk event).
export const BIRD_CATEGORIES = {
  Common: { emoji: '🏠' },
  'Nest of Hundreds': { emoji: '🦚' },
  'Call of Whales': { emoji: '🐳' },
  'Dreamlight Cinematics': { emoji: '🎬' },
  'Modular Streets': { emoji: '🧩' },
  'Winter frost season': { emoji: '⛄' },
  'Echo of Ancients': { emoji: '🦖' },
}

// Kategori hewan liar beserta ikonnya persis seperti di Heartodex, dari seluruh 11 hewan di
// https://www.heartodex.com/en/wild-animals (semua bagian, termasuk event; diperiksa 2026-09-27).
export const ANIMAL_CATEGORIES = {
  Common: { emoji: '🏠' },
  'Call of Whales': { emoji: '🐳' },
  Maltese: { emoji: '🦴' },
  'Winter frost season': { emoji: '⛄' },
}
