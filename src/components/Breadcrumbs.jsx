import { ChevronRight } from 'lucide-react'
import { useI18n } from '../i18n/I18nProvider'
import { Link } from '../i18n/LocaleLink'
import './Breadcrumbs.css'

// items: [{ label, to }] — item terakhir adalah halaman sekarang (tanpa `to`).
function Breadcrumbs({ items }) {
  const { t } = useI18n()
  return (
    <nav className="breadcrumbs" aria-label={t('layout.breadcrumb')}>
      <ol>
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1
          return (
            <li key={item.label}>
              {isCurrent ? (
                <span aria-current="page">{item.label}</span>
              ) : (
                <>
                  <Link to={item.to}>{item.label}</Link>
                  <ChevronRight aria-hidden="true" />
                </>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default Breadcrumbs
