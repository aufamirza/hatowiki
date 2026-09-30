/**
 * Ambil halaman & gambar heartodex dengan sopan: jeda minimal antar request dan cache permanen di scripts/.cache/heartodex
 * (sama dengan scripts/heartodex-sync.mjs, jadi halaman yang sudah pernah diambil tidak diambil ulang). Dipakai skrip
 * sinkronisasi Achievements, Items, dan NPCs (scripts/heartodex-sync-extra.mjs).
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { ROOT } from './app-modules.mjs'

export const BASE_URL = 'https://www.heartodex.com'
const CACHE_DIR = path.join(ROOT, 'scripts/.cache/heartodex')
const REQUEST_GAP_MS = 2000
const USER_AGENT = 'Mozilla/5.0 (compatible; hatowiki-sync/1.0; +fan-wiki)'

export const fetchStats = { network: 0, cache: 0 }
let lastRequestAt = 0
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function cacheFile(url) {
  const { pathname } = new URL(url)
  const name = pathname.replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9._-]+/g, '__') || 'index'
  return path.join(CACHE_DIR, /\.[a-z0-9]+$/i.test(name) ? name : `${name}.html`)
}

async function politeFetch(url) {
  const wait = lastRequestAt + REQUEST_GAP_MS - Date.now()
  if (wait > 0) await sleep(wait)
  lastRequestAt = Date.now()
  fetchStats.network++
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!response.ok) throw new Error(`HTTP ${response.status} untuk ${url}`)
  return response
}

/** Isi halaman (teks) atau berkas (Buffer, `binary`), dari cache kalau sudah pernah diambil. */
export async function getCached(url, { binary = false } = {}) {
  const file = cacheFile(url)
  if (existsSync(file)) {
    fetchStats.cache++
    return binary ? readFile(file) : readFile(file, 'utf8')
  }
  const response = await politeFetch(url)
  const data = binary ? Buffer.from(await response.arrayBuffer()) : await response.text()
  await mkdir(CACHE_DIR, { recursive: true })
  await writeFile(file, data)
  console.log(`  ambil ${url}`)
  return data
}
