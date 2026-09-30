import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useI18n } from '../../i18n/I18nProvider'
import './FilterDropdown.css'

/**
 * Dropdown checkbox untuk satu kelompok filter (ATAU di dalam kelompok).
 * Menutup saat klik di luar, Escape, atau fokus keyboard keluar; panah atas/bawah, Home, End
 * memindahkan fokus antar opsi. `label` = nama kelompok (sudah diterjemahkan).
 */
function FilterDropdown({ group, label, open, onOpenChange, onToggle }) {
  const { t } = useI18n()
  const { def, options, selectedCount } = group
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const panelRef = useRef(null)
  const onOpenChangeRef = useRef(onOpenChange)
  const [alignEnd, setAlignEnd] = useState(false)
  const panelId = useId()

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange
  })

  // Klik/tap di luar dropdown menutupnya.
  useEffect(() => {
    if (!open) return undefined
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) onOpenChangeRef.current(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  // Panel yang akan keluar dari tepi kanan layar dirapatkan ke kanan tombol, supaya halaman tidak melebar.
  useLayoutEffect(() => {
    if (!open) {
      setAlignEnd(false)
      return
    }
    const rect = panelRef.current?.getBoundingClientRect()
    if (rect && rect.right > document.documentElement.clientWidth - 8) setAlignEnd(true)
  }, [open])

  const focusOption = (index) => {
    const inputs = [...(panelRef.current?.querySelectorAll('input') ?? [])]
    if (inputs.length) inputs[(index + inputs.length) % inputs.length].focus()
  }

  const handleButtonKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      onOpenChange(true)
      requestAnimationFrame(() => focusOption(0))
    }
  }

  const handlePanelKeyDown = (event) => {
    const inputs = [...panelRef.current.querySelectorAll('input')]
    const index = inputs.indexOf(document.activeElement)
    const moves = { ArrowDown: index + 1, ArrowUp: index - 1, Home: 0, End: inputs.length - 1 }
    if (event.key in moves) {
      event.preventDefault()
      focusOption(moves[event.key])
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && open) {
      event.stopPropagation()
      onOpenChange(false)
      buttonRef.current?.focus()
    }
  }

  // Fokus keyboard pindah ke elemen lain (mis. Tab) → tutup. Klik di luar sudah ditangani pointerdown.
  // Fokus yang pindah ke elemen pembungkus dropdown (mis. <main tabIndex=-1>) diabaikan: itu terjadi
  // saat mousedown di teks/angka opsi yang tidak bisa difokus, bukan karena fokus keluar. Tanpa
  // pengecualian ini dropdown tertutup sebelum klik sampai ke label, sehingga opsi tidak tercentang.
  const handleBlur = (event) => {
    const next = event.relatedTarget
    if (open && next && !rootRef.current.contains(next) && !next.contains(rootRef.current)) onOpenChange(false)
  }

  return (
    <div className="filter-dropdown" ref={rootRef} onKeyDown={handleKeyDown} onBlur={handleBlur}>
      <button
        ref={buttonRef}
        type="button"
        className={`filter-dropdown__button${selectedCount ? ' is-active' : ''}`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => onOpenChange(!open)}
        onKeyDown={handleButtonKeyDown}
      >
        <span className="filter-dropdown__label">{label}:</span>
        <span className="filter-dropdown__status">{selectedCount ? t('filter.selected', { count: selectedCount }) : t('filter.all')}</span>
        <ChevronDown aria-hidden="true" className="filter-dropdown__chevron" />
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          className={`filter-dropdown__panel${alignEnd ? ' is-align-end' : ''}`}
          onKeyDown={handlePanelKeyDown}
        >
          <fieldset>
            <legend className="visually-hidden">{label}</legend>
            <ul>
              {options.map((option) => (
                <li key={option.value}>
                  <label className={`filter-check${option.count === 0 && !option.selected ? ' is-empty' : ''}`}>
                    <input type="checkbox" checked={option.selected} onChange={() => onToggle(def, option.value)} />
                    <span className="filter-check__label">
                      {option.emoji && <span aria-hidden="true">{option.emoji}</span>}
                      {def.optionKey ? t(def.optionKey, { value: option.value }) : option.value}
                    </span>
                    <span className="filter-check__count">
                      <span className="visually-hidden">, </span>
                      {option.count}
                      <span className="visually-hidden">{t('filter.optionCountSuffix')}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        </div>
      )}
    </div>
  )
}

export default FilterDropdown
