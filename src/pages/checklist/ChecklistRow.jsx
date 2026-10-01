import { Check, MapPin } from 'lucide-react'
import { PERIOD_ICONS } from '../../components/ServerTime'
import { categoryToneStyle } from '../../components/catalog/categoryTone'
import EntryImage from '../../components/wildlife/EntryImage'
import { levelToneStyle } from '../../components/wildlife/levelTone'
import { BASE_GAME, getSection } from '../../data/events'
import { PERIODS } from '../../data/gameTime'
import { WEATHERS } from '../../data/wildlife/attributes'
import { getEntryLocations } from '../../data/wildlife/entryLocations'
import { useI18n } from '../../i18n/I18nProvider'
import { Link } from '../../i18n/LocaleLink'

// Nilai yang berlaku dalam urutan kanonik; semuanya berlaku → teks "Semua …" (sama dengan kartu daftar).
function summarize(options, active = [], allText) {
  const values = options.filter((option) => active.includes(option.id)).map((option) => option.id)
  if (!values.length) return '—'
  return values.length === options.length ? allText : values.join(', ')
}

function Fact({ icon: Icon, label, value, title }) {
  const { t } = useI18n()
  return (
    <span className="check-row__fact" title={title ?? t('card.fact', { label, value })}>
      <Icon aria-hidden="true" />
      <span className="visually-hidden">{t('card.fact', { label, value: '' })}</span>
      {value}
    </span>
  )
}

function LevelBadge({ level }) {
  const { t } = useI18n()
  if (level == null) return null
  return (
    <span className="card-badge card-badge--level" style={levelToneStyle(level)}>
      <span aria-hidden="true">{t('common.levelShort', { level })}</span>
      <span className="visually-hidden">{t('common.level', { level })}</span>
    </span>
  )
}

function CategoryBadge({ kind, category }) {
  const { t } = useI18n()
  if (!category) return null
  const emoji = kind.entryCategories?.[category]?.emoji
  return (
    <span className="card-badge card-badge--category" style={categoryToneStyle(category)}>
      <span className="visually-hidden">{t('common.categoryPrefix')}</span>
      {emoji && <span aria-hidden="true">{emoji}{' '}</span>}
      {category}
    </span>
  )
}

/**
 * Waktu muncul & cuaca versi ringkas: ikon periode (warna periode) dan emoji cuaca, supaya baris tetap pendek di ponsel.
 * Teks lengkapnya ("Waktu: Dawn, Day") ada di title dan untuk pembaca layar.
 */
function IconFact({ label, options, active = [], allText, render, periods = false }) {
  const { t } = useI18n()
  const on = options.filter((option) => active.includes(option.id))
  const text = t('card.fact', { label, value: summarize(options, active, allText) })
  return (
    <span className="check-row__fact check-row__fact--icons" title={text}>
      <span className="visually-hidden">{text}</span>
      {on.map((option) => (
        <span key={option.id} aria-hidden="true" data-period={periods ? option.id : undefined}>
          {render(option)}
        </span>
      ))}
    </span>
  )
}

const renderPeriod = (period) => {
  const Icon = PERIOD_ICONS[period.id]
  return <Icon />
}
const renderWeather = (weather) => weather.emoji

// Baris info di bawah nama, menurut jenis kategori (lihat `row` di checklistKinds.js).
// Badge event untuk entri dari section event (Target Sekarang dengan event yang dipilih pemain).
function EventBadge({ section }) {
  const { t } = useI18n()
  if (!section || section === BASE_GAME) return null
  const { emoji } = getSection(section)
  return (
    <span className="card-badge card-badge--category check-row__event" style={categoryToneStyle(section)}>
      <span className="visually-hidden">{t('checklist.eventPrefix')}</span>
      {emoji && <span aria-hidden="true">{emoji}{' '}</span>}
      {section}
    </span>
  )
}

function RowFacts({ kind, entry, showLocation, showEvent }) {
  const { t } = useI18n()
  if (kind.row === 'recipe') {
    return (
      <>
        <LevelBadge level={entry.level} />
        <CategoryBadge kind={kind} category={entry.category} />
      </>
    )
  }
  if (kind.row === 'achievement') {
    return (
      <>
        <CategoryBadge kind={kind} category={entry.category} />
        {entry.rewardTitle && !entry.hidden && <span className="check-row__fact check-row__fact--text">{t('checklist.rewardTitle', { title: entry.rewardTitle })}</span>}
      </>
    )
  }
  const locations = getEntryLocations(kind.wildlife, entry).map((location) => location.name)
  const locationText = locations.length > 1 ? `${locations[0]} +${locations.length - 1}` : (locations[0] ?? '—')
  return (
    <>
      <LevelBadge level={entry.level} />
      {showEvent && <EventBadge section={entry.section} />}
      {showLocation && (
        <Fact icon={MapPin} label={t('common.location')} value={locationText} title={t('card.fact', { label: t('common.location'), value: locations.join(', ') || '—' })} />
      )}
      <IconFact label={t('card.time')} options={PERIODS} active={entry.schedule} allText={t('card.allTimes')} render={renderPeriod} periods />
      <IconFact label={t('filter.weather')} options={WEATHERS} active={entry.weather} allText={t('card.allWeather')} render={renderWeather} />
    </>
  )
}

/**
 * Satu baris checklist: gambar kecil, nama (tautan ke halaman detail), info ringkas, dan kotak centang. Seluruh baris
 * adalah <label> kotak centang, jadi ketuk di mana saja (kecuali nama) menandai sudah didapat atau membatalkannya; ketuk
 * nama membuka halaman detail. `locked` = level pemain belum cukup (Target Sekarang): baris tampil redup dengan syarat
 * levelnya. `showLocation` false di Target Sekarang, karena barisnya sudah dikelompokkan per lokasi; `showEvent` menampilkan
 * badge event untuk entri event (di daftar biasa event sudah terlihat dari judul section).
 */
function ChecklistRow({ kind, entry, obtained, onToggle, locked = false, showLocation = true, showEvent = false }) {
  const { t } = useI18n()
  return (
    <li className="check-row" data-slug={entry.slug} data-obtained={obtained || undefined} data-locked={locked || undefined}>
      <label className="check-row__hit">
        <input
          type="checkbox"
          className="check-row__input"
          checked={obtained}
          onChange={(event) => onToggle(entry, event.target.checked)}
          aria-label={t('checklist.mark', { name: entry.name })}
        />
        <span className="check-row__media">
          <EntryImage src={entry.image} alt="" size={entry.imageSize} className="check-row__image" />
        </span>
        <span className="check-row__body">
          <Link to={kind.href(entry)} className="check-row__name">
            {entry.name}
          </Link>
          <span className="check-row__facts">
            {locked && (
              <span className="check-row__locked">{t('checklist.lockedBadge', { level: t('common.levelShort', { level: entry.level }) })}</span>
            )}
            <RowFacts kind={kind} entry={entry} showLocation={showLocation} showEvent={showEvent} />
          </span>
        </span>
        <span className="check-row__box" aria-hidden="true">
          <Check />
        </span>
      </label>
    </li>
  )
}

export default ChecklistRow
