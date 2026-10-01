import { useId, useMemo, useState } from 'react'
import { Clock, Info, KeyRound, MapPin, Minus, Plus } from 'lucide-react'
import { PERIOD_ICONS } from '../../components/ServerTime'
import { SERVERS, formatClock, formatPeriodRange, formatUtcOffset, getPeriod, getServerTime } from '../../data/gameTime'
import { itemHref } from '../../components/items/itemHref'
import { getItem } from '../../data/items'
import { WEATHERS } from '../../data/wildlife/attributes'
import { useNow } from '../../hooks/useNow'
import { useI18n } from '../../i18n/I18nProvider'
import { Link } from '../../i18n/LocaleLink'
import { buildCatchNow, nextPeriodOf } from './catchNow'
import ChecklistRow from './ChecklistRow'

function formatDuration(totalMinutes, t) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (!hours) return t('home.minutes', { minutes })
  return minutes ? t('home.hoursMinutes', { hours, minutes }) : t('home.hours', { hours })
}

// Pilihan berbentuk chip: radio asli (fokus & panah kiri/kanan dari browser), tampilannya diganti.
function ChipRadios({ legend, name, options, value, onChange, hint }) {
  const hintId = useId()
  return (
    <fieldset className="chip-radios" aria-describedby={hint ? hintId : undefined}>
      <legend className="chip-radios__legend">{legend}</legend>
      <div className="chip-radios__options">
        {options.map((option) => (
          <label key={option.id} className="chip-radios__option" data-value={option.id}>
            <input type="radio" name={name} value={option.id} checked={option.id === value} onChange={() => onChange(option.id)} />
            <span>
              {option.emoji && <span aria-hidden="true">{option.emoji}</span>}
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {hint && (
        <p id={hintId} className="chip-radios__hint">
          {hint}
        </p>
      )}
    </fieldset>
  )
}

// Level hobi: tombol − / + besar (mudah diketuk satu tangan), nilai diumumkan ke pembaca layar.
function LevelStepper({ hobby, level, max, onChange }) {
  const { t } = useI18n()
  const labelId = useId()
  return (
    <div className="level-stepper" role="group" aria-labelledby={labelId}>
      <span id={labelId} className="chip-radios__legend">
        {t('checklist.hobbyLevel', { hobby })}
      </span>
      <div className="level-stepper__control">
        <button type="button" className="level-stepper__button" aria-label={t('checklist.levelDown', { hobby })} disabled={level <= 1} onClick={() => onChange(level - 1)}>
          <Minus aria-hidden="true" />
        </button>
        <output className="level-stepper__value" aria-live="polite">
          {level}
        </output>
        <button type="button" className="level-stepper__button" aria-label={t('checklist.levelUp', { hobby })} disabled={level >= max} onClick={() => onChange(level + 1)}>
          <Plus aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

// Pilihan jamak berbentuk chip (kotak centang asli, tampilannya diganti), mis. event yang sedang berjalan.
function ChipChecks({ legend, options, values, onChange, hint, className = '' }) {
  const hintId = useId()
  const toggle = (id, on) => onChange(on ? [...values, id] : values.filter((value) => value !== id))
  return (
    <fieldset className={`chip-radios ${className}`} aria-describedby={hint ? hintId : undefined}>
      <legend className="chip-radios__legend">{legend}</legend>
      <div className="chip-radios__options">
        {options.map((option) => (
          <label key={option.id} className="chip-radios__option" data-value={option.id}>
            <input type="checkbox" value={option.id} checked={values.includes(option.id)} onChange={(event) => toggle(option.id, event.target.checked)} />
            <span>
              {option.emoji && <span aria-hidden="true">{option.emoji}</span>}
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {hint && (
        <p id={hintId} className="chip-radios__hint">
          {hint}
        </p>
      )}
    </fieldset>
  )
}

// Syarat lokasi khusus: item (tertaut ke halaman item kalau ada) atau aktivitas (lihat specialLocations.js).
function SpecialRequirement({ special }) {
  const { t } = useI18n()
  if (special.type === 'item') {
    const item = getItem(special.item) ?? { id: special.item, name: special.name }
    const href = itemHref(item)
    return t('checklist.specialItem', { item: href ? <Link to={href}>{item.name}</Link> : item.name })
  }
  return t(special.daily ? 'checklist.specialDaily' : 'checklist.specialActivity', { activity: special.activity })
}

function LocationGroups({ kind, groups, obtained, onToggle }) {
  const { t, kind: kindText } = useI18n()
  return (
    <div className="catch-groups">
      {groups.map((group) => {
        const open = group.entries.filter((item) => !item.locked).length
        const Icon = group.special ? KeyRound : MapPin
        return (
          <section key={group.name} className="catch-group" data-location={group.name} data-special={group.special?.type} aria-label={group.name}>
            <h4 className="catch-group__head">
              <Icon aria-hidden="true" />
              <span className="catch-group__name">{group.name}</span>
              <span className="catch-group__count">{t('checklist.locationCount', { count: open, unit: kindText(kind.slug).unit })}</span>
            </h4>
            {group.special && (
              <p className="catch-group__requirement">
                <SpecialRequirement special={group.special} />
              </p>
            )}
            <ul className="check-list check-list--compact">
              {group.entries.map(({ entry, locked }) => (
                <ChecklistRow key={entry.slug} kind={kind} entry={entry} obtained={obtained.has(entry.slug)} locked={locked} showLocation={false} showEvent onToggle={onToggle} />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

// Kelompok lokasi biasa, lalu lokasi khusus (aktivitas atau item khusus) di paling bawah dengan keterangannya.
function CatchGroups({ kind, section, obtained, onToggle }) {
  const { t } = useI18n()
  return (
    <>
      {section.groups.length > 0 && <LocationGroups kind={kind} groups={section.groups} obtained={obtained} onToggle={onToggle} />}
      {section.special.length > 0 && (
        <div className="catch-special">
          <h4 className="catch-special__title">
            <KeyRound aria-hidden="true" />
            {t('checklist.specialTitle')}
          </h4>
          <p className="catch-special__intro">{t('checklist.specialIntro')}</p>
          <LocationGroups kind={kind} groups={section.special} obtained={obtained} onToggle={onToggle} />
        </div>
      )}
    </>
  )
}

/**
 * Target Sekarang (Fish, Bugs, Birds): yang belum didapat dan bisa didapat di periode waktu server saat ini dengan cuaca
 * pilihan pemain, dikelompokkan per lokasi; di bawahnya yang baru muncul di periode berikutnya beserta jam mulainya.
 * Entri dengan syarat level di atas level hobi pemain disembunyikan (bisa ditampilkan redup). Server diingat bersama
 * Muncul Sekarang di beranda, cuaca hanya selama sesi (cuaca di game cepat berganti), level di progres Checklist.
 * Entri event ikut kalau pemain memilih eventnya di "Event yang sedang berjalan" (`events`, diingat di localStorage);
 * pilihannya hanya event yang punya entri di kategori ini (`eventOptions`, dari src/data/events.js).
 */
function CatchNowView({ kind, obtained, level, onLevelChange, serverId, onServerChange, weather, onWeatherChange, events, eventOptions, onEventsChange, onToggle }) {
  const { t, kind: kindText } = useI18n()
  const text = kindText(kind.slug)
  const now = useNow()
  const [showLocked, setShowLocked] = useState(false)
  const server = SERVERS.find((item) => item.id === serverId)
  const { hours, minutes } = getServerTime(now, server.utcOffset)
  const period = getPeriod(hours)
  const next = nextPeriodOf(period)
  const minutesLeft = period.endHour * 60 - (hours * 60 + minutes)
  const clock = formatClock(hours, minutes)
  const formatHour = (hour) => t('common.hour', { hour })
  const PeriodIcon = PERIOD_ICONS[period.id]
  const NextIcon = PERIOD_ICONS[next.id]
  const result = useMemo(
    () => buildCatchNow({ kind, obtained, level, period, weather, showLocked, events }),
    [kind, obtained, level, period, weather, showLocked, events],
  )
  const lockedTotal = result.now.lockedCount + result.next.lockedCount
  const placesOf = (section) => [...section.groups, ...section.special].filter((group) => group.entries.some((item) => !item.locked)).length
  const vars = { noun: text.noun, unit: text.unit, label: text.label, period: period.id, weather }

  return (
    <div className="catch-now" data-period={period.id}>
      <p className="catch-now__intro">{t('checklist.nowIntro', vars)}</p>

      <div className="catch-controls">
        <LevelStepper hobby={kind.hobby} level={level} max={kind.maxLevel} onChange={onLevelChange} />
        <ChipRadios
          legend={t('checklist.server')}
          name={`catch-server-${kind.slug}`}
          options={SERVERS.map((item) => ({ id: item.id, label: item.name }))}
          value={serverId}
          onChange={onServerChange}
        />
        <ChipRadios
          legend={t('checklist.weather')}
          name={`catch-weather-${kind.slug}`}
          options={[...WEATHERS].sort((a, b) => WEATHER_ORDER.indexOf(a.id) - WEATHER_ORDER.indexOf(b.id)).map((item) => ({ id: item.id, label: item.id, emoji: item.emoji }))}
          value={weather}
          onChange={onWeatherChange}
          hint={t('checklist.weatherHint')}
        />
        {eventOptions.length > 0 && (
          <ChipChecks
            className="catch-events"
            legend={t('checklist.events')}
            options={eventOptions.map((event) => ({ id: event.name, label: event.name, emoji: event.emoji }))}
            values={events}
            onChange={onEventsChange}
            hint={t('checklist.eventsHint')}
          />
        )}
      </div>

      <p className="catch-now__clock">
        <span className="period-badge" data-period={period.id}>
          <PeriodIcon aria-hidden="true" />
          {period.id}
        </span>
        <span>
          {t('checklist.clock', {
            server: `${server.name} (${formatUtcOffset(server.utcOffset)})`,
            clock: (
              <time className="catch-now__time" dateTime={clock}>
                {clock}
              </time>
            ),
            period: period.id,
            range: formatPeriodRange(period, formatHour),
          })}
        </span>
      </p>

      {lockedTotal > 0 && (
        <div className="catch-now__locked">
          <Info aria-hidden="true" />
          <p>{t('checklist.locked', { count: lockedTotal, noun: text.noun, unit: text.unit })}</p>
          <label className="catch-now__toggle">
            <input type="checkbox" checked={showLocked} onChange={(event) => setShowLocked(event.target.checked)} />
            {t('checklist.showLocked')}
          </label>
        </div>
      )}

      <section className="catch-section catch-section--now" aria-labelledby={`catch-now-${kind.slug}`}>
        <h3 id={`catch-now-${kind.slug}`} className="catch-section__title">
          {t('checklist.nowTitle')}
          <span className="catch-section__count">
            {t('checklist.nowCount', { count: result.now.count, places: placesOf(result.now), unit: text.unit })}
          </span>
        </h3>
        {result.now.groups.length + result.now.special.length > 0 ? (
          <CatchGroups kind={kind} section={result.now} obtained={obtained} onToggle={onToggle} />
        ) : (
          <p className="catch-section__empty">{t('checklist.nowEmpty', vars)}</p>
        )}
      </section>

      <section className="catch-section catch-section--next" data-period={next.id} aria-labelledby={`catch-next-${kind.slug}`}>
        <h3 id={`catch-next-${kind.slug}`} className="catch-section__title">
          <span className="period-badge" data-period={next.id}>
            <NextIcon aria-hidden="true" />
            {next.id}
          </span>
          {t('checklist.nextTitle', { period: next.id })}
          <span className="catch-section__count">{t('checklist.nextCount', { count: result.next.count, unit: text.unit })}</span>
        </h3>
        <p className="catch-section__when">
          <Clock aria-hidden="true" />
          {t('checklist.nextWhen', { time: formatHour(String(next.startHour).padStart(2, '0')), duration: formatDuration(minutesLeft, t) })}
        </p>
        {result.next.groups.length + result.next.special.length > 0 ? (
          <CatchGroups kind={kind} section={result.next} obtained={obtained} onToggle={onToggle} />
        ) : (
          <p className="catch-section__empty">{t('checklist.nextEmpty', { ...vars, period: next.id })}</p>
        )}
      </section>

      <p className="catch-now__note">{t('checklist.eventsNote')}</p>
    </div>
  )
}

// Urutan pilihan cuaca: Sunny (paling sering) dulu.
const WEATHER_ORDER = ['Sunny', 'Rainy', 'Rainbow']

export default CatchNowView
