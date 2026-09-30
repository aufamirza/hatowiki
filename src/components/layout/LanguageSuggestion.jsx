import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { getTranslator, loadLocale, useI18n } from '../../i18n/I18nProvider'
import { ensureLocaleFont } from '../../i18n/fonts'
import { HINT_DISMISSED_KEY, LANGUAGE_CHOSEN_EVENT, readStoredLanguage } from '../../i18n/locales'
import { needsCountry, suggestLocale } from '../../i18n/suggestLocale'
import { useLanguageSwitch } from '../../i18n/useLanguageSwitch'

// Muncul sedikit setelah halaman tampil, supaya tidak berebut perhatian dengan konten yang baru dimuat.
const SHOW_DELAY = 900
const COUNTRY_CACHE_KEY = 'hdx-country'

const browserLanguages = () => (navigator.languages?.length ? [...navigator.languages] : [navigator.language ?? ''])

function wasDismissed() {
  try {
    return localStorage.getItem(HINT_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Negara pengunjung dari fungsi Vercel api/geo.js (header x-vercel-ip-country, tanpa layanan pihak ketiga), disimpan
 * per sesi supaya fungsinya hanya dipanggil sekali (permintaan yang sedang berjalan juga dipakai bersama). Saat
 * development (vite) fungsinya tidak ada → null.
 */
let countryRequest = null
function visitorCountry() {
  countryRequest ??= fetchCountry()
  return countryRequest
}

async function fetchCountry() {
  try {
    const cached = sessionStorage.getItem(COUNTRY_CACHE_KEY)
    if (cached !== null) return cached || null
  } catch {
    // sessionStorage diblokir: tetap tanya sekali.
  }
  let country = null
  try {
    const response = await fetch('/api/geo', { cache: 'no-store' })
    if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
      const body = await response.json()
      country = typeof body.country === 'string' ? body.country.toUpperCase() : null
    }
  } catch {
    country = null
  }
  try {
    sessionStorage.setItem(COUNTRY_CACHE_KEY, country ?? '')
  } catch {
    // abaikan
  }
  return country
}

/**
 * Bahasa yang disarankan untuk pengunjung halaman berbahasa `locale`, atau null. Aturannya di src/i18n/suggestLocale.js;
 * negara hanya ditanyakan kalau bahasa browser saja belum cukup, dan saran hanya ada kalau berbeda dari bahasa halaman.
 */
async function suggestedLocale(locale) {
  const languages = browserLanguages()
  const country = needsCountry(languages) ? await visitorCountry() : null
  const target = suggestLocale(languages, country)
  return target && target !== locale ? target : null
}

/**
 * Notifikasi kecil di pojok kiri bawah yang menyarankan versi bahasa lain (Thai, Indonesia, atau Inggris) kalau bahasa
 * yang cocok untuk pengunjung, dari bahasa browser dan kalau tersedia negaranya, berbeda dari bahasa halaman. Teksnya
 * dalam bahasa tujuan (atribut lang); saran Thai & Indonesia ditambah satu baris Inggris.
 * Tidak muncul lagi setelah ditutup (X / Escape) atau setelah pengunjung memilih bahasa (localStorage).
 * Aksesibel: dialog non-modal berlabel yang tidak merebut fokus, bisa difokus lewat Tab, Escape menutupnya. Di layar
 * kecil tampil selebar layar dan footer diberi ruang setinggi notifikasi, jadi tidak ada konten yang tertutup permanen.
 */
function LanguageSuggestion() {
  const { locale } = useI18n()
  const { switchTo, hrefFor } = useLanguageSwitch()
  const [target, setTarget] = useState(null)
  const [closing, setClosing] = useState(false)
  const rootRef = useRef(null)
  const titleId = useId()
  const textId = useId()

  useEffect(() => {
    setTarget(null)
    if (readStoredLanguage() || wasDismissed()) return undefined
    let cancelled = false
    let timer = 0
    suggestedLocale(locale).then(async (next) => {
      if (!next || cancelled) return
      await loadLocale(next).catch(() => {})
      ensureLocaleFont(next)
      if (!cancelled) timer = window.setTimeout(() => setTarget(next), SHOW_DELAY)
    })
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [locale])

  // Pengunjung memilih bahasa lewat pemilih bahasa (termasuk bahasa yang sama): saran tidak perlu lagi.
  useEffect(() => {
    const handleChosen = () => setTarget(null)
    window.addEventListener(LANGUAGE_CHOSEN_EVENT, handleChosen)
    return () => window.removeEventListener(LANGUAGE_CHOSEN_EVENT, handleChosen)
  }, [])

  // Ruang di bawah footer setinggi notifikasi (lihat Layout.css), supaya akhir halaman tetap bisa dibaca.
  useLayoutEffect(() => {
    const root = document.documentElement
    const node = rootRef.current
    if (!node) {
      root.style.removeProperty('--suggest-space')
      return undefined
    }
    const observer = new ResizeObserver(() => root.style.setProperty('--suggest-space', `${Math.ceil(node.offsetHeight) + 16}px`))
    observer.observe(node)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--suggest-space')
    }
  }, [target])

  const dismiss = () => {
    try {
      localStorage.setItem(HINT_DISMISSED_KEY, '1')
    } catch {
      // Penyimpanan diblokir: notifikasi tetap tertutup selama halaman terbuka.
    }
    const hadFocus = rootRef.current?.contains(document.activeElement)
    setClosing(true)
    window.setTimeout(() => {
      setTarget(null)
      setClosing(false)
    }, 160)
    if (hadFocus) document.getElementById('konten')?.focus({ preventScroll: true })
  }

  // Escape menutup notifikasi saat fokus ada di dalamnya, atau saat tidak ada elemen lain yang sedang difokus.
  useEffect(() => {
    if (!target) return undefined
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      const active = document.activeElement
      const idle = !active || active === document.body || active.id === 'konten'
      if (idle || rootRef.current?.contains(active)) {
        event.preventDefault()
        dismiss()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  })

  const t = target ? getTranslator(target) : null
  if (!target || !t) return null

  return (
    <div
      ref={rootRef}
      className={`lang-suggest${closing ? ' is-closing' : ''}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={textId}
      lang={target}
      tabIndex={-1}
    >
      <button type="button" className="lang-suggest__close" aria-label={t('suggestion.close')} title={t('suggestion.close')} onClick={dismiss}>
        <X aria-hidden="true" />
      </button>
      <p className="lang-suggest__title" id={titleId}>
        {t('suggestion.title')}
      </p>
      <p className="lang-suggest__text" id={textId}>
        {t('suggestion.text')}
      </p>
      {/* Baris Inggris untuk yang tidak membaca bahasa tujuan; saran versi Inggris tidak memerlukannya */}
      {t('suggestion.english') && (
        <p className="lang-suggest__english" lang="en">
          {t('suggestion.english')}
        </p>
      )}
      <a
        href={hrefFor(target)}
        hrefLang={target}
        className="btn btn--primary lang-suggest__action"
        onClick={(event) => switchTo(target, event)}
      >
        <span aria-hidden="true">✓</span>
        {t('suggestion.switch')}
      </a>
    </div>
  )
}

export default LanguageSuggestion
