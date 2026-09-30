import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { loadLocale } from './I18nProvider'
import { localizePath, storeLanguage, stripLocale } from './locales'

/**
 * Pindah bahasa ke halaman yang sama: alamat tanpa awalan diberi awalan bahasa tujuan, pencarian & filter di URL
 * (?q=…&waktu=…) dan state (tombol kembali ke daftar) ikut dibawa, posisi gulir tidak di-reset. Pilihan disimpan
 * untuk kunjungan berikutnya; teks bahasa tujuan dimuat dulu supaya halaman tidak sempat kosong.
 */
export function useLanguageSwitch() {
  const location = useLocation()
  const navigate = useNavigate()
  const base = stripLocale(location.pathname)

  const hrefFor = useCallback(
    (localeId) => `${localizePath(base, localeId)}${location.search}${location.hash}`,
    [base, location.search, location.hash],
  )

  const switchTo = useCallback(
    async (localeId, event) => {
      // Klik dengan Ctrl/Cmd/Shift/tombol tengah: biarkan browser membuka tautan seperti biasa.
      if (event && (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return
      event?.preventDefault()
      storeLanguage(localeId)
      await loadLocale(localeId).catch(() => {})
      navigate(hrefFor(localeId), { state: location.state, preventScrollReset: true })
    },
    [hrefFor, navigate, location.state],
  )

  return { hrefFor, switchTo }
}
