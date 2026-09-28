/**
 * Warna badge kategori (Common & event) diambil dari nama kategori di data: token --category-<kunci> (latar),
 * --category-<kunci>-ink (teks) dan opsional --category-<kunci>-line (garis tepi; bawaannya dari warna teks) di
 * tokens.css, versi light dan dark. Kunci = nama kategori huruf kecil dengan tanda hubung, mis. 'Sea Fishing' →
 * sea-fishing, 'SANRIO CHARACTERS' → sanrio-characters. Kategori tanpa token otomatis memakai --category-fallback,
 * jadi tidak ada daftar kategori di sini.
 */
export function categoryKey(name) {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function categoryToneStyle(name) {
  const key = categoryKey(name)
  return {
    '--cat-bg': `var(--category-${key}, var(--category-fallback))`,
    '--cat-ink': `var(--category-${key}-ink, var(--category-fallback-ink))`,
    '--cat-line': `var(--category-${key}-line, color-mix(in srgb, var(--cat-ink) 45%, transparent))`,
  }
}
