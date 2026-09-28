import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Breadcrumbs from '../../components/Breadcrumbs'
import CategoryHeader from '../../components/CategoryHeader'
import { getWildlifeCategory } from '../../data/wildlife/categories'
import { usePageTitle } from '../../hooks/usePageTitle'
import { WILDLIFE_ICONS } from './wildlifeIcons'
import './wildlifeTints.css'
import './ComingSoonPage.css'

// Halaman kategori yang belum punya data. Sengaja tidak menampilkan data apa pun.
// Header-nya sama dengan halaman Fish, jadi polanya sudah siap saat kategori ini diisi.
function ComingSoonPage({ categorySlug }) {
  const category = getWildlifeCategory(categorySlug)
  usePageTitle(category.name)

  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: 'Wildlife', to: '/wildlife' }, { label: category.name }]} />

      <CategoryHeader
        icon={WILDLIFE_ICONS[categorySlug]}
        tint={category.slug}
        eyebrow={`Wildlife · ${category.hobby}`}
        title={category.name}
        description={category.description}
      />

      <section className="coming-soon" aria-label="Status halaman">
        <p className="coming-soon__badge">Segera hadir</p>
        <p className="coming-soon__text">
          Halaman {category.name} sedang disiapkan. Datanya akan ditambahkan setelah diverifikasi dari sumber yang
          valid.
        </p>
        <Link to="/wildlife" className="btn btn--ghost">
          <ArrowLeft aria-hidden="true" />
          Kembali ke Wildlife
        </Link>
      </section>
    </div>
  )
}

export default ComingSoonPage
