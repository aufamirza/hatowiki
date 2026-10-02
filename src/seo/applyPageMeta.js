import { serializeStructuredData } from './pageMeta'

/**
 * Memasang meta tag sebuah halaman (hasil getPageMeta di pageMeta.js) ke <head> dokumen yang sedang terbuka: judul,
 * deskripsi, canonical, Open Graph & Twitter, tautan versi bahasa (hreflang), dan data terstruktur (JSON-LD). Dipanggil
 * Layout setiap kali halaman atau bahasanya berganti, supaya tab, riwayat, dan pratinjau tautan mengikuti halaman yang
 * sedang dibuka. HTML statis tiap halaman (scripts/build-seo.mjs) berisi nilai yang sama sejak awal; tag yang dipakai ada
 * di index.html.
 */
function setAttribute(selector, attribute, value) {
  document.head.querySelector(selector)?.setAttribute(attribute, value)
}

export function applyPageMeta(meta) {
  document.title = meta.title
  setAttribute('meta[name="description"]', 'content', meta.description)
  setAttribute('link[rel="canonical"]', 'href', meta.url)
  setAttribute('meta[property="og:locale"]', 'content', meta.ogLocale)
  setAttribute('meta[property="og:url"]', 'content', meta.url)
  setAttribute('meta[property="og:title"]', 'content', meta.title)
  setAttribute('meta[property="og:description"]', 'content', meta.ogDescription)
  setAttribute('meta[property="og:image:alt"]', 'content', meta.ogImageAlt)
  setAttribute('meta[name="twitter:title"]', 'content', meta.title)
  setAttribute('meta[name="twitter:description"]', 'content', meta.ogDescription)
  setAttribute('meta[name="twitter:image:alt"]', 'content', meta.ogImageAlt)
  const structured = document.getElementById('structured-data')
  const json = serializeStructuredData(meta.structuredData)
  if (structured && structured.textContent !== json) structured.textContent = json

  // Halaman yang tidak ada (404 di sisi aplikasi) tidak perlu diindeks.
  let robots = document.head.querySelector('meta[name="robots"]')
  if (meta.found) robots?.remove()
  else {
    if (!robots) {
      robots = document.createElement('meta')
      robots.name = 'robots'
      document.head.append(robots)
    }
    robots.content = 'noindex'
  }

  for (const { hreflang, href } of meta.alternates) {
    let link = document.head.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`)
    if (!link) {
      link = document.createElement('link')
      link.rel = 'alternate'
      link.hreflang = hreflang
      document.head.append(link)
    }
    link.href = href
  }
}
