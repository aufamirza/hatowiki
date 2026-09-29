import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { CATALOGS } from '../../components/layout/catalogs'
import EntryImage from '../../components/wildlife/EntryImage'

// Contoh gambar per kategori (slug entri). Slug yang tidak ada di data diganti entri pertama yang belum dipakai.
const SAMPLE_SLUGS = {
  fish: ['butterfly-koi', 'sea-bass', 'seahorse'],
  bugs: ['seven-spotted-ladybug', 'rainbow-stag-beetle', 'peacock-butterfly'],
  birds: ['atlantic-puffin', 'blue-and-yellow-macaw', 'snowy-owl'],
  animals: ['capybara', 'fox', 'panda'],
  recipes: ['tiramisu', 'fish-and-chips', 'strawberry-milkshake'],
  crops: ['tomato', 'strawberry', 'corn'],
  collectibles: ['apple', 'penny-bun', 'black-truffle'],
  ingredients: ['egg', 'cheese', 'butter'],
}

function samplesOf(catalog, count) {
  const picked = (SAMPLE_SLUGS[catalog.slug] ?? [])
    .map((slug) => catalog.entries.find((entry) => entry.slug === slug))
    .filter(Boolean)
  const rest = catalog.entries.filter((entry) => !picked.includes(entry))
  return [...picked, ...rest].slice(0, count)
}

/*
 * Susunan bento: ukuran kartu mengikuti jumlah entri (dihitung dari data). Terbanyak → besar (dua baris), kedua →
 * lebar, ketiga & keempat → sedang, sisanya kecil. Kartu diurutkan dari yang terbanyak, jadi urutan baca & fokus
 * keyboard sama dengan urutan tampil. Makin besar kartu, makin banyak contoh gambar; deskripsi hanya di kartu besar & lebar.
 */
const SIZES = ['xl', 'wide', 'md', 'md']
const SAMPLE_COUNT = { xl: 3, wide: 3, md: 2, sm: 1 }

// Kartu tiap katalog: ikon, nama, contoh gambar yang sedikit keluar dari kartu, dan jumlah entri dari data.
function CategorySection() {
  const ranked = [...CATALOGS].sort((a, b) => b.entries.length - a.entries.length)

  return (
    <section className="home-section categories" id="kategori" aria-labelledby="categories-title">
      <div className="container">
        <header className="section-head">
          <p className="eyebrow">Koleksi</p>
          <h2 id="categories-title">Semua Kategori</h2>
          <p>Data dari Heartodex, dengan deskripsi dalam bahasa Indonesia. Pilih kategori untuk mencari dan memfilter.</p>
        </header>

        <ul className="category-grid">
          {ranked.map((catalog, rank) => {
            const Icon = catalog.icon
            const size = SIZES[rank] ?? 'sm'
            return (
              <li key={catalog.slug} className={`category-grid__item category-grid__item--${size}`}>
                <Link to={catalog.href()} className="category-card" data-size={size} data-wildlife={catalog.slug}>
                  <span className="category-card__art" aria-hidden="true">
                    {samplesOf(catalog, SAMPLE_COUNT[size]).map((entry) => (
                      <EntryImage
                        key={entry.slug}
                        src={entry.image}
                        alt=""
                        size={entry.imageSize}
                        className="category-card__sample"
                      />
                    ))}
                  </span>
                  <span className="category-card__head">
                    <span className="category-card__icon" aria-hidden="true">
                      <Icon />
                    </span>
                    <span className="category-card__titles">
                      <span className="category-card__hobby">{catalog.hobby}</span>
                      <h3 className="category-card__title">
                        {catalog.name}
                        <span className="category-card__label">{catalog.label}</span>
                      </h3>
                    </span>
                  </span>
                  {(size === 'xl' || size === 'wide') && <span className="category-card__desc">{catalog.description}</span>}
                  <span className="category-card__footer">
                    <span className="category-card__count">
                      <strong>{catalog.entries.length}</strong> {catalog.noun}
                    </span>
                    {/* Kartu sedang & kecil: hanya tombol panah (teksnya tetap dibaca pembaca layar) */}
                    <span className="category-card__cta">
                      <span className="category-card__cta-text">Lihat semua</span>
                      <ArrowRight aria-hidden="true" />
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

export default CategorySection
