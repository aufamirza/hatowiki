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

function samplesOf(catalog) {
  const picked = (SAMPLE_SLUGS[catalog.slug] ?? [])
    .map((slug) => catalog.entries.find((entry) => entry.slug === slug))
    .filter(Boolean)
  const rest = catalog.entries.filter((entry) => !picked.includes(entry))
  return [...picked, ...rest].slice(0, 3)
}

// Kartu tiap katalog: ikon, deskripsi singkat, contoh gambar, dan jumlah entri yang dihitung dari data.
function CategorySection() {
  return (
    <section className="home-section categories" id="kategori" aria-labelledby="categories-title">
      <div className="container">
        <header className="section-head">
          <p className="eyebrow">Koleksi</p>
          <h2 id="categories-title">Semua Kategori</h2>
          <p>Data dari Heartodex, dengan deskripsi dalam bahasa Indonesia. Pilih kategori untuk mencari dan memfilter.</p>
        </header>

        <ul className="category-grid">
          {CATALOGS.map((catalog) => {
            const Icon = catalog.icon
            return (
              <li key={catalog.slug}>
                <Link to={catalog.href()} className="category-card" data-wildlife={catalog.slug}>
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
                  <span className="category-card__desc">{catalog.description}</span>
                  <span className="category-card__stage" aria-hidden="true">
                    {samplesOf(catalog).map((entry) => (
                      <EntryImage
                        key={entry.slug}
                        src={entry.image}
                        alt=""
                        size={entry.imageSize}
                        className="category-card__sample"
                      />
                    ))}
                  </span>
                  <span className="category-card__footer">
                    <span className="category-card__count">
                      <strong>{catalog.entries.length}</strong> {catalog.noun}
                    </span>
                    <span className="category-card__cta">
                      Lihat semua
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
