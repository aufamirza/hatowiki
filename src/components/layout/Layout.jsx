import { Link, Outlet, ScrollRestoration } from 'react-router-dom'
import { ExternalLink, Heart } from 'lucide-react'
import GlobalSearch from '../search/GlobalSearch'
import MobileMenu from './MobileMenu'
import NavMenu from './NavMenu'
import ThemeToggle from './ThemeToggle'
import { WIKI_CATALOGS, WILDLIFE_CATALOGS } from './catalogs'
// Warna per kategori (data-wildlife) dipakai juga di toolbar: menu Wildlife, drawer, dan hasil pencarian.
import '../../pages/wildlife/wildlifeTints.css'
import '../../pages/recipes/recipeTint.css'
import '../../pages/goods/goodsTints.css'
import './Layout.css'
import './SiteNav.css'

function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Hatowiki, ke beranda">
      <span className="brand__mark" aria-hidden="true">
        <Heart />
      </span>
      <span className="brand__name">Hatowiki</span>
    </Link>
  )
}

// Toolbar global (sticky): logo, menu Wildlife & Wiki (desktop), pencarian, tombol tema, dan tombol menu
// seluler. Di bawah 760px menu pindah ke drawer dan pencarian ke balik tombol ikon.
const WILDLIFE_ALL = { to: '/wildlife', label: 'Semua kategori wildlife' }
function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Brand />
        <nav className="site-nav" aria-label="Navigasi utama">
          <NavMenu label="Wildlife" catalogs={WILDLIFE_CATALOGS} sections={['/wildlife']} allLink={WILDLIFE_ALL} />
          <NavMenu label="Wiki" catalogs={WIKI_CATALOGS} sections={WIKI_CATALOGS.map((catalog) => catalog.href())} />
        </nav>
        <div className="site-header__tools">
          <GlobalSearch />
          <ThemeToggle />
          <MobileMenu />
        </div>
      </div>
    </header>
  )
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__grid">
          <div className="site-footer__about">
            <Brand />
            <p>Wiki dan panduan untuk penjelajah Heartopia dalam bahasa Indonesia.</p>
          </div>
          <div>
            <h2 className="site-footer__title">Jelajahi</h2>
            <ul className="site-footer__links">
              <li><Link to="/">Beranda</Link></li>
              <li><Link to="/wildlife">Wildlife</Link></li>
              <li><Link to="/wildlife/fish">Fish</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="site-footer__title">Sumber data</h2>
            <p className="site-footer__credit">
              Data game (nama, statistik, jadwal, cuaca, dan lokasi), gambar, serta peta dan zona lokasi berasal dari{' '}
              <a href="https://www.heartodex.com/en" target="_blank" rel="noopener noreferrer">
                Heartodex
                <ExternalLink aria-hidden="true" />
                <span className="visually-hidden"> (membuka tab baru)</span>
              </a>
              .
            </p>
          </div>
        </div>
        <div className="site-footer__bottom">
          <p>
            Hatowiki adalah proyek komunitas tidak resmi untuk Heartopia dan tidak berafiliasi dengan XD
            Entertainment Co., Ltd. Semua aset game adalah milik XD Entertainment Co., Ltd.
          </p>
          <p>© 2026 Hatowiki · Dibuat untuk komunitas</p>
        </div>
      </div>
    </footer>
  )
}

function Layout() {
  return (
    <div className="site">
      <a href="#konten" className="skip-link">
        Lewati ke konten
      </a>
      <SiteHeader />
      <main id="konten" className="site-main" tabIndex={-1}>
        <Outlet />
      </main>
      <SiteFooter />
      <ScrollRestoration />
    </div>
  )
}

export default Layout
