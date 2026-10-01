import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ListChecks, RotateCcw, Search, Undo2 } from 'lucide-react'
import Breadcrumbs from '../../components/Breadcrumbs'
import CategoryHeader from '../../components/CategoryHeader'
import { EVENTS, compareSections } from '../../data/events'
import { SERVERS } from '../../data/gameTime'
import { WEATHERS } from '../../data/wildlife/attributes'
import { useI18n } from '../../i18n/I18nProvider'
import { groupBySection } from '../catalog/sections'
import BackupPanel from './BackupPanel'
import CatchNowView from './CatchNowView'
import ChecklistRow from './ChecklistRow'
import { CHECKLIST_KINDS, DEFAULT_CHECKLIST_KIND, getChecklistKind } from './checklistKinds'
import { resetKind, setLevel, setObtained, useChecklistState } from './checklistStore'
import ConfirmDialog from './ConfirmDialog'
// Gaya yang dipakai ulang: kolom pencarian daftar, badge level & kategori kartu, badge periode, warna per kategori.
import '../catalog/CatalogListPage.css'
import '../../components/catalog/CatalogCard.css'
import '../../components/ServerTime.css'
import '../wildlife/wildlifeTints.css'
import '../recipes/recipeTint.css'
import '../goods/goodsTints.css'
import './ChecklistPage.css'

// Status di URL (tanpa menumpuk riwayat, tanpa melompat ke atas), supaya tombol kembali dari halaman detail memulihkannya.
const URL_UPDATE = { replace: true, preventScrollReset: true }
const PARAMS = { kind: 'kategori', view: 'tampilan', status: 'status', query: 'q' }
const VIEWS = { list: 'daftar', now: 'sekarang' }
const STATUSES = [
  { id: 'belum', labelKey: 'checklist.statusTodo' },
  { id: 'sudah', labelKey: 'checklist.statusDone' },
  { id: 'semua', labelKey: 'checklist.statusAll' },
]
const DEFAULT_STATUS = 'belum'
const SEARCH_DEBOUNCE_MS = 200
const TOAST_MS = 6000

// Server dipakai bersama Muncul Sekarang di beranda (kunci yang sama), bawaan SEA.
const SERVER_KEY = 'hdx-server'
const DEFAULT_SERVER = 'sea'
// Cuaca hanya diingat selama sesi tab ini: cuaca di game cepat berganti.
const WEATHER_KEY = 'hdx-checklist-weather'
const DEFAULT_WEATHER = 'Sunny'
// Event yang menurut pemain sedang berjalan di game (Target Sekarang), daftar nama event; bawaannya tidak ada.
const EVENTS_KEY = 'hdx-checklist-events'

function readStoredEvents() {
  try {
    const names = JSON.parse(localStorage.getItem(EVENTS_KEY) ?? '[]')
    return Array.isArray(names) ? names.filter((name) => EVENTS.some((event) => event.name === name)) : []
  } catch {
    return []
  }
}

function readStored(storage, key, valid, fallback) {
  try {
    const value = storage().getItem(key)
    return valid(value) ? value : fallback
  } catch {
    return fallback
  }
}

function writeStored(storage, key, value) {
  try {
    storage().setItem(key, value)
  } catch {
    // Penyimpanan diblokir: pilihan tetap berlaku selama halaman terbuka.
  }
}

const normalize = (text) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('en')
    .trim()

