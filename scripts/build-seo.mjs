#!/usr/bin/env node
/**
 * Halaman statis untuk crawler tanpa JavaScript, sitemap.xml, dan robots.txt. Dijalankan otomatis di akhir
 * `vite build` (plugin di vite.config.js); bisa juga dijalankan sendiri setelah build: `node scripts/build-seo.mjs`.
 *
 * WhatsApp, Discord, dan media sosial hanya membaca HTML mentah, jadi tiap halaman di tiap bahasa mendapat berkas HTML
 * sendiri: salinan dist/index.html yang judul, deskripsi, canonical, hreflang, Open Graph, dan atribut lang-nya sudah
 * diisi untuk halaman itu. Isi halamannya tetap dirender React seperti biasa (bukan SSR).
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

/** index.html dengan meta tag satu halaman (hasil getPageMeta). */
export function renderPage(template, meta) {
  let html = template
  html = replaceOnce(html, /<html lang="[^"]*">/, () => `<html lang="${escapeAttribute(meta.lang)}">`, 'html lang')
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
    const [{ SITE_URL, MAX_DESCRIPTION, alternateLinks, getPageMeta, listRoutes, pageUrl }, { LOCALES, localizePath }] = await Promise.all([
      load('/src/seo/pageMeta.js'),
      load('/src/i18n/locales.js'),
    ])
    const routes = listRoutes()
    const pages = {}
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
        const file = path.join(outDir, localizePath(route, locale.id), 'index.html')
        await mkdir(path.dirname(file), { recursive: true })
        await writeFile(file, renderPage(template, meta))
      }
      pages[locale.id] = routes.length
    }

    const groups = routes.map((route) => ({ urls: LOCALES.map((locale) => pageUrl(route, locale.id)), alternates: alternateLinks(route) }))
    await writeFile(path.join(outDir, 'sitemap.xml'), renderSitemap(groups))
    await writeFile(path.join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`)

    return { routes: routes.length, pages, sitemapUrls: routes.length * LOCALES.length, longest }
  })
}

export function describeResult(result) {
  const perLocale = Object.entries(result.pages).map(([locale, count]) => `${locale} ${count}`).join(', ')
  return `halaman statis: ${perLocale} (deskripsi terpanjang ${result.longest} karakter) · sitemap.xml: ${result.sitemapUrls} alamat · robots.txt`
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildSeo()
    .then((result) => console.log(describeResult(result)))
    .catch((error) => {
      console.error(error.message)
      process.exitCode = 1
    })
}
