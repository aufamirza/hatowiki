import './CategoryHeader.css'

/**
 * Judul halaman kategori: ikon dalam tile bersudut bulat, eyebrow, judul, dan deskripsi singkat.
 * `tint` = slug kategori wildlife (warna tile mengikuti kartu kategori di hub, lihat wildlifeTints.css).
 * `children` untuk info tambahan di bawah deskripsi, mis. progres dokumentasi.
 */
function CategoryHeader({ icon: Icon, title, description, eyebrow, tint, children }) {
  return (
    <header className="page-header category-header" data-wildlife={tint}>
      <div className="category-header__top">
        <span className="category-header__tile" aria-hidden="true">
          <Icon />
        </span>
        <div className="category-header__heading">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
        </div>
      </div>
      {description && <p className="category-header__desc">{description}</p>}
      {children}
    </header>
  )
}

export default CategoryHeader
