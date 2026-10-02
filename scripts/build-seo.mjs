#!/usr/bin/env node
/**
 * Halaman statis untuk crawler tanpa JavaScript, sitemap.xml, dan robots.txt. Dijalankan otomatis di akhir
 * `vite build` (plugin di vite.config.js); bisa juga dijalankan sendiri setelah build: `node scripts/build-seo.mjs`.
 *
 * WhatsApp, Discord, dan media sosial hanya membaca HTML mentah, jadi tiap halaman di tiap bahasa mendapat berkas HTML
 * sendiri: salinan dist/index.html yang judul, deskripsi, canonical, hreflang, Open Graph, data terstruktur (JSON-LD),
 * dan atribut lang-nya sudah diisi untuk halaman itu. Hub Wildlife, halaman daftar, dan halaman detail juga berisi isi
 * halamannya di <div id="root"> (render React di server, src/entry-server.jsx), supaya crawler langsung membaca nama,
 * deskripsi, lokasi, jadwal, dan data lain; <html data-ssr="<alamat>"> menandainya, dan src/main.jsx melakukan hydrate.
 * Beranda dan Checklist tetap tanpa isi (dirender di browser).
 *
 *   dist/wildlife/fish/sea-bass/index.html        versi Indonesia
 *   dist/th/wildlife/fish/sea-bass/index.html     versi Thai
 *   dist/en/wildlife/fish/sea-bass/index.html     versi Inggris
 *
 * Daftar halaman dan isi meta tag berasal dari src/seo/pageMeta.js (sama dengan yang dipasang Layout di browser), dimuat
 * lewat Vite supaya datanya persis sama dengan aplikasi. Di Vercel berkas statis didahulukan daripada rewrite, jadi
 * rewrite di vercel.json hanya menangani alamat yang tidak punya berkas: alamat /th/... dan /en/... jatuh ke index.html
 * bahasanya, sisanya ke index.html.
 *
 * sitemap.xml memuat semua halaman di ketiga bahasa dengan alamat lengkap dan penanda hreflang per kelompok halaman.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT, withAppModules } from './lib/app-modules.mjs'

const escapeAttribute = (text) => String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escapeText = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Ganti tepat satu tag; kalau tag-nya tidak ada (atau dobel) di index.html, build dihentikan supaya tidak diam-diam salah.
function replaceOnce(html, pattern, replacement, label) {
  const matches = html.match(new RegExp(pattern.source, 'g'))?.length ?? 0
  if (matches !== 1) throw new Error(`build-seo: tag "${label}" ditemukan ${matches} kali di index.html (harus tepat 1).`)
  return html.replace(pattern, replacement)
}

const setTagAttribute = (html, tag, selector, attribute, value) =>
  replaceOnce(html, new RegExp(`(<${tag} ${escapeRegExp(selector)} ${attribute}=")[^"]*(")`), (_, open, close) => open + escapeAttribute(value) + close, `${tag} ${selector}`)

/**
 * index.html dengan meta tag satu halaman (hasil getPageMeta) dan, kalau ada, isi halamannya: `body` = HTML hasil
 * render untuk #root, `path` = alamat halaman itu (dengan awalan bahasa) untuk atribut data-ssr.
 */
export function renderPage(template, meta, { body = null, path = null } = {}) {
  let html = template
  const ssr = body == null ? '' : ` data-ssr="${escapeAttribute(path)}"`
  html = replaceOnce(html, /<html lang="[^"]*">/, () => `<html lang="${escapeAttribute(meta.lang)}"${ssr}>`, 'html lang')
  html = replaceOnce(html, /<title>[^<]*<\/title>/, () => `<title>${escapeText(meta.title)}</title>`, 'title')
  html = setTagAttribute(html, 'meta', 'name="description"', 'content', meta.description)
  html = setTagAttribute(html, 'link', 'rel="canonical"', 'href', meta.url)
  for (const { hreflang, href } of meta.alternates) html = setTagAttribute(html, 'link', `rel="alternate" hreflang="${hreflang}"`, 'href', href)
  html = setTagAttribute(html, 'meta', 'property="og:locale"', 'content', meta.ogLocale)
  html = setTagAttribute(html, 'meta', 'property="og:url"', 'content', meta.url)
  html = setTagAttribute(html, 'meta', 'property="og:title"', 'content', meta.title)
  html = setTagAttribute(html, 'meta', 'property="og:description"', 'content', meta.ogDescription)
  html = setTagAttribute(html, 'meta', 'property="og:image:alt"', 'content', meta.ogImageAlt)
  html = setTagAttribute(html, 'meta', 'name="twitter:title"', 'content', meta.title)
  html = setTagAttribute(html, 'meta', 'name="twitter:description"', 'content', meta.ogDescription)
  html = setTagAttribute(html, 'meta', 'name="twitter:image:alt"', 'content', meta.ogImageAlt)
  html = replaceOnce(
    html,
    /<script type="application\/ld\+json" id="structured-data">[^<]*<\/script>/,
    () => `<script type="application/ld+json" id="structured-data">${meta.structuredDataJson}</script>`,
    'script structured-data',
  )
  if (body != null) html = replaceOnce(html, /<div id="root"><\/div>/, () => `<div id="root">${body}</div>`, 'div root')
  return html
}

