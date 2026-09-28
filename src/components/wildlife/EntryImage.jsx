import { ImageOff } from 'lucide-react'

// Gambar entri wildlife dari /public. `size` = ukuran asli [lebar, tinggi] untuk width/height;
// gambar ikan semuanya 400×400. Kalau datanya belum ada (null), tampilkan placeholder yang rapi.
function EntryImage({ src, alt, className, loading = 'lazy', size = [400, 400] }) {
  if (!src) {
    return (
      <span className={`entry-image-missing ${className ?? ''}`} role="img" aria-label={`Gambar ${alt} belum tersedia`}>
        <ImageOff aria-hidden="true" />
      </span>
    )
  }

  return <img src={src} alt={alt} width={size[0]} height={size[1]} loading={loading} decoding="async" className={className} />
}

export default EntryImage
