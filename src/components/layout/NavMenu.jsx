import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ArrowRight, ChevronDown } from 'lucide-react'

// Jeda hover (mouse saja): menu tidak terbuka sendiri saat kursor hanya lewat, dan tidak langsung tertutup saat kursor
// menyeberang celah antara tombol dan panel.
const HOVER_OPEN_DELAY = 140
const HOVER_CLOSE_DELAY = 280
// Menu yang dibuka lewat hover menutup menu lain seketika, supaya dua panel tidak sempat tampil bersamaan.
const OPEN_EVENT = 'hdx-nav-menu-open'

/**
 * Menu dropdown di toolbar desktop (Wildlife, Wiki): tombol disclosure yang membuka daftar tautan kategori (bukan
 * role="menu", karena isinya navigasi biasa). Dengan mouse, menu terbuka saat kursor diam sebentar di atasnya dan
 * tertutup sebentar setelah kursor keluar; klik saat menu terbuka karena hover membuatnya tetap terbuka (tidak
 * menutup). Di perangkat sentuh menu hanya dibuka dengan ketuk. Panah bawah di tombol membuka menu dan memfokuskan
 * tautan pertama; panah atas/bawah, Home, dan End berpindah antartautan; Enter/Space di tombol membuka-menutup; Escape
 * menutup dan mengembalikan fokus ke tombol; klik di luar atau fokus keluar menutup menu.
 * `catalogs` = isi menu (lihat catalogs.js), `sections` = awalan URL yang membuat tombol tampil aktif,
 * `allLink` = tautan opsional di bawah daftar, mis. { to: '/wildlife', label: 'Semua kategori wildlife' }.
 */
function NavMenu({ label, catalogs, sections, allLink = null }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  // 'hover' = dibuka kursor (tertutup lagi saat kursor keluar); 'click' / 'key' = tetap terbuka sampai ditutup.
  const openedBy = useRef(null)
  const hoverTimer = useRef(0)
  const panelId = useId()
  const { pathname } = useLocation()
  const inSection = sections.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))

  const clearHoverTimer = () => window.clearTimeout(hoverTimer.current)
  const show = (source) => {
    clearHoverTimer()
    openedBy.current = source
    setOpen(true)
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: panelId }))
  }
  const hide = () => {
    clearHoverTimer()
    openedBy.current = null
    setOpen(false)
  }

  useEffect(() => hide(), [pathname])
  useEffect(() => clearHoverTimer, [])

  // Menu lain terbuka → menu ini tertutup.
  useEffect(() => {
    const handleOtherOpen = (event) => {
      if (event.detail !== panelId) hide()
    }
    window.addEventListener(OPEN_EVENT, handleOtherOpen)
    return () => window.removeEventListener(OPEN_EVENT, handleOtherOpen)
  }, [panelId])

  // Selama terbuka: klik di luar menutup menu; Escape menutup dari mana pun fokusnya (Safari tidak memfokuskan
  // tombol yang diklik) dan mengembalikan fokus ke tombol.
  useEffect(() => {
    if (!open) return undefined
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) hide()
    }
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      hide()
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const links = () => [...(rootRef.current?.querySelectorAll('.nav-menu__panel a') ?? [])]

  const focusLink = (which) => {
    const list = links()
    if (!list.length) return
    const current = list.indexOf(document.activeElement)
    const next = {
      first: 0,
      last: list.length - 1,
      next: current < 0 ? 0 : (current + 1) % list.length,
      prev: current < 0 ? list.length - 1 : (current - 1 + list.length) % list.length,
    }[which]
    list[next].focus()
  }

  const handleKeyDown = (event) => {
    const onButton = event.target === buttonRef.current
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const which = event.key === 'ArrowDown' ? (onButton ? 'first' : 'next') : onButton ? 'last' : 'prev'
      if (!open) {
        show('key')
        // Tautan baru ada setelah render berikutnya.
        requestAnimationFrame(() => focusLink(which))
      } else focusLink(which)
    } else if (open && !onButton && (event.key === 'Home' || event.key === 'End')) {
      event.preventDefault()
      focusLink(event.key === 'Home' ? 'first' : 'last')
    }
  }

  const handleBlur = (event) => {
    if (open && event.relatedTarget && !rootRef.current?.contains(event.relatedTarget)) hide()
  }

  // Hover hanya untuk mouse; ketuk di layar sentuh memakai klik biasa.
  const handlePointerEnter = (event) => {
    if (event.pointerType !== 'mouse') return
    clearHoverTimer()
    if (!open) hoverTimer.current = window.setTimeout(() => show('hover'), HOVER_OPEN_DELAY)
  }
  const handlePointerLeave = (event) => {
    if (event.pointerType !== 'mouse') return
    clearHoverTimer()
    if (open && openedBy.current === 'hover') hoverTimer.current = window.setTimeout(hide, HOVER_CLOSE_DELAY)
  }
  const handleClick = () => {
    // Menu yang baru terbuka karena hover tidak ditutup oleh klik; klik "mengunci" menu tetap terbuka.
    if (open && openedBy.current === 'hover') openedBy.current = 'click'
    else if (open) hide()
    else show('click')
  }

  return (
    <div
      className="nav-menu"
      ref={rootRef}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <button
        ref={buttonRef}
        type="button"
        className={`site-nav__link nav-menu__button${inSection ? ' active' : ''}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={handleClick}
      >
        {label}
        <ChevronDown aria-hidden="true" className="nav-menu__chevron" />
      </button>
      {open && (
        <div className="nav-menu__panel" id={panelId}>
          <ul className="nav-menu__list">
            {catalogs.map((catalog) => {
              const Icon = catalog.icon
              return (
                <li key={catalog.slug}>
                  <NavLink to={catalog.href()} className="nav-menu__link" data-wildlife={catalog.slug}>
                    <span className="nav-menu__icon" aria-hidden="true">
                      <Icon />
                    </span>
                    <span className="nav-menu__text">
                      <span className="nav-menu__name">{catalog.name}</span>
                      <span className="nav-menu__meta">
                        {catalog.label} · {catalog.entries.length} entri
                      </span>
                    </span>
                  </NavLink>
                </li>
              )
            })}
          </ul>
          {allLink && (
            <Link to={allLink.to} className="nav-menu__all">
              {allLink.label}
              <ArrowRight aria-hidden="true" />
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

export default NavMenu
