import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ArrowRight, ChevronDown } from 'lucide-react'

/**
 * Menu dropdown di toolbar desktop (Wildlife, Wiki): tombol disclosure yang membuka daftar tautan kategori (bukan
 * role="menu", karena isinya navigasi biasa). Panah bawah di tombol membuka menu dan memfokuskan tautan pertama; panah
 * atas/bawah, Home, dan End berpindah antartautan; Escape menutup dan mengembalikan fokus ke tombol; klik di luar atau
 * fokus keluar menutup menu.
 * `catalogs` = isi menu (lihat catalogs.js), `sections` = awalan URL yang membuat tombol tampil aktif,
 * `allLink` = tautan opsional di bawah daftar, mis. { to: '/wildlife', label: 'Semua kategori wildlife' }.
 */
function NavMenu({ label, catalogs, sections, allLink = null }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const panelId = useId()
  const { pathname } = useLocation()
  const inSection = sections.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))

  useEffect(() => setOpen(false), [pathname])

  // Selama terbuka: klik di luar menutup menu; Escape menutup dari mana pun fokusnya (Safari tidak memfokuskan
  // tombol yang diklik) dan mengembalikan fokus ke tombol.
  useEffect(() => {
    if (!open) return undefined
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setOpen(false)
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
        setOpen(true)
        // Tautan baru ada setelah render berikutnya.
        requestAnimationFrame(() => focusLink(which))
      } else focusLink(which)
    } else if (open && !onButton && (event.key === 'Home' || event.key === 'End')) {
      event.preventDefault()
      focusLink(event.key === 'Home' ? 'first' : 'last')
    }
  }

  const handleBlur = (event) => {
    if (open && event.relatedTarget && !rootRef.current?.contains(event.relatedTarget)) setOpen(false)
  }

  return (
    <div className="nav-menu" ref={rootRef} onKeyDown={handleKeyDown} onBlur={handleBlur}>
      <button
        ref={buttonRef}
        type="button"
        className={`site-nav__link nav-menu__button${inSection ? ' active' : ''}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
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
