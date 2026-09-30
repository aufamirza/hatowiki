/**
 * Tautan hadiah favorit NPC. Di Heartodex hadiah favorit berupa jenis benda ("Prepared meals", "Rare insects"), bukan
 * benda tertentu, jadi yang ditautkan hanya jenis yang jelas sama dengan satu halaman daftar Hatowiki. Jenis lain
 * (mis. "Seafood", "Rare flowers", "Tools") tampil tanpa tautan. Kunci = label apa adanya di data NPC; nilai = alamat
 * tanpa awalan bahasa.
 */
export const GIFT_LINKS = {
  'Any fish': '/wildlife/fish',
  Fish: '/wildlife/fish',
  'Rare insects': '/wildlife/bugs',
  'Prepared meals': '/recipes',
  'Rare ingredients': '/ingredients',
  'Fishing supplies': '/items?kategori=Fishing',
}
