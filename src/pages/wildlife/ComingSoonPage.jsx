import { ArrowLeft } from 'lucide-react'
import Breadcrumbs from '../../components/Breadcrumbs'
import CategoryHeader from '../../components/CategoryHeader'
import { getWildlifeCategory } from '../../data/wildlife/categories'
import { useI18n } from '../../i18n/I18nProvider'
import { Link } from '../../i18n/LocaleLink'
import { WILDLIFE_ICONS } from './wildlifeIcons'
import './wildlifeTints.css'
import './ComingSoonPage.css'

// Halaman kategori yang belum punya data. Sengaja tidak menampilkan data apa pun.
// Header-nya sama dengan halaman Fish, jadi polanya sudah siap saat kategori ini diisi.
function ComingSoonPage({ categorySlug }) {
  const category = getWildlifeCategory(categorySlug)
  const { t, kind } = useI18n()
  const text = kind(categorySlug)

  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: 'Wildlife', to: '/wildlife' }, { label: category.name }]} />

      <CategoryHeader
        icon={WILDLIFE_ICONS[categorySlug]}
        tint={category.slug}
        eyebrow={t('list.eyebrowWildlife', { hobby: text.hobby })}
        title={category.name}
        description={text.description}
      />

      <section className="coming-soon" aria-label={t('wildlifeHub.soonStatus')}>
        <p className="coming-soon__badge">{t('wildlifeHub.soon')}</p>
        <p className="coming-soon__text">{t('wildlifeHub.soonText', { name: category.name })}</p>
        <Link to="/wildlife" className="btn btn--ghost">
          <ArrowLeft aria-hidden="true" />
          {t('wildlifeHub.backToWildlife')}
        </Link>
      </section>
    </div>
  )
}

export default ComingSoonPage
