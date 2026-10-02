import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { buildSeo, describeResult } from './scripts/build-seo.mjs'

// Setelah bundel selesai ditulis: HTML statis per halaman & bahasa (meta tag, JSON-LD, dan isi halaman hub/daftar/detail
// untuk crawler tanpa JavaScript), sitemap.xml, dan robots.txt. Lihat scripts/build-seo.mjs. Hanya saat `vite build`.
function seoPages() {
  let outDir
  return {
    name: 'hatowiki-seo-pages',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    async closeBundle() {
      const result = await buildSeo({ outDir })
      console.log(`\n${describeResult(result)}`)
    },
  }
}

export default defineConfig({
  plugins: [react(), seoPages()],
  build: {
    rolldownOptions: {
      output: {
        // Data wildlife (ikan, serangga, burung, poligon zona) dan library dipisah dari kode aplikasi supaya
        // tiap berkas di bawah batas peringatan 500 kB. Semuanya tetap dimuat di awal seperti sebelumnya.
        codeSplitting: {
          groups: [
            { name: 'wildlife-data', test: /[\\/]src[\\/]data[\\/]wildlife[\\/]/ },
            { name: 'vendor', test: /[\\/]node_modules[\\/]/ },
          ],
        },
      },
    },
  },
})
