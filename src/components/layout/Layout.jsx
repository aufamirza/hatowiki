import { useEffect, useRef } from 'react'
import { Link, Outlet, ScrollRestoration, useLocation } from 'react-router-dom'
import { ExternalLink, Heart } from 'lucide-react'
import { useReplayAnimation } from '../../hooks/useReplayAnimation'
import GlobalSearch from '../search/GlobalSearch'
import MobileMenu from './MobileMenu'
import NavMenu from './NavMenu'
import StoreLinks from './StoreLinks'
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

// Toolbar global: bar melayang berbentuk pil (sticky, semi transparan + blur) berisi logo, menu Wildlife & Wiki
// (desktop), pencarian, tombol tema, dan tombol menu seluler. Di bawah 760px menu pindah ke drawer dan pencarian ke
// balik tombol ikon. Di beranda, pencarian toolbar disembunyikan selama hero (yang punya kolom cari sendiri) terlihat.
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
            <h2 className="site-footer__title site-footer__title--stores">Unduh Heartopia</h2>
            <StoreLinks />
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
          <p className="site-footer__meta">
            <span>© 2026 Hatowiki · Dibuat untuk komunitas</span>
            {/* Ikon X dari Simple Icons (CC0), satu warna mengikuti teks */}
            <a href="https://x.com/pingkendi" className="site-footer__social" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
              </svg>
              @pingkendi
              <span className="visually-hidden"> di X (membuka tab baru)</span>
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}

const SITE_URL = 'https://www.hatowiki.site'
// Area dengan tint latar sendiri (token --page-bg-<area> di tokens.css), dari segmen pertama URL.
const TINTED_AREAS = ['wildlife', 'recipes', 'crops', 'collectibles', 'ingredients']

function Layout() {
  const { pathname } = useLocation()
  const mainRef = useRef(null)
  const area = pathname.split('/')[1]
  const isHome = pathname === '/'

  // Pindah halaman: konten memudar masuk (CSS, lihat .page-enter di base.css).
  useReplayAnimation(mainRef, pathname, 'page-enter')

  // Canonical & og:url mengikuti halaman yang sedang dibuka (index.html hanya berisi versi beranda).
  useEffect(() => {
    const url = SITE_URL + pathname
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', url)
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', url)
  }, [pathname])

  return (
    <div className="site" data-area={TINTED_AREAS.includes(area) ? area : undefined}>
      <a href="#konten" className="skip-link">
        Lewati ke konten
      </a>
      <SiteHeader />
      {/* Beranda: hero dimulai dari tepi atas, di belakang toolbar melayang. */}
      <main id="konten" ref={mainRef} className={`site-main${isHome ? ' site-main--flush' : ''}`} tabIndex={-1}>
        <Outlet />
      </main>
      <SiteFooter />
      <ScrollRestoration />
    </div>
  )
}

export default Layout
