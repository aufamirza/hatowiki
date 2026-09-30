import manual from '../../data/manual/descriptions.json'

/**
 * Deskripsi isian manual (data/manual/descriptions.json): entri yang deskripsinya tidak ada di heartodex, atau ada tapi
 * disembunyikan karena salah salin, bisa diisi sendiri dengan teks bahasa Inggris yang dilihat langsung di game (kolom
 * `en`). Begitu diisi, teks itu yang menjadi deskripsi asli entri tersebut dengan sumber "in-game", dan mengalahkan apa
 * pun yang ada di file data dari heartodex. Skrip sinkronisasi tidak pernah menulis ke berkas itu, jadi isiannya tidak
 * bisa tertimpa. Kolom `id` dan `th` berisi terjemahannya (dibuat setelah `en` diisi, lihat README); selama masih kosong,
 * versi bahasa itu tetap menampilkan "deskripsi belum tersedia".
 */
export const MANUAL_DESCRIPTION_SOURCE = 'in-game'

const clean = (text) => (typeof text === 'string' && text.trim() ? text.trim() : null)

/** @returns {{ en: string, id: ?string, th: ?string, source: 'in-game' } | null} null kalau kolom `en` belum diisi */
export function getManualDescription(kindSlug, slug) {
  const row = manual[kindSlug]?.[slug]
  const en = clean(row?.en)
  if (!en) return null
  return { en, id: clean(row.id), th: clean(row.th), source: MANUAL_DESCRIPTION_SOURCE }
}
