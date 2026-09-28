import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { ArrowUpDown, ChevronDown, RotateCcw, Search, SearchX, SlidersHorizontal, X } from 'lucide-react'
import Breadcrumbs from '../../components/Breadcrumbs'
import CategoryHeader from '../../components/CategoryHeader'
import { categoryToneStyle } from '../../components/catalog/categoryTone'
import { usePageTitle } from '../../hooks/usePageTitle'
import FilterDropdown from './FilterDropdown'
import {
  SORT_OPTIONS,
  buildFilterGroups,
  countActiveFilters,
  filterEntries,
  readListState,
  sortEntries,
  withQuery,
  withSort,
  withToggledValue,
  withoutFilters,
} from './listState'
import { groupBySection } from './sections'
import './CatalogListPage.css'

const SEARCH_DEBOUNCE_MS = 200
// Status disimpan di URL tanpa menumpuk riwayat, dan tanpa melompat ke atas halaman.
const URL_UPDATE = { replace: true, preventScrollReset: true }

/**
 * Halaman daftar satu katalog (Fish, Bugs, Birds, Animals, Resep, Crops, Collectibles): pencarian, filter, urutan, dan
 * statusnya di URL. Hasilnya dibagi per section (Base Game, lalu event terbaru → terlama; lihat sections.js): pencarian,
 * filter, dan urutan berlaku di dalam tiap section, section tanpa hasil disembunyikan, dan jumlah hasil dihitung total.
 * `kind` berisi data dan teks: { name, noun, icon, intro, entries, totalInGame, filters, sortOptions?, searchText?,
 * searchLabel?, sortRank? }. `searchLabel` = label kolom pencarian (bawaan "Cari nama <noun>"). `sortRank(entry)` =
 * posisi di Urutan Default kalau bukan urutan data (lihat sortEntries).
 * `tint` = kunci warna (lihat wildlifeTints.css), `breadcrumbs` & `eyebrow` untuk kepala halaman,
 * `renderCard(entry, linkState)` menggambar satu kartu.
 */
