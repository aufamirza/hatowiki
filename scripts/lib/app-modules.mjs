/**
 * Alat bersama skrip yang membaca data aplikasi (deskripsi Inggris, isian manual, halaman statis & sitemap): modul
 * aplikasi dimuat lewat Vite, sama seperti scripts/heartodex-sync.mjs, supaya data, katalog, dan teks yang dipakai skrip
 * persis sama dengan yang dipakai situs.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

// File data tiap katalog (kunci = slug katalog di src/components/layout/catalogs.js), untuk membaca komentar TODO-nya.
export const DATA_FILES = {
  fish: 'src/data/wildlife/fish.js',
  bugs: 'src/data/wildlife/bugs.js',
  birds: 'src/data/wildlife/birds.js',
  animals: 'src/data/wildlife/animals.js',
  recipes: 'src/data/recipes/recipes.js',
  crops: 'src/data/crops/crops.js',
  collectibles: 'src/data/collectibles/collectibles.js',
  ingredients: 'src/data/ingredients/ingredients.js',
}

/** Jalankan `run(load)`; `load('/src/...')` mengembalikan modul aplikasi. Server Vite ditutup setelah selesai. */
export async function withAppModules(run) {
  const server = await createServer({
    root: ROOT,
    logLevel: 'error',
    appType: 'custom',
    // Cache sendiri, supaya dev server yang sedang jalan (node_modules/.vite) tidak terganggu saat skrip atau build jalan.
    cacheDir: path.join(ROOT, 'node_modules/.vite-scripts'),
    server: { middlewareMode: true, hmr: false, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  try {
    return await run((file) => server.ssrLoadModule(file))
  } finally {
    await server.close()
  }
}

/** Semua katalog beserta entrinya: [{ slug, name, entries }] (urutan toolbar: Fish, Bugs, Birds, Animals, Recipes, …). */
export async function loadCatalogs(load) {
  const { CATALOGS } = await load('/src/components/layout/catalogs.js')
  return CATALOGS.map(({ slug, name, entries }) => ({ slug, name, entries }))
}
