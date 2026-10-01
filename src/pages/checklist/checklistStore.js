import { useSyncExternalStore } from 'react'

/**
 * Progres Checklist pemain, disimpan hanya di browser ini (localStorage) dan tidak pernah dikirim ke server mana pun.
 *
 * Bentuk yang disimpan di kunci STORAGE_KEY (versi 1):
 *   {
 *     version: 1,
 *     obtained: { fish: ['sea-bass', …], bugs: […], birds: […], recipes: […], achievements: […] },
 *     levels: { fish: 7, bugs: 3, birds: 14 },   // level hobi untuk Target Sekarang
 *     updatedAt: '2026-10-01T05:30:00.000Z'
 *   }
 * Progres dicatat per kategori dan slug entri, jadi tetap berlaku saat data bertambah. Slug atau kategori yang tidak
 * (lagi) dikenal tetap disimpan apa adanya, supaya cadangan dari versi situs lain tidak kehilangan isinya; yang dihitung
 * di halaman hanya entri yang ada di data.
 *
 * Berkas cadangan (Cadangkan → .json) berisi bentuk yang sama ditambah penanda `app` dan `kind`, supaya Pulihkan bisa
 * menolak berkas JSON lain.
 */
export const STORAGE_KEY = 'hdx-checklist'
export const STORAGE_VERSION = 1
export const BACKUP_APP = 'hatowiki'
export const BACKUP_KIND = 'checklist'

const EMPTY = Object.freeze({ version: STORAGE_VERSION, obtained: {}, levels: {}, updatedAt: null })

const isSlugList = (value) => Array.isArray(value) && value.every((slug) => typeof slug === 'string' && slug.trim())

// Isi apa pun (dari localStorage atau berkas) → bentuk yang aman dipakai; bagian yang rusak dibuang.
function normalize(raw) {
  if (!raw || typeof raw !== 'object') return EMPTY
  const obtained = {}
  for (const [kind, slugs] of Object.entries(raw.obtained ?? {})) {
    if (isSlugList(slugs)) obtained[kind] = [...new Set(slugs.map((slug) => slug.trim()))]
  }
  const levels = {}
  for (const [kind, level] of Object.entries(raw.levels ?? {})) {
    if (Number.isInteger(level) && level >= 1) levels[kind] = level
  }
  return { version: STORAGE_VERSION, obtained, levels, updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null }
}

function readStorage() {
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    return text ? normalize(JSON.parse(text)) : EMPTY
  } catch {
    return EMPTY
  }
}

// Apakah browser mengizinkan localStorage (mode tertentu memblokirnya). Kalau tidak, progres hanya bertahan selama
// halaman terbuka dan halaman menampilkan peringatan.
function canPersist() {
  try {
    const probe = `${STORAGE_KEY}-probe`
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

let state = null
let persistent = null
const listeners = new Set()

const current = () => {
  if (state === null) state = readStorage()
  return state
}

function commit(next) {
  state = { ...next, updatedAt: new Date().toISOString() }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Penyimpanan diblokir atau penuh: progres tetap berlaku selama halaman terbuka.
  }
  for (const listener of listeners) listener()
}

// Perubahan dari tab lain (event storage) ikut tampil di tab ini.
function handleStorage(event) {
  if (event.key !== STORAGE_KEY && event.key !== null) return
  state = readStorage()
  for (const listener of listeners) listener()
}

function subscribe(listener) {
  listeners.add(listener)
  if (listeners.size === 1) window.addEventListener('storage', handleStorage)
  return () => {
    listeners.delete(listener)
    if (!listeners.size) window.removeEventListener('storage', handleStorage)
  }
}

/** Progres saat ini (ikut diperbarui setiap kali berubah, juga dari tab lain). */
export function useChecklistState() {
  return useSyncExternalStore(subscribe, current, () => EMPTY)
}

export function isStoragePersistent() {
  if (persistent === null) persistent = canPersist()
  return persistent
}

/** Tandai satu entri sudah didapat (`obtained` true) atau belum. */
export function setObtained(kind, slug, obtained) {
  const list = current().obtained[kind] ?? []
  const has = list.includes(slug)
  if (has === obtained) return
  const next = obtained ? [...list, slug] : list.filter((item) => item !== slug)
  commit({ ...current(), obtained: { ...current().obtained, [kind]: next } })
}

/** Hapus semua tanda "sudah didapat" satu kategori (level hobi tidak ikut dihapus). */
export function resetKind(kind) {
  const { [kind]: _removed, ...rest } = current().obtained
  commit({ ...current(), obtained: rest })
}

export function setLevel(kind, level) {
  commit({ ...current(), levels: { ...current().levels, [kind]: level } })
}

// ---------- cadangan ----------

/** Isi berkas cadangan (teks JSON) dari progres saat ini. */
export function createBackup(date = new Date()) {
  const { obtained, levels } = current()
  return `${JSON.stringify({ app: BACKUP_APP, kind: BACKUP_KIND, version: STORAGE_VERSION, exportedAt: date.toISOString(), obtained, levels }, null, 2)}\n`
}

/** Nama berkas cadangan, mis. hatowiki-checklist-2026-10-01.json (tanggal lokal perangkat). */
export function backupFileName(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${BACKUP_APP}-${BACKUP_KIND}-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`
}

/**
 * Baca teks berkas cadangan. Hasilnya { ok: true, data } atau { ok: false, error } dengan error 'json' (bukan JSON),
 * 'kind' (JSON lain, bukan cadangan Checklist Hatowiki), atau 'version' (dari versi situs yang lebih baru).
 */
export function parseBackup(text) {
  let raw
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'json' }
  }
  if (!raw || raw.app !== BACKUP_APP || raw.kind !== BACKUP_KIND || typeof raw.obtained !== 'object' || raw.obtained === null) {
    return { ok: false, error: 'kind' }
  }
  if (!Number.isInteger(raw.version) || raw.version > STORAGE_VERSION) return { ok: false, error: 'version' }
  return { ok: true, data: normalize(raw) }
}

/** Ganti seluruh progres di browser ini dengan isi cadangan (hasil parseBackup). */
export function restoreBackup(data) {
  commit(normalize(data))
}
