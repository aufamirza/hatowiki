import { StrictMode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx'
import { loadLocale } from './i18n/I18nProvider'
import { localeFromPath } from './i18n/locales'
import { routes } from './routes.jsx'
import './index.css'

// HTML statis halaman hub, daftar, dan detail sudah berisi isi halamannya (scripts/build-seo.mjs, atribut data-ssr di
// <html>). Isi itu dipakai ulang (hydrate) kalau alamat yang dibuka sama persis dan tanpa query; kalau tidak (filter
// daftar di URL, alamat yang jatuh ke index.html lain), skrip di index.html memberi data-csr dan isinya disembunyikan,
// lalu aplikasi dirender dari awal. Beranda & Checklist tidak punya isi statis dan selalu dirender di sini.
const html = document.documentElement
const container = document.getElementById('root')
const hydrate = html.hasAttribute('data-ssr') && !html.hasAttribute('data-csr')

// Halaman /th & /en: teks & deskripsi bahasanya dimuat dulu (berkas terpisah), baru aplikasi dirender, supaya tidak
// sempat kosong dan sama dengan HTML statisnya. Kalau gagal dimuat, aplikasi tetap dirender dan menunggu lewat Suspense.
const locale = localeFromPath(window.location.pathname)
const ready = locale === 'id' ? Promise.resolve() : loadLocale(locale).catch(() => {})

ready.then(() => {
  // hydrationData (kosong, tidak ada loader): router tidak menggulir ke atas saat dipasang, jadi posisi gulir pengunjung
  // yang sudah membaca HTML statis (atau dipulihkan browser saat muat ulang) tetap.
  const router = createBrowserRouter(routes, hydrate ? { hydrationData: { loaderData: {} } } : undefined)
  const app = (
    <StrictMode>
      <App>
        <RouterProvider router={router} />
      </App>
    </StrictMode>
  )
  if (hydrate) {
    hydrateRoot(container, app)
    return
  }
  const root = createRoot(container)
  flushSync(() => root.render(app))
  html.removeAttribute('data-csr')
})
