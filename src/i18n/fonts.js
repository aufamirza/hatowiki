/**
 * Font Thai (Anuphan, Google Fonts) hanya dimuat untuk halaman /th dan notifikasi saran bahasa Thai, supaya versi
 * Indonesia tidak mengunduhnya. Google Fonts memecah font per aksara (unicode-range), jadi yang terunduh hanya berkas
 * aksara Thai; huruf Latin tetap memakai Plus Jakarta Sans & Fraunces. Halaman /th yang dibuka langsung sudah memasang
 * tautan yang sama lewat skrip di index.html (id elemen sama, jadi tidak dobel).
 */
export const THAI_FONT_URL = 'https://fonts.googleapis.com/css2?family=Anuphan:wght@400..700&display=swap'
const LINK_ID = 'font-th'

export function ensureThaiFont() {
  if (typeof document === 'undefined' || document.getElementById(LINK_ID)) return
  const link = document.createElement('link')
  link.id = LINK_ID
  link.rel = 'stylesheet'
  link.href = THAI_FONT_URL
  document.head.append(link)
}

export function ensureLocaleFont(localeId) {
  if (localeId === 'th') ensureThaiFont()
}
