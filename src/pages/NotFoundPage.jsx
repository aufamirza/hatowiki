import { ArrowLeft, Compass } from 'lucide-react'
import { usePageTitle } from '../hooks/usePageTitle'
import { useI18n } from '../i18n/I18nProvider'
import { Link } from '../i18n/LocaleLink'
import './NotFoundPage.css'

// Tanpa props: halaman 404 umum. Halaman detail memberi judul, pesan, dan tautan kembali ke daftarnya sendiri.
function NotFoundPage(props) {
  const { t } = useI18n()
  const {
    title = t('notFound.title'),
    message = t('notFound.message'),
    backTo = '/',
    backLabel = t('notFound.back'),
  } = props
  usePageTitle(title)

  return (
    <div className="container page">
      <section className="not-found">
        <span className="not-found__icon" aria-hidden="true">
          <Compass />
        </span>
        <h1>{title}</h1>
        <p>{message}</p>
        <Link to={backTo} className="btn btn--primary">
          <ArrowLeft aria-hidden="true" />
          {backLabel}
        </Link>
      </section>
    </div>
  )
}

export default NotFoundPage