function KindTabs({ kinds, current, obtainedOf, onChange }) {
  const { t, kind: kindText } = useI18n()
  return (
    <fieldset className="checklist-kinds">
      <legend className="visually-hidden">{t('checklist.categories')}</legend>
      <div className="checklist-kinds__row">
        {kinds.map((kind) => {
          const Icon = kind.icon
          const text = kindText(kind.slug)
          const count = obtainedOf(kind)
          const total = kind.entries.length
          return (
            <label key={kind.slug} className="checklist-kind" data-wildlife={kind.slug}>
              <input type="radio" name="checklist-kind" value={kind.slug} checked={kind.slug === current} onChange={() => onChange(kind.slug)} />
              <span className="checklist-kind__icon" aria-hidden="true">
                <Icon />
              </span>
              <span className="checklist-kind__text">
                <span className="checklist-kind__name">{kind.name}</span>
                <span className="checklist-kind__count" aria-hidden="true">
                  <strong>{count}</strong>/{total}
                </span>
                <span className="visually-hidden">{t('checklist.progress', { count, total, noun: text.noun, unit: text.unit })}</span>
              </span>
              <span className="checklist-kind__bar" aria-hidden="true">
                <span style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

function Segmented({ legend, name, options, value, onChange }) {
  return (
    <fieldset className="segmented">
      <legend className="visually-hidden">{legend}</legend>
      {options.map((option) => (
        <label key={option.id} className="segmented__option" data-value={option.id}>
          <input type="radio" name={name} value={option.id} checked={option.id === value} onChange={() => onChange(option.id)} />
          <span>
            {option.label}
            {option.count != null && <span className="segmented__count">{option.count}</span>}
          </span>
        </label>
      ))}
    </fieldset>
  )
}

/**
 * Halaman Checklist (/checklist): pelacak koleksi yang berdiri sendiri (halaman daftar & detail lain tidak diubah).
 * - Tab kategori (Fish, Bugs, Birds, Recipes, Achievements) sekaligus ringkasan progres "x/total".
 * - Daftar: baris ringkas dengan satu ketukan untuk menandai sudah didapat; filter Belum didapat (bawaan) / Sudah
 *   didapat / Semua dan pencarian nama. Baris yang keluar dari filter karena baru ditandai memunculkan notifikasi dengan
 *   tombol Batalkan.
 * - Target Sekarang (Fish, Bugs, Birds): lihat CatchNowView.
 * - Reset per kategori (dengan konfirmasi), Cadangkan & Pulihkan (BackupPanel).
 * Progres disimpan di localStorage lewat checklistStore.js dan tidak dikirim ke mana pun.
 */
function ChecklistPage() {
  const { t, kind: kindText } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()
  const progress = useChecklistState()
  const kind = getChecklistKind(searchParams.get(PARAMS.kind)) ?? getChecklistKind(DEFAULT_CHECKLIST_KIND)
  const view = kind.catchNow && searchParams.get(PARAMS.view) === VIEWS.now ? VIEWS.now : VIEWS.list
  const status = STATUSES.some((item) => item.id === searchParams.get(PARAMS.status)) ? searchParams.get(PARAMS.status) : DEFAULT_STATUS
  const urlQuery = (searchParams.get(PARAMS.query) ?? '').trim()
  const [query, setQuery] = useState(urlQuery)
  const [serverId, setServerId] = useState(() => readStored(() => localStorage, SERVER_KEY, (id) => SERVERS.some((server) => server.id === id), DEFAULT_SERVER))
  const [weather, setWeather] = useState(() => readStored(() => sessionStorage, WEATHER_KEY, (id) => WEATHERS.some((item) => item.id === id), DEFAULT_WEATHER))
  const [activeEvents, setActiveEvents] = useState(readStoredEvents)
  const [toast, setToast] = useState(null)
  const [resetOpen, setResetOpen] = useState(false)
  const toastTimer = useRef(0)
  const listRef = useRef(null)
  const searchId = useId()
  const text = kindText(kind.slug)
  const { noun, unit } = text

  const obtainedSets = useMemo(
    () => Object.fromEntries(CHECKLIST_KINDS.map((item) => [item.slug, new Set(progress.obtained[item.slug] ?? [])])),
    [progress.obtained],
  )
  const obtained = obtainedSets[kind.slug]
  const obtainedCount = (item) => item.entries.filter((entry) => obtainedSets[item.slug].has(entry.slug)).length
  const doneCount = obtainedCount(kind)
  const level = Math.min(progress.levels[kind.slug] ?? kind.maxLevel ?? 1, kind.maxLevel ?? Infinity)

  // Kolom pencarian → URL (debounce); perubahan URL dari luar (tombol kembali, tautan) → kolom. `lastSent` = kata kunci
  // terakhir yang sudah (atau sedang) dikirim ke URL. Pembandingnya bukan URL, karena pembaruan URL dari react-router
  // berjalan sebagai transition dan bisa tiba belakangan: membandingkan dengan URL lama membuat timer mengirim ulang
  // kata kunci lama dan menimpa perubahan lain (mis. ganti kategori).
  const lastSent = useRef(urlQuery)
  useEffect(() => {
    if (urlQuery !== lastSent.current) {
      lastSent.current = urlQuery
      setQuery(urlQuery)
    }
  }, [urlQuery])
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed === lastSent.current) return undefined
    const timer = setTimeout(() => {
      lastSent.current = trimmed
      setSearchParams((prev) => withParam(prev, PARAMS.query, trimmed), URL_UPDATE)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query, setSearchParams])

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  const results = useMemo(() => {
    const needle = normalize(urlQuery)
    return kind.entries.filter((entry) => {
      const has = obtained.has(entry.slug)
      if (status === 'belum' && has) return false
      if (status === 'sudah' && !has) return false
      return !needle || normalize(entry.name).includes(needle)
    })
  }, [kind, obtained, status, urlQuery])
  const sections = useMemo(() => groupBySection(results), [results])
  const multiSection = useMemo(() => new Set(kind.entries.map((entry) => entry.section)).size > 1, [kind])
  // Event yang punya entri di kategori ini, terbaru dulu (urutan section).
  const eventOptions = useMemo(
    () => EVENTS.filter((event) => kind.entries.some((entry) => entry.section === event.name)).sort((a, b) => compareSections(a.name, b.name)),
    [kind],
  )

  const showToast = (next) => {
    window.clearTimeout(toastTimer.current)
    setToast(next)
    toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS)
  }

  /**
   * Tandai / batalkan. Kalau barisnya jadi tidak cocok dengan tampilan (mis. ditandai di filter Belum didapat), baris itu
   * hilang: muncul notifikasi dengan tombol Batalkan, dan fokus keyboard pindah ke kotak centang baris berikutnya.
   */
  const toggle = (entry, checked) => {
    const leaves = view === VIEWS.now ? checked : status !== 'semua'
    let nextFocus = null
    if (leaves && document.activeElement?.classList.contains('check-row__input')) {
      const row = document.activeElement.closest('.check-row')
      const rows = [...(row?.closest('.checklist-body')?.querySelectorAll('.check-row') ?? [])].filter((item) => item.dataset.slug !== entry.slug)
      const index = [...(row?.closest('.checklist-body')?.querySelectorAll('.check-row') ?? [])].indexOf(row)
      nextFocus = rows[Math.min(index, rows.length - 1)]?.dataset.slug ?? null
    }
    setObtained(kind.slug, entry.slug, checked)
    if (leaves) {
      showToast({ kind: kind.slug, slug: entry.slug, name: entry.name, checked })
      if (nextFocus) {
        requestAnimationFrame(() => listRef.current?.querySelector(`.check-row[data-slug="${CSS.escape(nextFocus)}"] .check-row__input`)?.focus({ preventScroll: true }))
      }
    }
  }

  const undo = () => {
    if (!toast?.slug) return
    setObtained(toast.kind, toast.slug, !toast.checked)
    window.clearTimeout(toastTimer.current)
    setToast(null)
  }

  const changeKind = (slug) => {
    lastSent.current = ''
    setQuery('')
    setSearchParams((prev) => {
      let next = withParam(prev, PARAMS.kind, slug === DEFAULT_CHECKLIST_KIND ? '' : slug)
      next = withParam(next, PARAMS.query, '')
      if (!getChecklistKind(slug).catchNow) next = withParam(next, PARAMS.view, '')
      return next
    }, URL_UPDATE)
  }
  const changeView = (id) => setSearchParams((prev) => withParam(prev, PARAMS.view, id === VIEWS.list ? '' : id), URL_UPDATE)
  const changeStatus = (id) => setSearchParams((prev) => withParam(prev, PARAMS.status, id === DEFAULT_STATUS ? '' : id), URL_UPDATE)
  const changeServer = (id) => {
    setServerId(id)
    writeStored(() => localStorage, SERVER_KEY, id)
  }
  const changeWeather = (id) => {
    setWeather(id)
    writeStored(() => sessionStorage, WEATHER_KEY, id)
  }
  const changeEvents = (names) => {
    setActiveEvents(names)
    writeStored(() => localStorage, EVENTS_KEY, JSON.stringify(names))
  }
  const confirmReset = () => {
    resetKind(kind.slug)
    setResetOpen(false)
    showToast({ kind: kind.slug, text: t('checklist.resetDone', { name: kind.name }) })
  }

  const statusCounts = { belum: kind.entries.length - doneCount, sudah: doneCount, semua: kind.entries.length }
  const emptyText = urlQuery
    ? t('checklist.emptySearch', { noun, unit, query: urlQuery })
    : t(status === 'sudah' ? 'checklist.emptyDone' : 'checklist.emptyTodo', { noun, unit })

  return (
    <div className="container page checklist-page">
      <Breadcrumbs items={[{ label: t('common.home'), to: '/' }, { label: t('checklist.title') }]} />
      <CategoryHeader icon={ListChecks} eyebrow={t('checklist.eyebrow')} title={t('checklist.title')} description={t('checklist.intro')} />

      <KindTabs kinds={CHECKLIST_KINDS} current={kind.slug} obtainedOf={obtainedCount} onChange={changeKind} />

      <section className="checklist-panel checklist-main" data-wildlife={kind.slug} aria-labelledby="checklist-kind-title">
        <header className="checklist-main__head">
          <h2 id="checklist-kind-title" className="checklist-main__title">
            {kind.name}
            {text.label !== kind.name && <span className="checklist-main__label">{text.label}</span>}
          </h2>
          <p className="checklist-main__progress">
            <span className="checklist-main__bar" aria-hidden="true">
              <span style={{ width: `${(doneCount / kind.entries.length) * 100}%` }} />
            </span>
            {t('checklist.progress', { count: doneCount, total: kind.entries.length, noun, unit })}
          </p>
          {kind.catchNow && (
            <Segmented
              legend={t('checklist.view')}
              name="checklist-view"
              value={view}
              onChange={changeView}
              options={[
                { id: VIEWS.list, label: t('checklist.viewList') },
                { id: VIEWS.now, label: t('checklist.viewNow') },
              ]}
            />
          )}
        </header>

        <div className="checklist-body" ref={listRef}>
          {view === VIEWS.now ? (
            <CatchNowView
              kind={kind}
              obtained={obtained}
              level={level}
              onLevelChange={(value) => setLevel(kind.slug, value)}
              serverId={serverId}
              onServerChange={changeServer}
              weather={weather}
              onWeatherChange={changeWeather}
              events={activeEvents}
              eventOptions={eventOptions}
              onEventsChange={changeEvents}
              onToggle={toggle}
            />
          ) : (
            <>
              <div className="checklist-tools">
                <Segmented
                  legend={t('checklist.status')}
                  name="checklist-status"
                  value={status}
                  onChange={changeStatus}
                  options={STATUSES.map((item) => ({ id: item.id, label: t(item.labelKey), count: statusCounts[item.id] }))}
                />
                <div className="list-search checklist-search">
                  <Search aria-hidden="true" />
                  <label htmlFor={searchId} className="visually-hidden">
                    {t('checklist.searchLabel', { noun, unit })}
                  </label>
                  <input
                    id={searchId}
                    type="search"
                    value={query}
                    placeholder={t('checklist.searchLabel', { noun, unit })}
                    autoComplete="off"
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
              </div>
              <p className="checklist-status" role="status">
                {t('checklist.showing', { shown: results.length, total: kind.entries.length, noun, unit })}
              </p>
              {results.length > 0 ? (
                sections.map((section) => {
                  const sectionTotal = kind.entries.filter((entry) => entry.section === section.name)
                  const sectionDone = sectionTotal.filter((entry) => obtained.has(entry.slug)).length
                  return (
                    <section key={section.name} className="checklist-section" aria-label={multiSection ? section.name : undefined}>
                      {multiSection && (
                        <h3 className="checklist-section__head">
                          <span aria-hidden="true">{section.emoji}</span>
                          {section.name}
                          <span className="checklist-section__count">{t('checklist.sectionProgress', { count: sectionDone, total: sectionTotal.length })}</span>
                        </h3>
                      )}
                      <ul className="check-list">
                        {section.entries.map((entry) => (
                          <ChecklistRow key={entry.slug} kind={kind} entry={entry} obtained={obtained.has(entry.slug)} onToggle={toggle} />
                        ))}
                      </ul>
                    </section>
                  )
                })
              ) : (
                <p className="checklist-empty">{emptyText}</p>
              )}
            </>
          )}
        </div>

        <footer className="checklist-main__foot">
          <button type="button" className="btn btn--ghost checklist-reset" disabled={doneCount === 0} onClick={() => setResetOpen(true)}>
            <RotateCcw aria-hidden="true" />
            {t('checklist.reset', { name: kind.name })}
          </button>
        </footer>
      </section>

      <BackupPanel />

      <ConfirmDialog
        open={resetOpen}
        title={t('checklist.resetTitle', { name: kind.name })}
        confirmLabel={t('checklist.resetConfirm')}
        onConfirm={confirmReset}
        onCancel={() => setResetOpen(false)}
      >
        <p>{t('checklist.resetText', { count: doneCount, noun, unit, name: kind.name })}</p>
      </ConfirmDialog>

      {/* Notifikasi di bawah layar (mudah dijangkau ibu jari): baris yang baru ditandai & hasil reset. */}
      <div className="checklist-toast-region" role="status" aria-live="polite">
        {toast && (
          <div className="checklist-toast">
            <span className="checklist-toast__text">
              {toast.text ?? t(toast.checked ? 'checklist.markedDone' : 'checklist.markedTodo', { name: toast.name })}
            </span>
            {toast.slug && (
              <button type="button" className="checklist-toast__undo" onClick={undo}>
                <Undo2 aria-hidden="true" />
                {t('checklist.undo')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function withParam(params, key, value) {
  const next = new URLSearchParams(params)
  if (value) next.set(key, value)
  else next.delete(key)
  return next
}

export default ChecklistPage
