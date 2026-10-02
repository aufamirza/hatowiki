import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router-dom'
import App from './App'
import { loadLocale } from './i18n/I18nProvider'
import { localizePath } from './i18n/locales'
import { resolveRoute, SITE_URL } from './seo/pageMeta'
import { routes } from './routes'

/**
 * Render isi halaman ke HTML untuk halaman statis (dipanggil scripts/build-seo.mjs saat build), supaya crawler bisa
 * membaca nama, deskripsi, lokasi, jadwal, dan data lain tanpa menjalankan JavaScript. Di browser HTML ini di-hydrate
 * oleh src/main.jsx dengan pohon komponen yang sama (App + router), jadi hasilnya harus identik dengan render pertama di
 * browser: bagian yang bergantung pada browser (jam server, tema) memakai useHydrated dan baru tampil setelah hydrate.
 *
 * Hanya hub Wildlife, halaman daftar, dan halaman detail. Beranda dan Checklist tidak: isinya bergantung pada jam,
 * localStorage, dan ukuran layar (pita waktu server, Muncul Sekarang, progres Checklist), jadi tetap dirender di
 * browser seperti sebelumnya. Meta tag & data terstruktur semua halaman tetap ada di HTML statis.
 */
const PRERENDERED = new Set(['hub', 'list', 'detail'])

export const shouldPrerender = (route) => PRERENDERED.has(resolveRoute(route).type)

const handler = createStaticHandler(routes)

/** HTML isi <div id="root"> untuk `route` (tanpa awalan bahasa) dalam bahasa `localeId`. */
export async function renderPage(route, localeId) {
  // Teks & deskripsi Thai/Inggris dimuat dulu, sama seperti src/main.jsx sebelum hydrate.
  await loadLocale(localeId)
  const context = await handler.query(new Request(SITE_URL + localizePath(route, localeId)))
  if (context instanceof Response) throw new Error(`entry-server: ${route} (${localeId}) dialihkan, bukan halaman.`)
  const router = createStaticRouter(handler.dataRoutes, context)
  return renderToString(
    <StrictMode>
      <App>
        <StaticRouterProvider router={router} context={context} hydrate={false} />
      </App>
    </StrictMode>,
  )
}
