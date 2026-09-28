/**
 * Warna badge level diambil dari nomor level di data: token --level-N (latar) dan --level-N-ink
 * (teks & garis tepi) di tokens.css. Level yang belum punya token (mis. di atas 14) otomatis
 * memakai --level-fallback lewat nilai cadangan var(), jadi tidak ada daftar level di sini.
 */
export function levelToneStyle(level) {
  return {
    '--level-bg': `var(--level-${level}, var(--level-fallback))`,
    '--level-ink': `var(--level-${level}-ink, var(--level-fallback-ink))`,
  }
}
