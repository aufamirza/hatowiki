/**
 * Aturan notifikasi saran bahasa (src/components/layout/LanguageSuggestion.jsx): bahasa mana yang paling cocok untuk
 * pengunjung, dari bahasa browser (`navigator.languages`, urut pilihan) dan, kalau tersedia, kode negara dari api/geo.js
 * (header x-vercel-ip-country; null = tidak tersedia). Saran baru ditampilkan kalau hasilnya berbeda dari bahasa
 * halaman yang sedang dibuka.
 *
 * 1. Bahasa browser memuat th atau lo → Thai; memuat id → Indonesia; memuat ms (Melayu) → tidak ada saran (pembaca
 *    Melayu tidak disarankan pindah dari versi Indonesia). Kalau beberapa ada sekaligus, yang paling depan di daftar
 *    pilihan browser yang dipakai. Bahasa yang dipilih sendiri oleh pengunjung lebih kuat daripada negara, jadi negara
 *    tidak ditanyakan sama sekali untuk kelompok ini.
 * 2. Negara TH atau LA → Thai; negara ID → Indonesia.
 * 3. Bahasa utama browser en → Inggris hanya kalau negaranya diketahui (dan bukan ID, lihat 2). Banyak pengguna
 *    Indonesia memakai browser berbahasa Inggris, jadi tanpa data negara tidak ada saran.
 * 4. Bahasa utama lain (ja, fr, …) → Inggris, juga kalau negaranya tidak diketahui.
 */
const THAI_COUNTRIES = ['TH', 'LA']
// Bahasa browser yang sudah cukup untuk memutuskan tanpa data negara. null = jangan menyarankan apa pun.
const DECISIVE_LANGUAGES = { th: 'th', lo: 'th', id: 'id', ms: null }

const baseLanguages = (languages) => (languages ?? []).map((tag) => String(tag).toLowerCase().split('-')[0]).filter(Boolean)

/** Negara hanya perlu ditanyakan kalau bahasa browser saja belum cukup untuk memutuskan. */
export function needsCountry(languages) {
  return !baseLanguages(languages).some((base) => base in DECISIVE_LANGUAGES)
}

/** @returns {'id' | 'th' | 'en' | null} bahasa yang disarankan untuk pengunjung ini, atau null (tidak ada saran) */
export function suggestLocale(languages, country = null) {
  const bases = baseLanguages(languages)
  const decisive = bases.find((base) => base in DECISIVE_LANGUAGES)
  if (decisive) return DECISIVE_LANGUAGES[decisive]
  if (THAI_COUNTRIES.includes(country)) return 'th'
  if (country === 'ID') return 'id'
  // Browser tanpa daftar bahasa diperlakukan seperti browser berbahasa Inggris (paling hati-hati).
  if (!bases.length || bases[0] === 'en') return country ? 'en' : null
  return 'en'
}
