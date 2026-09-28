import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ArrowRight, House, Menu, X } from 'lucide-react'
import { WIKI_CATALOGS, WILDLIFE_CATALOGS } from './catalogs'

// Lebar mulai toolbar desktop (sama dengan breakpoint di Layout.css): drawer otomatis ditutup.
const DESKTOP_QUERY = '(min-width: 760px)'
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Nama Inggris + label Indonesia & jumlah entri, sama dengan menu dropdown di toolbar desktop.
function DrawerLink({ catalog, name = catalog.name, meta = `${catalog.label} · ${catalog.entries.length} entri` }) {
  const Icon = catalog.icon
  return (
    <NavLink to={catalog.href()} className="drawer__link" data-wildlife={catalog.slug}>
      <span className="drawer__icon" aria-hidden="true">
        <Icon />
      </span>
      <span className="drawer__text">
        <span className="drawer__name">{name}</span>
        <span className="drawer__meta">{meta}</span>
      </span>
    </NavLink>
  )
}

/**
 * Menu seluler: tombol di toolbar yang membuka drawer dari kanan (dialog modal). Saat terbuka, fokus
 * dikunci di dalam drawer, halaman di belakangnya tidak bisa digulir, Escape / tombol tutup / klik latar
 * menutupnya dan mengembalikan fokus ke tombol menu. Memilih tautan atau pindah halaman juga menutupnya.
 * Drawer dipasang di <body> (portal) karena header memakai backdrop-filter, yang membuat elemen fixed di
 * dalamnya ikut terkurung di header.
 */
function MobileMenu() {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)
  const panelRef = useRef(null)
  const panelId = useId()
  const titleId = useId()
  const { pathname } = useLocation()

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return undefined
    const root = document.documentElement
    root.classList.add('is-drawer-open')
    panelRef.current?.querySelector('.drawer__close')?.focus()
    const media = window.matchMedia(DESKTOP_QUERY)
    const handleMedia = (event) => event.matches && setOpen(false)
    media.addEventListener('change', handleMedia)
    return () => {
      root.classList.remove('is-drawer-open')
      media.removeEventListener('change', handleMedia)
    }
  }, [open])

  const close = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
    } else if (event.key === 'Tab') {
      const items = [...panelRef.current.querySelectorAll(FOCUSABLE)]
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="icon-button menu-button"
        aria-label="Buka menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen(true)}
      >
        <Menu aria-hidden="true" />
      </button>

      {open &&
        createPortal(
          <div className="drawer">
            <div className="drawer__backdrop" aria-hidden="true" onClick={close} />
            <div
              ref={panelRef}
              id={panelId}
              className="drawer__panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              // Klik di bagian drawer yang tidak bisa difokus tetap menyimpan fokus di dalam drawer.
              tabIndex={-1}
              onKeyDown={handleKeyDown}
            >
              <div className="drawer__head">
                <span className="drawer__title" id={titleId}>
                  Menu
                </span>
                <button type="button" className="icon-button drawer__close" aria-label="Tutup menu" onClick={close}>
                  <X aria-hidden="true" />
                </button>
              </div>

              {/* Tautan yang dipilih menutup drawer, juga kalau tujuannya halaman yang sedang dibuka. */}
              <nav
                className="drawer__nav"
                aria-label="Navigasi utama"
                onClick={(event) => event.target.closest('a') && setOpen(false)}
              >
                <NavLink to="/" end className="drawer__link drawer__link--plain">
                  <span className="drawer__icon" aria-hidden="true">
                    <House />
                  </span>
                  <span className="drawer__name">Beranda</span>
                </NavLink>

                <p className="drawer__group">Wildlife</p>
                <ul className="drawer__list">
                  {WILDLIFE_CATALOGS.map((catalog) => (
                    <li key={catalog.slug}>
                      <DrawerLink catalog={catalog} />
                    </li>
                  ))}
                </ul>
                <Link to="/wildlife" className="drawer__all">
                  Semua kategori wildlife
                  <ArrowRight aria-hidden="true" />
                </Link>

                <div className="drawer__divider" />
                <p className="drawer__group">Wiki</p>
                <ul className="drawer__list">
                  {WIKI_CATALOGS.map((catalog) => (
                    <li key={catalog.slug}>
                      <DrawerLink catalog={catalog} />
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

export default MobileMenu
