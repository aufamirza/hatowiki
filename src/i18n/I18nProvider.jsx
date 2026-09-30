import { cloneElement, createContext, isValidElement, use, useContext, useEffect, useMemo } from 'react'
import { getManualDescription } from '../data/manualDescriptions'
import { getLocale, localizePath } from './locales'
import { ensureLocaleFont } from './fonts'
import { formatParts, lookup, translateDataText } from './format'
import id from './messages/id.json'

/**
 * Teks antarmuka per bahasa ada di messages/<bahasa>.json. Bahasa Indonesia ikut bundel utama; bahasa lain (Thai,
 * Inggris) dimuat terpisah hanya saat dibutuhkan, bersama deskripsi entrinya (scripts/translations/<kind>.<bahasa>.json),
 * supaya versi Indonesia tetap ringan. `t(key, vars)` mengganti {nama} dengan nilai di `vars` (lihat format.js, termasuk
 * bentuk jamak {count|satu|banyak}); kalau salah satu nilainya elemen React (mis. <strong>), hasilnya daftar node,
 * bukan string.
 */
const MESSAGE_LOADERS = { th: () => import('./messages/th.json'), en: () => import('./messages/en.json') }
// Deskripsi per jenis entri (fish, bugs, …), satu berkas per jenis & bahasa. Thai: terjemahan dari teks asli. Inggris:
// teks asli yang salah ketiknya sudah dibetulkan (scripts/english-descriptions.mjs). Kunci `_meta` berisi catatannya.
const DESCRIPTION_LOADERS = import.meta.glob('/scripts/translations/*.{th,en}.json', { import: 'default' })
const DESCRIPTION_FILE = /\/([a-z-]+)\.([a-z]+)\.json$/

const loaded = { id: { messages: id, descriptions: null } }
const pending = {}

/** Muat teks (dan deskripsi entri) satu bahasa. Promise yang sama dipakai ulang, jadi aman dipanggil berkali-kali. */
export function loadLocale(localeId) {
  if (loaded[localeId]) return Promise.resolve(loaded[localeId])
  if (!pending[localeId]) {
    const descriptions = Promise.all(
      Object.entries(DESCRIPTION_LOADERS)
        .map(([path, load]) => ({ load, match: path.match(DESCRIPTION_FILE) }))
        .filter(({ match }) => match[2] === localeId)
        .map(async ({ load, match }) => {
          const { _meta, ...texts } = await load()
          return [match[1], texts]
        }),
    )
    pending[localeId] = Promise.all([MESSAGE_LOADERS[localeId](), descriptions]).then(([module, entries]) => {
      loaded[localeId] = { messages: module.default, descriptions: Object.fromEntries(entries) }
      return loaded[localeId]
    })
  }
  return pending[localeId]
}

export const isLocaleLoaded = (localeId) => Boolean(loaded[localeId])

/** Teks antarmuka bahasa yang sudah dimuat (untuk meta tag halaman, lihat src/seo/pageMeta.js), atau null. */
export const getLoadedMessages = (localeId) => loaded[localeId]?.messages ?? null

function interpolate(template, vars) {
  if (!vars || typeof template !== 'string') return template
  const values = formatParts(template, vars)
  if (!values.some(isValidElement)) return values.join('')
  return values.filter((value) => value !== '').map((value, index) => (isValidElement(value) ? cloneElement(value, { key: index }) : value))
}

function createI18n(localeId, data) {
  const locale = getLocale(localeId)
  const number = new Intl.NumberFormat(locale.intl)
  const list = new Intl.ListFormat(locale.intl, { type: 'conjunction' })
  const t = (key, vars) => {
    const template = lookup(data.messages, key) ?? lookup(id, key)
    if (template === undefined) {
      if (import.meta.env.DEV) console.warn(`[i18n] teks "${key}" tidak ada`)
      return key
    }
    return interpolate(template, vars)
  }
  return {
    locale: locale.id,
    intl: locale.intl,
    t,
    /** Teks per jenis katalog (label, noun, hobby, intro, …) dari messages `kinds.<slug>`. */
    kind: (slug) => lookup(data.messages, `kinds.${slug}`) ?? lookup(id, `kinds.${slug}`),
    formatNumber: (value) => number.format(value),
    formatList: (items) => list.format(items),
    /** Alamat internal (tanpa awalan bahasa) → alamat untuk bahasa ini. */
    path: (to) => localizePath(to, locale.id),
    /**
     * Deskripsi entri untuk bahasa ini; tidak ada → null ("Deskripsi belum tersedia").
     * - Entri yang teks Inggrisnya diisi manual dari game (data/manual/descriptions.json): teks itu yang jadi deskripsi
     *   asli (sumber "in-game") dan mengalahkan data dari heartodex; bahasa lain memakai terjemahan di berkas yang sama.
     * - Indonesia: `entry.description`. Thai: terjemahan dari teks asli di scripts/translations/<kind>.th.json.
     *   Inggris: teks asli yang salah ketiknya sudah dibetulkan di <kind>.en.json; entri yang belum masuk berkas itu
     *   (baru disinkronkan) memakai teks aslinya apa adanya.
     * - Deskripsi yang disembunyikan di versi Indonesia (salah salin di sumber) tidak ada di berkas bahasa lain.
     */
    description: (kindSlug, entry) => {
      const manual = getManualDescription(kindSlug, entry.slug)
      if (manual) return manual[locale.id] ?? null
      if (!data.descriptions) return entry.description ?? null
      const text = data.descriptions[kindSlug]?.[entry.slug]
      if (text) return text
      const original = locale.id === 'en' && entry.description && !entry.descriptionSourceLang ? entry.descriptionOriginal : null
      return original ?? null
    },
    /**
     * Teks data berbahasa Indonesia (mis. tempat membeli bahan: "Toko Massimo", "selama event X") → bahasa ini, lewat
     * `dataText` di messages. Kunci boleh memuat {nama} sebagai bagian yang dibiarkan apa adanya.
     */
    dataText: (text) => translateDataText(text, data.descriptions ? data.messages.dataText : null, warnMissingDataText),
  }
}

function warnMissingDataText(text) {
  if (import.meta.env.DEV) console.warn(`[i18n] teks data "${text}" belum diterjemahkan`)
}

/** Fungsi t untuk bahasa lain yang sudah dimuat (mis. teks notifikasi saran bahasa), atau null. */
export function getTranslator(localeId) {
  return loaded[localeId] ? createI18n(localeId, loaded[localeId]).t : null
}

const I18nContext = createContext(createI18n('id', loaded.id))

/**
 * Menyediakan bahasa halaman (dari awalan alamat, lihat Layout) ke semua komponen, dan memasang atribut lang di <html>
 * serta font Thai. Kalau teks bahasanya belum dimuat, komponen ini menunggu (Suspense) sampai selesai.
 */
export function I18nProvider({ locale, children }) {
  const data = loaded[locale] ?? use(loadLocale(locale))
  const value = useMemo(() => createI18n(locale, data), [locale, data])

  useEffect(() => {
    document.documentElement.lang = locale
    ensureLocaleFont(locale)
  }, [locale])

  return <I18nContext value={value}>{children}</I18nContext>
}

export const useI18n = () => useContext(I18nContext)
