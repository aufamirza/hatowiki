import { useEffect, useId, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Check, Globe } from 'lucide-react'
import { useI18n } from '../../i18n/I18nProvider'
import { LOCALES } from '../../i18n/locales'
import { useLanguageSwitch } from '../../i18n/useLanguageSwitch'

/**
 * Daftar tautan bahasa ("Indonesia", "ไทย", "English") ke halaman yang sama. Tiap nama ditulis dalam bahasanya sendiri (atribut
 * lang & hreflang); bahasa yang sedang dipakai ditandai aria-current dan ikon centang.
 */
export function LanguageLinks({ className, onChoose }) {
  const { locale } = useI18n()
  const { hrefFor, switchTo } = useLanguageSwitch()
  return (
    <ul className={className}>
      {LOCALES.map((item) => {
        const current = item.id === locale
        return (
          <li key={item.id}>
            <a
              href={hrefFor(item.id)}
              hrefLang={item.id}
              lang={item.id}
              aria-current={current ? 'true' : undefined}
              className={`language-link${current ? ' is-current' : ''}`}
              onClick={(event) => {
                onChoose?.()
                switchTo(item.id, event)
              }}
            >
              {item.name}
              {current && <Check aria-hidden="true" className="language-link__check" />}
            </a>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Pemilih bahasa di toolbar: tombol ikon bola dunia yang membuka daftar bahasa (disclosure, bukan role="menu").
 * Panah atas/bawah berpindah pilihan, Escape menutup dan mengembalikan fokus ke tombol, klik di luar atau fokus keluar
 * menutup daftar.
 */
function LanguageMenu() {
  const { t, locale } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const panelId = useId()
  const { pathname } = useLocation()
  const current = LOCALES.find((item) => item.id === locale)

  useEffect(() => setOpen(false), [pathname])

  // Selama terbuka: klik di luar menutup daftar; Escape menutup dari mana pun fokusnya (Safari tidak memfokuskan tombol
  // yang diklik) dan mengembalikan fokus ke tombol.
  useEffect(() => {
    if (!open) return undefined
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const links = () => [...(rootRef.current?.querySelectorAll('.language-link') ?? [])]

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const move = () => {
        const list = links()
        const index = list.indexOf(document.activeElement)
        const next = event.key === 'ArrowDown' ? (index + 1) % list.length : index <= 0 ? list.length - 1 : index - 1
        list[next]?.focus()
      }
      if (!open) {
        setOpen(true)
        requestAnimationFrame(move)
      } else move()
    }
  }

  const handleBlur = (event) => {
    if (open && event.relatedTarget && !rootRef.current?.contains(event.relatedTarget)) setOpen(false)
  }

  const label = `${t('language.choose')} (${current.name})`

  return (
    <div className="language-menu" ref={rootRef} onKeyDown={handleKeyDown} onBlur={handleBlur}>
      <button
        ref={buttonRef}
        type="button"
        className="icon-button language-menu__button"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <Globe aria-hidden="true" />
      </button>
      {open && (
        <div className="language-menu__panel" id={panelId}>
          <LanguageLinks className="language-menu__list" onChoose={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}

export default LanguageMenu