function renderSitemap(groups) {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
  for (const { urls, alternates } of groups) {
    const links = alternates.map(({ hreflang, href }) => `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeAttribute(href)}" />`)
    for (const url of urls) lines.push('  <url>', `    <loc>${escapeText(url)}</loc>`, ...links, '  </url>')
  }
  lines.push('</urlset>')
  return `${lines.join('\n')}\n`
}

/**
 * Tulis halaman statis, sitemap.xml, dan robots.txt ke `outDir` (hasil `vite build`).
 * @returns {{ routes: number, pages: Record<string, number>, sitemapUrls: number, longest: number }}
 */
export async function buildSeo({ outDir = path.join(ROOT, 'dist') } = {}) {
  const templateFile = path.join(outDir, 'index.html')
  if (!existsSync(templateFile)) throw new Error(`build-seo: ${templateFile} tidak ada. Jalankan "vite build" dulu.`)
  const template = await readFile(templateFile, 'utf8')

  return withAppModules(async (load) => {
    const started = Date.now()
    const [{ SITE_URL, MAX_DESCRIPTION, alternateLinks, getPageMeta, listRoutes, pageUrl, serializeStructuredData }, { LOCALES, localizePath }, { renderPage: renderBody, shouldPrerender }] =
      await Promise.all([load('/src/seo/pageMeta.js'), load('/src/i18n/locales.js'), load('/src/entry-server.jsx')])
    const routes = listRoutes()
    const pages = {}
    const prerendered = {}
    let longest = 0

    for (const locale of LOCALES) {
      const messages = JSON.parse(await readFile(path.join(ROOT, `src/i18n/messages/${locale.id}.json`), 'utf8'))
      const seen = new Map()
      for (const route of routes) {
        const meta = getPageMeta(route, locale.id, messages)
        if (!meta.found) throw new Error(`build-seo: halaman ${route} tidak dikenali (bahasa ${locale.id}).`)
        if (meta.description.length > MAX_DESCRIPTION) throw new Error(`build-seo: deskripsi ${locale.id} ${route} ${meta.description.length} karakter (maks. ${MAX_DESCRIPTION}).`)
        // Judul & deskripsi harus unik per halaman di dalam satu bahasa.
        for (const [kind, value] of [['judul', meta.title], ['deskripsi', meta.description]]) {
          const key = `${kind}:${value}`
          if (seen.has(key)) throw new Error(`build-seo: ${kind} ${locale.id} ${route} sama dengan ${seen.get(key)}: "${value}"`)
          seen.set(key, route)
        }
        longest = Math.max(longest, meta.description.length)
        const pagePath = localizePath(route, locale.id)
        const body = shouldPrerender(route) ? await renderBody(route, locale.id) : null
        if (body != null) prerendered[locale.id] = (prerendered[locale.id] ?? 0) + 1
        const file = path.join(outDir, pagePath, 'index.html')
        await mkdir(path.dirname(file), { recursive: true })
        await writeFile(file, renderPage(template, { ...meta, structuredDataJson: serializeStructuredData(meta.structuredData) }, { body, path: pagePath }))
      }
      pages[locale.id] = routes.length
    }

    const groups = routes.map((route) => ({ urls: LOCALES.map((locale) => pageUrl(route, locale.id)), alternates: alternateLinks(route) }))
    await writeFile(path.join(outDir, 'sitemap.xml'), renderSitemap(groups))
    await writeFile(path.join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`)

    return { routes: routes.length, pages, prerendered, sitemapUrls: routes.length * LOCALES.length, longest, seconds: (Date.now() - started) / 1000 }
  })
}

export function describeResult(result) {
  const perLocale = Object.entries(result.pages).map(([locale, count]) => `${locale} ${count} (${result.prerendered[locale] ?? 0} dengan isi)`).join(', ')
  return `halaman statis: ${perLocale}, deskripsi terpanjang ${result.longest} karakter, ${result.seconds.toFixed(1)} detik · sitemap.xml: ${result.sitemapUrls} alamat · robots.txt`
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildSeo()
    .then((result) => console.log(describeResult(result)))
    .catch((error) => {
      console.error(error.message)
      process.exitCode = 1
    })
}
