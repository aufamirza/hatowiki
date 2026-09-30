import { ArrowRight } from 'lucide-react'
import Breadcrumbs from '../../components/Breadcrumbs'
import { WILDLIFE_CATEGORIES } from '../../data/wildlife/categories'
import { animals } from '../../data/wildlife/animals'
import { birds } from '../../data/wildlife/birds'
import { bugs } from '../../data/wildlife/bugs'
import { fish } from '../../data/wildlife/fish'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useI18n } from '../../i18n/I18nProvider'
import { Link } from '../../i18n/LocaleLink'
import { WILDLIFE_ICONS } from './wildlifeIcons'
import './wildlifeTints.css'
import './WildlifePage.css'

// Jumlah entri yang sudah ada datanya, per kategori.
const ENTRY_COUNTS = { fish: fish.length, bugs: bugs.length, birds: birds.length, animals: animals.length }

function WildlifePage() {
  const { t, kind } = useI18n()
  usePageTitle('Wildlife')

  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: t('common.home'), to: '/' }, { label: 'Wildlife' }]} />

      <header className="page-header">
        <p className="eyebrow">{t('wildlifeHub.eyebrow')}</p>
        <h1>Wildlife</h1>
        <p>{t('wildlifeHub.intro')}</p>
      </header>

      <ul className="wildlife-grid">
        {WILDLIFE_CATEGORIES.map((category) => {
          const Icon = WILDLIFE_ICONS[category.slug]
          const count = ENTRY_COUNTS[category.slug] ?? 0
          const text = kind(category.slug)
          return (
            <li key={category.slug}>
              <Link
                to={`/wildlife/${category.slug}`}
                className={`wildlife-card${category.available ? '' : ' is-soon'}`}
                data-wildlife={category.slug}
              >
                <span className="wildlife-card__icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="wildlife-card__body">
                  <span className="wildlife-card__hobby">{text.hobby}</span>
                  <span className="wildlife-card__title">
                    {category.name}
                    <span className="wildlife-card__label">{text.label}</span>
                  </span>
                  <span className="wildlife-card__desc">{text.description}</span>
                </span>
                <span className="wildlife-card__footer">
                  {category.available ? (
                    <span className="wildlife-card__count">{t(`kinds.${category.slug}.count`, { count })}</span>
                  ) : (
                    <span className="soon-badge">{t('wildlifeHub.soon')}</span>
                  )}
                  <ArrowRight aria-hidden="true" className="wildlife-card__arrow" />
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default WildlifePage
