import { Link } from 'react-router-dom'
import { ArrowLeft, Compass } from 'lucide-react'
import { usePageTitle } from '../hooks/usePageTitle'
import './NotFoundPage.css'

function NotFoundPage({
  title = 'Halaman tidak ditemukan',
  message = 'Alamat yang kamu buka tidak ada. Mungkin salah ketik, atau halamannya belum dibuat.',
  backTo = '/',
  backLabel = 'Kembali ke beranda',
}) {
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
