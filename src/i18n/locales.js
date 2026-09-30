/**
 * Bahasa situs. Indonesia (bawaan) di alamat tanpa awalan, Thai di bawah /th; slug halaman sama untuk keduanya.
 * Tidak ada awalan /id: alamat /id/... diarahkan ke versi tanpa awalan (vercel.json dan route di App.jsx).
 * Kunci penyimpanan juga dipakai skrip di index.html (pengalihan & font sebelum React jalan).
 */
export const LOCALES = [
  // `intl` = locale untuk angka & tanggal. Thai memakai angka Arab (nu-latn), bukan angka Thai.
  { id: 'id', prefix: '', intl: 'id-ID', name: 'Indonesia', ogLocale: 'id_ID' },
  { id: 'th', prefix: '/th', intl: 'th-TH-u-nu-latn', name: 'ไทย', ogLocale: 'th_TH' },
]

export const DEFAULT_LOCALE = 'id'
// Pilihan bahasa pengunjung ('id' / 'th'), disimpan saat memilih lewat pemilih bahasa atau notifikasi saran.
export const LANGUAGE_STORAGE_KEY = 'hdx-lang'
// Notifikasi saran bahasa sudah ditutup (tombol X / Escape).
export const HINT_DISMISSED_KEY = 'hdx-lang-hint-dismissed'

export const getLocale = (id) => LOCALES.find((locale) => locale.id === id) ?? LOCALES[0]

/** Bahasa dari alamat: '/th' atau '/th/...' → 'th', selain itu bahasa bawaan. */
export function localeFromPath(pathname) {
  const match = LOCALES.find((locale) => locale.prefix && (pathname === locale.prefix || pathname.startsWith(`${locale.prefix}/`)))
  return match ? match.id : DEFAULT_LOCALE
}

/** Alamat tanpa awalan bahasa: '/th/wildlife' → '/wildlife', '/th' → '/'. */
export function stripLocale(pathname) {
  const { prefix } = getLocale(localeFromPath(pathname))
  if (!prefix) return pathname
  return pathname.slice(prefix.length) || '/'
}

/** Alamat internal (tanpa awalan) untuk bahasa tertentu: ('/', 'th') → '/th', ('/recipes?q=a', 'th') → '/th/recipes?q=a'. */
export function localizePath(path, localeId) {
  const { prefix } = getLocale(localeId)
  if (!prefix || typeof path !== 'string' || !path.startsWith('/')) return path
  if (path === '/') return prefix
  if (path.startsWith('/?') || path.startsWith('/#')) return prefix + path.slice(1)
  return prefix + path
}

export function readStoredLanguage() {
  try {
    const value = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return LOCALES.some((locale) => locale.id === value) ? value : null
  } catch {
    return null
  }
}

// Dikirim ke window setiap kali pengunjung memilih bahasa (notifikasi saran bahasa lalu menutup diri).
export const LANGUAGE_CHOSEN_EVENT = 'hdx-language-chosen'

export function storeLanguage(localeId) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, localeId)
  } catch {
    // Penyimpanan diblokir (mode privat): pilihan tetap berlaku selama halaman terbuka.
  }
  window.dispatchEvent(new CustomEvent(LANGUAGE_CHOSEN_EVENT, { detail: localeId }))
}
