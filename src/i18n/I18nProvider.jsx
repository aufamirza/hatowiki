import { cloneElement, createContext, isValidElement, use, useContext, useEffect, useMemo } from 'react'
import { getLocale, localizePath } from './locales'
import { ensureLocaleFont } from './fonts'
import id from './messages/id.json'

/**
 * Teks antarmuka per bahasa ada di messages/<bahasa>.json. Bahasa Indonesia ikut bundel utama; bahasa lain (Thai)
 * dimuat terpisah hanya saat dibutuhkan, bersama deskripsi entrinya (scripts/translations/<kind>.th.json), supaya
 * versi Indonesia tetap ringan. `t(key, vars)` mengganti {nama} dengan nilai di `vars`; kalau salah satu nilainya elemen
 * React (mis. <strong>), hasilnya daftar node, bukan string.
 */
const MESSAGE_LOADERS = { th: () => import('./messages/th.json') }
// Deskripsi Thai per jenis entri (fish, bugs, …), satu berkas per jenis. Kunci `_meta` berisi catatan terjemahan.
const DESCRIPTION_LOADERS = import.meta.glob('/scripts/translations/*.th.json', { import: 'default' })

const loaded = { id: { messages: id, descriptions: null } }
const pending = {}

function kindOfPath(path) {
  return path.match(/\/([a-z-]+)\.th\.json$/)[1]
}

/** Muat teks (dan deskripsi entri) satu bahasa. Promise yang sama dipakai ulang, jadi aman dipanggil berkali-kali. */
export function loadLocale(localeId) {
  if (loaded[localeId]) return Promise.resolve(loaded[localeId])
  if (!pending[localeId]) {
    const descriptions = Promise.all(
      Object.entries(DESCRIPTION_LOADERS).map(async ([path, load]) => {
        const { _meta, ...texts } = await load()
        return [kindOfPath(path), texts]
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

function lookup(messages, key) {
  let node = messages
  for (const part of key.split('.')) {
    node = node?.[part]
    if (node === undefined) return undefined
  }
  return node
}

function interpolate(template, vars) {
  if (!vars || typeof template !== 'string') return template
  const parts = template.split(/\{(\w+)\}/)
  let rich = false
  const values = parts.map((part, index) => {
    if (index % 2 === 0) return part
    const value = vars[part]
    if (isValidElement(value)) rich = true
    return value ?? `{${part}}`
  })
  if (!rich) return values.join('')
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
     * Deskripsi entri untuk bahasa ini. Bahasa Indonesia: `entry.description`. Bahasa lain: terjemahan dari teks asli
     * (Inggris) di scripts/translations/<kind>.<bahasa>.json; tidak ada → null ("Deskripsi belum tersedia"). Deskripsi
     * yang disembunyikan di versi Indonesia (salah salin di sumber) memang tidak diterjemahkan.
     */
    description: (kindSlug, entry) => (data.descriptions ? data.descriptions[kindSlug]?.[entry.slug] ?? null : entry.description ?? null),
    /**
     * Teks data berbahasa Indonesia (mis. tempat membeli bahan: "Toko Massimo", "selama event X") → bahasa ini, lewat
     * `dataText` di messages. Kunci boleh memuat {nama} sebagai bagian yang dibiarkan apa adanya.
     */
    dataText: (text) => {
      if (text == null || !data.descriptions) return text
      const table = data.messages.dataText ?? {}
      if (table[text]) return table[text]
      for (const [pattern, translation] of Object.entries(table)) {
        if (!pattern.includes('{')) continue
        const names = []
        const source = pattern.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{(\w+)\}/g, (_, name) => {
          names.push(name)
          return '(.+)'
        })
        const match = text.match(new RegExp(`^${source}$`))
        if (match) return interpolate(translation, Object.fromEntries(names.map((name, i) => [name, match[i + 1]])))
      }
      if (import.meta.env.DEV) console.warn(`[i18n] teks data "${text}" belum diterjemahkan`)
      return text
    },
  }
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
