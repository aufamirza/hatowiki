import { npcs } from './npcs/npcs'

/**
 * Hubungan benda dengan NPC, dihitung dari data NPC (src/data/npcs/npcs.js), bukan disalin dari halaman benda di
 * Heartodex. Jadi NPC atau barang dagangan yang ditambahkan nanti otomatis ikut.
 */

/**
 * NPC yang menjual benda ini (daftar "Items for sale"), beserta harganya di NPC itu, urut seperti data NPC.
 * @param {string} itemId id benda, mis. 'items/bait' atau 'ingredients/egg'
 * @returns {{ npc: object, price: ?number }[]}
 */
export function sellersOf(itemId) {
  return npcs.flatMap((npc) => npc.shop.filter((offer) => offer.item === itemId).map((offer) => ({ npc, price: offer.price })))
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Nama terpanjang dicocokkan lebih dulu (mis. "Albert Jr" sebelum nama pendek yang mungkin jadi bagiannya).
const NAME_PATTERN = new RegExp(
  `(?<![\\p{L}\\p{N}])(${[...npcs].sort((a, b) => b.name.length - a.name.length).map((npc) => escapeRegExp(npc.name)).join('|')})(?![\\p{L}\\p{N}])`,
  'gu',
)

/**
 * Memecah teks menjadi potongan teks biasa dan nama NPC yang disebut di dalamnya (mis. "Toko Massimo" →
 * ["Toko ", Massimo]). Dipakai untuk menautkan nama NPC di "Didapat dari" bahan masak, dalam bahasa apa pun (nama NPC
 * tidak diterjemahkan).
 * @returns {(string | { npc: object, text: string })[]}
 */
export function splitNpcMentions(text) {
  if (!text || !npcs.length) return text ? [text] : []
  const parts = []
  let last = 0
  for (const match of text.matchAll(NAME_PATTERN)) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    parts.push({ npc: npcs.find((npc) => npc.name === match[1]), text: match[1] })
    last = match.index + match[1].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}
