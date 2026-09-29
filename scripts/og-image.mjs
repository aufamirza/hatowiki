#!/usr/bin/env node
/**
 * Membuat gambar preview tautan (Open Graph / Twitter Card) 1200×630 dari hero beranda versi siang (light mode): judul
 * "Hatowiki" dan tagline di atas pemandangan yang sama, tanpa toolbar, kolom cari, dan animasi. Hasilnya
 * public/og-image.jpg (dipasang di index.html sebagai og:image & twitter:image).
 *
 * Pemakaian (dev server harus sudah jalan):
 *   npm run dev
 *   node scripts/og-image.mjs
 * Variabel lingkungan: BASE_URL (bawaan http://localhost:5173), CHROME_PATH (lokasi Chrome/Edge).
 */
import { writeFileSync } from 'node:fs'
import { openTab, sleep, startChrome } from './qa/cdp.mjs'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173'
const OUTPUT = 'public/og-image.jpg'
const WIDTH = 1200
const HEIGHT = 630
const MAX_BYTES = 300 * 1024
const PORT = 9300 + Math.floor(Math.random() * 100)

// Hero dibuat setinggi gambar: konten di tengah area langit, tanpa toolbar & kolom cari, animasi di posisi awal.
const OG_CSS = `
  .site { --header-space: 0px; }
  .site-header, .skip-link, .hero__badge, .global-search--hero, .home > :not(.hero), .site-footer { display: none !important; }
  *, *::before, *::after { animation: none !important; transition: none !important; }
  .hero { height: ${HEIGHT}px; padding: 0 0 calc(var(--hero-land-height) * 0.62); display: flex; align-items: center; }
  .hero__content { width: 100%; }
  .hero__title { margin: 0 0 var(--space-6); }
  .hero__lead { max-width: 46rem; font-size: 1.625rem; line-height: 1.4; }
  .hero-creature--morpho { top: 64%; }
`

async function main() {
  try {
    await fetch(`${BASE_URL}/`)
  } catch {
    throw new Error(`Dev server tidak bisa dibuka di ${BASE_URL}. Jalankan "npm run dev" dulu.`)
  }
  const chrome = await startChrome(PORT)
  try {
    const tab = await openTab(PORT, WIDTH)
    const { send, evaluate } = tab
    await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false })
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })
    await send('Page.navigate', { url: `${BASE_URL}/` })
    await sleep(1500)
    await evaluate(`localStorage.removeItem('hdx-theme'); document.documentElement.dataset.theme = 'light'`)
    const ready = await evaluate(`(async () => {
      const style = document.createElement('style')
      style.textContent = ${JSON.stringify(OG_CSS)}
      document.head.append(style)
      const images = [...document.querySelectorAll('.hero img')]
      images.forEach((img) => { img.loading = 'eager' })
      await Promise.all(images.map((img) => img.complete && img.naturalWidth ? 0 : new Promise((r) => { img.onload = img.onerror = r })))
      await document.fonts.ready
      await new Promise((r) => setTimeout(r, 400))
      return { images: images.filter((img) => img.naturalWidth > 0).length, font: document.fonts.check('700 64px Fraunces') }
    })()`)
    if (!ready.font) throw new Error('Font Fraunces belum termuat.')
    let quality = 90
    let bytes
    for (;;) {
      const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT, scale: 1 } })
      bytes = Buffer.from(shot.result.data, 'base64')
      if (bytes.length <= MAX_BYTES || quality <= 60) break
      quality -= 5
    }
    if (bytes.length > MAX_BYTES) throw new Error(`Gambar ${Math.round(bytes.length / 1024)} KB, di atas batas 300 KB.`)
    writeFileSync(OUTPUT, bytes)
    console.log(`${OUTPUT}: ${WIDTH}×${HEIGHT}, JPEG kualitas ${quality}, ${Math.round(bytes.length / 1024)} KB, ${ready.images} hiasan termuat`)
    await tab.close()
  } finally {
    chrome.stop()
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
