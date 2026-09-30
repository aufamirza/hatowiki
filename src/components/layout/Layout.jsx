import { Suspense, useEffect, useRef } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom'
import { ExternalLink, Globe, Heart } from 'lucide-react'
import { useReplayAnimation } from '../../hooks/useReplayAnimation'
import { I18nProvider, getLoadedMessages, useI18n } from '../../i18n/I18nProvider'
import { Link } from '../../i18n/LocaleLink'
import { localeFromPath, stripLocale } from '../../i18n/locales'
import { applyPageMeta } from '../../seo/applyPageMeta'
import { getPageMeta } from '../../seo/pageMeta'
import GlobalSearch from '../search/GlobalSearch'
import LanguageMenu, { LanguageLinks } from './LanguageMenu'
import LanguageSuggestion from './LanguageSuggestion'
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
import './Language.css'

function Brand() {
  const { t } = useI18n()
  return (
    <Link to="/" className="brand" aria-label={t('layout.brandHome')}>
      <span className="brand__mark" aria-hidden="true">
        <Heart />
      </span>
      <span className="brand__name">Hatowiki</span>
    </Link>
  )
}

// Toolbar global: bar melayang berbentuk pil (sticky, semi transparan + blur) berisi logo, menu Wildlife & Wiki
// (desktop), pencarian, pemilih bahasa, tombol tema, dan tombol menu seluler. Di bawah 760px menu pindah ke drawer dan
// pencarian ke balik tombol ikon. Di beranda, pencarian toolbar disembunyikan selama hero (yang punya kolom cari sendiri)
// terlihat.
function SiteHeader() {
  const { t } = useI18n()
  const wildlifeAll = { to: '/wildlife', label: t('layout.allWildlife') }
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Brand />
        <nav className="site-nav" aria-label={t('layout.mainNav')}>
          <NavMenu label="Wildlife" catalogs={WILDLIFE_CATALOGS} sections={['/wildlife']} allLink={wildlifeAll} />
          <NavMenu label="Wiki" catalogs={WIKI_CATALOGS} sections={WIKI_CATALOGS.map((catalog) => catalog.href())} />
        </nav>
        <div className="site-header__tools">
          <GlobalSearch />
          <LanguageMenu />
          <ThemeToggle />
          <MobileMenu />
        </div>
      </div>
    </header>
  )
}

function SiteFooter() {
  const { t } = useI18n()
  const heartodex = (
    <a href="https://www.heartodex.com/en" target="_blank" rel="noopener noreferrer">
      Heartodex
      <ExternalLink aria-hidden="true" />
      <span className="visually-hidden">{t('common.newTab')}</span>
    </a>
  )
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__grid">
          <div className="site-footer__about">
            <Brand />
            <p>{t('footer.about')}</p>
            <h2 className="site-footer__title site-footer__title--stores">{t('footer.download')}</h2>
            <StoreLinks />
          </div>
          <div>
            <h2 className="site-footer__title">{t('footer.explore')}</h2>
            <ul className="site-footer__links">
              <li><Link to="/">{t('common.home')}</Link></li>
              <li><Link to="/wildlife">Wildlife</Link></li>
              <li><Link to="/wildlife/fish">Fish</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="site-footer__title">{t('footer.sources')}</h2>
            <p className="site-footer__credit">{t('footer.credit', { link: heartodex })}</p>
          </div>
        </div>
        <div className="site-footer__bottom">
          <p>{t('footer.disclaimer')}</p>
          <div className="site-footer__meta">
            <span>{t('footer.copyright')}</span>
            {/* Ikon X dari Simple Icons (CC0), satu warna mengikuti teks; tanpa teks terlihat, nama lewat aria-label */}
            <a
              href="https://x.com/pingkendi"
              className="site-footer__social"
              target="_blank"
              rel="noopener"
              aria-label={t('footer.xLabel')}
              title={t('footer.xTitle')}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
              </svg>
            </a>
            {/* Pemilih bahasa kedua (selain bola dunia di toolbar): tautan kecil per bahasa ke halaman yang sama */}
            <nav className="site-footer__language" aria-label={t('language.label')}>
              <Globe aria-hidden="true" />
              <LanguageLinks className="site-footer__language-list" />
            </nav>
          </div>
        </div>
      </div>
    </footer>
  )
}

// Area dengan tint latar sendiri (token --page-bg-<area> di tokens.css), dari segmen pertama URL.
const TINTED_AREAS = ['wildlife', 'recipes', 'crops', 'collectibles', 'ingredients']

function SiteShell() {
  const { pathname } = useLocation()
  const { t, locale } = useI18n()
  const mainRef = useRef(null)
  const route = stripLocale(pathname)
  const area = route.split('/')[1]
  const isHome = route === '/'

  // Pindah halaman: konten memudar masuk (CSS, lihat .page-enter di base.css).
  useReplayAnimation(mainRef, pathname, 'page-enter')

  // Judul, deskripsi, canonical, Open Graph, dan tautan hreflang mengikuti halaman & bahasa yang sedang dibuka. HTML
  // statis tiap halaman (scripts/build-seo.mjs) sudah berisi nilai yang sama untuk crawler tanpa JavaScript.
  useEffect(() => {
    applyPageMeta(getPageMeta(route, locale, getLoadedMessages(locale)))
  }, [route, locale])

  return (
    <div className="site" data-area={TINTED_AREAS.includes(area) ? area : undefined}>
      <a href="#konten" className="skip-link">
        {t('layout.skipLink')}
      </a>
      <LanguageSuggestion />
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

// Bahasa halaman dari awalan alamat (/th → Thai, /en → Inggris, tanpa awalan → Indonesia). Teks bahasa yang belum dimuat ditunggu
// dulu (main.jsx & pemilih bahasa biasanya sudah memuatnya lebih awal).
function Layout() {
  const { pathname } = useLocation()
  return (
    <Suspense fallback={null}>
      <I18nProvider locale={localeFromPath(pathname)}>
        <SiteShell />
      </I18nProvider>
    </Suspense>
  )
}

export default Layout
