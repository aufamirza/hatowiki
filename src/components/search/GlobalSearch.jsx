import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search, SearchX, X } from 'lucide-react'
import EntryImage from '../wildlife/EntryImage'
import { searchCatalogs } from './searchIndex'
import './GlobalSearch.css'

const SEARCH_LABEL = 'Cari ikan, serangga, burung, hewan, resep, tanaman, atau bahan alam'

// Bagian nama yang cocok dengan kata kunci ditebalkan (kalau cocok apa adanya, tanpa beda huruf besar/kecil).
function Highlight({ text, query }) {
  const needle = query.trim().toLocaleLowerCase('en')
  const at = needle ? text.toLocaleLowerCase('en').indexOf(needle) : -1
  if (at < 0) return text
  return (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, at + needle.length)}</mark>
      {text.slice(at + needle.length)}
    </>
  )
}

/**
 * Pencarian nama di semua katalog, di toolbar. Pola combobox + listbox (WAI-ARIA): fokus tetap di kolom,
 * hasil aktif ditandai lewat aria-activedescendant. Panah atas/bawah pindah hasil, Enter membuka hasil aktif
 * (bawaannya hasil pertama), Escape menutup daftar, lalu mengosongkan kolom, lalu (di ponsel) menutup panel.
 * Di ponsel kolomnya tersembunyi di balik tombol ikon dan tampil sebagai baris di bawah toolbar.
 * `variant="hero"`: kolom besar di hero beranda, selalu tampil (tanpa tombol ikon), dengan pencarian yang sama.
 */
function GlobalSearch({ variant = 'toolbar' }) {
  const isHero = variant === 'hero'
  const [query, setQuery] = useState('')
  const [listOpen, setListOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [panelOpen, setPanelOpen] = useState(false)
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const toggleRef = useRef(null)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const baseId = useId()
  const inputId = `${baseId}-input`
  const listId = `${baseId}-list`
  const panelId = `${baseId}-panel`
  const optionId = (index) => `${baseId}-option-${index}`

  const { items, total } = useMemo(() => searchCatalogs(query), [query])
  const hasQuery = query.trim() !== ''
  const showList = listOpen && hasQuery
  const activeItem = showList ? items[activeIndex] : undefined

  // Pindah halaman: kolom dikosongkan dan semuanya ditutup.
  useEffect(() => {
    setQuery('')
    setListOpen(false)
    setPanelOpen(false)
  }, [pathname])

  // Panel ponsel dibuka → langsung bisa mengetik; klik di luar pencarian menutupnya.
  useEffect(() => {
    if (!panelOpen) return undefined
    inputRef.current?.focus()
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setPanelOpen(false)
        setListOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [panelOpen])

  const closePanel = () => {
    setPanelOpen(false)
    setListOpen(false)
    toggleRef.current?.focus()
  }

  const choose = (item) => {
    setQuery('')
    setListOpen(false)
    setPanelOpen(false)
    navigate(item.href)
    // Fokus pindah ke konten halaman baru, seperti setelah membuka tautan biasa.
    document.getElementById('konten')?.focus({ preventScroll: true })
  }

  const handleChange = (event) => {
    setQuery(event.target.value)
    setActiveIndex(0)
    setListOpen(true)
  }

  const handleKeyDown = (event) => {
    switch (event.key) {
      case 'ArrowDown':
        if (!hasQuery) return
        event.preventDefault()
        if (!showList) {
          setListOpen(true)
          setActiveIndex(0)
        } else if (items.length) {
          setActiveIndex((index) => (index + 1) % items.length)
        }
        break
      case 'ArrowUp':
        if (!showList || !items.length) return
        event.preventDefault()
        setActiveIndex((index) => (index - 1 + items.length) % items.length)
        break
      case 'Enter':
        if (!activeItem) return
        event.preventDefault()
        choose(activeItem)
        break
      case 'Escape':
        if (showList) setListOpen(false)
        else if (query) setQuery('')
        else if (panelOpen) closePanel()
        else return
        event.preventDefault()
        break
      default:
    }
  }

  // Fokus keluar dari pencarian (Tab, klik di tempat lain): daftar hasil ditutup.
  const handleBlur = (event) => {
    if (!rootRef.current?.contains(event.relatedTarget)) setListOpen(false)
  }

  return (
    <div
      className={`global-search${isHero ? ' global-search--hero' : ''}${panelOpen ? ' is-open' : ''}`}
      ref={rootRef}
      onBlur={handleBlur}
    >
      {!isHero && (
        <button
          ref={toggleRef}
          type="button"
          className="icon-button global-search__toggle"
          aria-label={panelOpen ? 'Tutup pencarian' : 'Buka pencarian'}
          aria-expanded={panelOpen}
          aria-controls={panelId}
          onClick={() => (panelOpen ? closePanel() : setPanelOpen(true))}
        >
          {panelOpen ? <X aria-hidden="true" /> : <Search aria-hidden="true" />}
        </button>
      )}

      <div className="global-search__panel" id={panelId}>
        <div className="global-search__field">
          <Search aria-hidden="true" className="global-search__icon" />
          <label htmlFor={inputId} className="visually-hidden">
            {SEARCH_LABEL}
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-controls={showList && items.length ? listId : undefined}
            aria-activedescendant={activeItem ? optionId(activeIndex) : undefined}
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => hasQuery && setListOpen(true)}
            placeholder={isHero ? 'Cari nama ikan, serangga, burung, resep, atau bahan…' : 'Cari ikan, serangga, resep…'}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck="false"
            enterKeyHint="search"
          />
          {query && (
            // Untuk mouse & sentuh; di keyboard Escape yang mengosongkan, jadi Tab langsung keluar dari pencarian.
            <button
              type="button"
              className="global-search__clear"
              aria-label="Kosongkan pencarian"
              tabIndex={-1}
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
            >
              <X aria-hidden="true" />
            </button>
          )}
        </div>

        {showList && (
          <div className="global-search__dropdown">
            {items.length > 0 ? (
              <ul className="global-search__list" id={listId} role="listbox" aria-label="Hasil pencarian">
                {items.map((item, index) => {
                  const Icon = item.catalog.icon
                  return (
                    <li
                      key={item.id}
                      id={optionId(index)}
                      role="option"
                      aria-selected={index === activeIndex}
                      className="search-option"
                      data-wildlife={item.catalog.slug}
                      data-href={item.href}
                      // Fokus tetap di kolom pencarian saat hasil diklik.
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseMove={() => index !== activeIndex && setActiveIndex(index)}
                      onClick={() => choose(item)}
                    >
                      <span className="search-option__thumb">
                        <EntryImage src={item.image} alt="" size={item.imageSize} loading="eager" />
                      </span>
                      <span className="search-option__name">
                        <Highlight text={item.name} query={query} />
                      </span>
                      <span className="search-option__kind">
                        <Icon aria-hidden="true" />
                        {item.catalog.label}
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="global-search__empty">
                <SearchX aria-hidden="true" />
                Tidak ada nama yang cocok dengan “{query.trim()}”.
              </p>
            )}
            {total > items.length && (
              <p className="global-search__more">
                {items.length} dari {total} hasil teratas. Ketik lebih spesifik untuk mempersempit.
              </p>
            )}
          </div>
        )}

        <p className="visually-hidden" role="status">
          {showList ? (total ? `${total} hasil` : 'Tidak ada hasil') : ''}
        </p>
      </div>
    </div>
  )
}

export default GlobalSearch
