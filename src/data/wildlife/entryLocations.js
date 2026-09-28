/**
 * Lokasi sebuah entri sebagai array `[{ name, zone }]`, apa pun skema kategorinya:
 * ikan menyimpan satu `location` + `locationZone`, serangga menyimpan `locations` (jamak).
 * Ikan yang di sumber punya beberapa lokasi (mis. ikan event di lokasi biasa + lokasi event) juga menyimpan `locations`.
 * `category` = kategori wildlife dari WILDLIFE_CATEGORIES (lihat `multiLocation`).
 */
export function getEntryLocations(category, entry) {
  if (category.multiLocation || Array.isArray(entry.locations)) return entry.locations ?? []
  return entry.location == null ? [] : [{ name: entry.location, zone: entry.locationZone ?? null }]
}