function CatalogListPage({ kind, tint, breadcrumbs, eyebrow, renderCard }) {
  const { entries, filters, noun } = kind
  const sortOptions = kind.sortOptions ?? SORT_OPTIONS
  const searchText = kind.searchText
  const searchLabel = kind.searchLabel ?? `Cari nama ${noun}`
  usePageTitle(kind.name)
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const state = useMemo(() => readListState(searchParams, filters, sortOptions), [searchParams, filters, sortOptions])
  const [query, setQuery] = useState(state.query)
  // Filter Lanjutan langsung terbuka kalau halaman dibuka dengan filter aktif (refresh, link dibagikan).
  const [advancedOpen, setAdvancedOpen] = useState(() => countActiveFilters(state, filters) > 0)
  const [openGroupId, setOpenGroupId] = useState(null)
  const searchId = useId()
  const sortId = useId()
  const advancedId = useId()
  const sectionId = useId()

  // Nilai terakhir yang dikirim kolom pencarian ke URL, supaya perubahan itu tidak disalin balik
  // ke kolom (bisa menimpa huruf yang baru saja diketik).
  const lastSentQuery = useRef(state.query)

  // URL → kolom pencarian, hanya untuk perubahan dari luar (hapus chip, reset, navigasi).
  useEffect(() => {
    if (state.query !== lastSentQuery.current) {
      lastSentQuery.current = state.query
      setQuery(state.query)
    }
  }, [state.query])

  // Kolom pencarian → URL, dengan debounce.
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed === state.query) return undefined
    const timer = setTimeout(() => {
      lastSentQuery.current = trimmed
      setSearchParams((prev) => withQuery(prev, trimmed), URL_UPDATE)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query, state.query, setSearchParams])

  const results = useMemo(
    () => sortEntries(filterEntries(entries, state, filters, { searchText }), state.sort, { rank: kind.sortRank }),
    [entries, state, filters, searchText],
  )
  const sections = useMemo(() => groupBySection(results), [results])
  const groups = useMemo(() => buildFilterGroups(entries, state, filters, { searchText }), [entries, state, filters, searchText])
  const activeFilterCount = countActiveFilters(state, filters)
  const hasActive = activeFilterCount > 0 || state.query !== ''

  const activeChips = [
    ...(state.query ? [{ key: 'q', label: `Nama: “${state.query}”`, onRemove: () => setSearchParams((prev) => withQuery(prev, ''), URL_UPDATE) }] : []),
    ...filters.flatMap((def) =>
      state.filters[def.id].map((value) => ({
        key: `${def.id}:${value}`,
        label: def.chipLabel ? def.chipLabel(value) : `${def.label}: ${value}`,
        onRemove: () => setSearchParams((prev) => withToggledValue(prev, def, value), URL_UPDATE),
      })),
    ),
  ]

  const toggleFilter = (def, value) => setSearchParams((prev) => withToggledValue(prev, def, value), URL_UPDATE)
  const resetAll = () => {
    setQuery('')
    setOpenGroupId(null)
    setSearchParams((prev) => withoutFilters(prev, filters), URL_UPDATE)
  }
  const toggleAdvanced = () => {
    setAdvancedOpen((open) => !open)
    setOpenGroupId(null)
  }

  return (
    <div className="container page" data-wildlife={tint}>
      <Breadcrumbs items={breadcrumbs} />

      <CategoryHeader
        icon={kind.icon}
        tint={tint}
        eyebrow={eyebrow}
        title={kind.name}
        description={kind.intro}
      >
        <p className="entry-progress">
          <span className="entry-progress__bar" aria-hidden="true">
            <span style={{ width: `${(entries.length / kind.totalInGame) * 100}%` }} />
          </span>
          {entries.length} dari {kind.totalInGame}
          {` ${noun} sudah didokumentasikan`}
        </p>
      </CategoryHeader>

      {/* Bar kontrol: pencarian, urutan, buka-tutup Filter Lanjutan, reset */}
      <div className="list-toolbar">
        <div className="list-search">
          <Search aria-hidden="true" />
          <label htmlFor={searchId} className="visually-hidden">
            {searchLabel}
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`${searchLabel}…`}
            autoComplete="off"
            spellCheck="false"
          />
        </div>
        <div className="list-sort">
          <label htmlFor={sortId} className="visually-hidden">
            Urutkan
          </label>
          <ArrowUpDown aria-hidden="true" className="list-sort__icon" />
          <select
            id={sortId}
            value={state.sort}
            onChange={(event) => setSearchParams((prev) => withSort(prev, event.target.value), URL_UPDATE)}
          >
            {sortOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" className="list-sort__chevron" />
        </div>
        <button
          type="button"
          className="btn btn--ghost list-filter-toggle"
          aria-expanded={advancedOpen}
          aria-controls={advancedId}
          onClick={toggleAdvanced}
        >
          <SlidersHorizontal aria-hidden="true" />
          Filter
          {activeFilterCount > 0 && (
            <span className="count-badge">
              {activeFilterCount}
              <span className="visually-hidden"> aktif</span>
            </span>
          )}
          <ChevronDown aria-hidden="true" className="list-filter-toggle__chevron" />
        </button>
        <button
          type="button"
          className="icon-button list-reset"
          onClick={resetAll}
          disabled={!hasActive}
          aria-label="Reset pencarian dan filter"
          title="Reset pencarian dan filter"
        >
          <RotateCcw aria-hidden="true" />
        </button>
      </div>

      <section
        id={advancedId}
        className="filter-advanced"
        aria-labelledby={`${advancedId}-title`}
        hidden={!advancedOpen}
      >
        <h2 id={`${advancedId}-title`} className="filter-advanced__title">
          Filter Lanjutan
        </h2>
        <div className="filter-advanced__list">
          {groups.map((group) => (
            <FilterDropdown
              key={group.def.id}
              group={group}
              open={openGroupId === group.def.id}
              onOpenChange={(open) =>
                setOpenGroupId((current) => (open ? group.def.id : current === group.def.id ? null : current))
              }
              onToggle={toggleFilter}
            />
          ))}
        </div>
      </section>

      <section className="list-results" aria-labelledby="list-results-heading">
        <h2 id="list-results-heading" className="visually-hidden">
          {`Daftar ${noun}`}
        </h2>
        <div className="list-status">
          <p className="list-status__count" role="status">
            Menampilkan <strong>{results.length}</strong> dari {entries.length}
            {` ${noun}`}
          </p>
          {hasActive && (
            <div className="active-filters">
              <ul className="active-filters__list" aria-label="Filter aktif">
                {activeChips.map((chip) => (
                  <li key={chip.key}>
                    <button type="button" className="active-chip" onClick={chip.onRemove} aria-label={`Hapus ${chip.label}`}>
                      {chip.label}
                      <X aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="text-button" onClick={resetAll}>
                <RotateCcw aria-hidden="true" />
                Reset semua
              </button>
            </div>
          )}
        </div>

        {results.length > 0 ? (
          <div className="list-sections">
            {sections.map((section, index) => (
              <section key={section.name} className="list-section" aria-labelledby={`${sectionId}-${index}`}>
                {/* Judul section: emoji, nama, dan jumlah hasil. Event memakai warna kategorinya (token --category-*). */}
                <h3 id={`${sectionId}-${index}`} className="list-section__head">
                  <span
                    className={`list-section__name${section.isEvent ? ' list-section__name--event' : ''}`}
                    style={section.isEvent ? categoryToneStyle(section.name) : undefined}
                  >
                    <span aria-hidden="true">{section.emoji}</span>
                    {section.name}
                  </span>
                  <span className="list-section__count">{`${section.entries.length} ${noun}`}</span>
                </h3>
                <ul className="entry-grid">
                  {section.entries.map((item) => (
                    <li key={item.slug}>{renderCard(item, { listSearch: location.search })}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <div className="list-empty">
            <span className="list-empty__icon" aria-hidden="true">
              <SearchX />
            </span>
            <h3>{`Tidak ada ${noun} yang cocok`}</h3>
            <p>Coba kata kunci lain atau kurangi filter yang dipilih.</p>
            <button type="button" className="btn btn--primary" onClick={resetAll}>
              <RotateCcw aria-hidden="true" />
              Reset pencarian &amp; filter
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

export default CatalogListPage
