import { useState } from 'react'
import { ArrowRight, CloudSun } from 'lucide-react'
import { WILDLIFE_CATALOGS } from '../../components/layout/catalogs'
import { PERIOD_ICONS } from '../../components/ServerTime'
import EntryImage from '../../components/wildlife/EntryImage'
import { levelToneStyle } from '../../components/wildlife/levelTone'
import { PERIODS, SERVERS, formatClock, formatPeriodRange, formatUtcOffset, getPeriod, getServerTime } from '../../data/gameTime'
import { useNow } from '../../hooks/useNow'
import { useI18n } from '../../i18n/I18nProvider'
import { Link } from '../../i18n/LocaleLink'
import { isBaseGame } from '../catalog/sections'
// Badge level memakai gaya badge kartu di halaman daftar (.card-badge), supaya tampilannya sama.
import '../../components/catalog/CatalogCard.css'

const STORAGE_KEY = 'hdx-server'
// SEA = UTC+7, sama dengan WIB.
const DEFAULT_SERVER = 'sea'
const PREVIEW_COUNT = 6
// Hanya kategori yang punya jadwal muncul (Fish, Bugs, Birds); hewan tidak punya jadwal.
const SCHEDULED_CATALOGS = WILDLIFE_CATALOGS.filter((catalog) => catalog.hasSchedule)

function readStoredServer() {
  try {
    const id = localStorage.getItem(STORAGE_KEY)
    return SERVERS.some((server) => server.id === id) ? id : DEFAULT_SERVER
  } catch {
    return DEFAULT_SERVER
  }
}

/**
 * Entri yang jadwalnya mencakup periode `periodId`. Yang jendela waktunya paling sempit (paling khas periode
 * ini) di depan, lalu level terendah, lalu urutan data.
 */
export function entriesInPeriod(entries, periodId) {
  return entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry.schedule?.includes(periodId))
    .sort(
      (a, b) =>
        a.entry.schedule.length - b.entry.schedule.length ||
        (a.entry.level ?? Infinity) - (b.entry.level ?? Infinity) ||
        a.index - b.index,
    )
    .map(({ entry }) => entry)
}

function formatDuration(totalMinutes, t) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (!hours) return t('home.minutes', { minutes })
  return minutes ? t('home.hoursMinutes', { hours, minutes }) : t('home.hours', { hours })
}

/**
 * Section "Muncul Sekarang" di beranda: ikan, serangga, dan burung yang jadwalnya mencakup periode waktu saat
 * ini di server yang dipilih (bawaan SEA; pilihan disimpan di browser). Cuaca tidak ikut dihitung. Hanya entri section
 * Base Game, supaya entri event yang sudah tidak bisa didapat tidak pernah muncul.
 */
function NowAppearing() {
  const { t, kind } = useI18n()
  const now = useNow()
  const [serverId, setServerId] = useState(readStoredServer)
  const server = SERVERS.find((item) => item.id === serverId)
  const { hours, minutes } = getServerTime(now, server.utcOffset)
  const period = getPeriod(hours)
  const nextPeriod = PERIODS.find((item) => item.startHour === period.endHour % 24)
  const minutesLeft = period.endHour * 60 - (hours * 60 + minutes)
  const clock = formatClock(hours, minutes)
  const PeriodIcon = PERIOD_ICONS[period.id]

  const chooseServer = (id) => {
    setServerId(id)
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      // Penyimpanan diblokir: pilihan tetap berlaku selama halaman terbuka.
    }
  }

  return (
    <section className="home-section now" id="muncul-sekarang" aria-labelledby="now-title">
      <div className="container">
        <header className="section-head">
          <p className="eyebrow">{t('home.nowEyebrow')}</p>
          <h2 id="now-title">{t('home.nowTitle')}</h2>
          <p>{t('home.nowIntro')}</p>
        </header>

        <div className="now-controls">
          <fieldset className="server-picker">
            <legend className="server-picker__legend">{t('home.server')}</legend>
            <div className="server-picker__options">
              {SERVERS.map((item) => (
                <label key={item.id} className="server-picker__option">
                  <input
                    type="radio"
                    name="now-server"
                    value={item.id}
                    checked={item.id === serverId}
                    onChange={() => chooseServer(item.id)}
                  />
                  <span>{item.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <p className="now-status">
            <span className="period-badge now-status__badge" data-period={period.id}>
              <PeriodIcon aria-hidden="true" />
              {period.id}
            </span>
            <span className="now-status__text">
              {t('home.nowStatus', {
                server: server.name,
                utc: formatUtcOffset(server.utcOffset),
                clock: (
                  <time className="now-status__clock" dateTime={clock}>
                    {clock}
                  </time>
                ),
                range: formatPeriodRange(period, (hour) => t('common.hour', { hour })),
                next: nextPeriod.id,
                duration: formatDuration(minutesLeft, t),
              })}
            </span>
          </p>
        </div>

        <p className="now-note">
          <CloudSun aria-hidden="true" />
          <span>{t('home.nowNote')}</span>
        </p>

        <div className="now-groups">
          {SCHEDULED_CATALOGS.map((catalog) => {
            const baseGame = catalog.entries.filter(isBaseGame)
            const list = entriesInPeriod(baseGame, period.id)
            const Icon = catalog.icon
            const titleId = `now-${catalog.slug}`
            const text = kind(catalog.slug)
            return (
              <section key={catalog.slug} className="now-group" data-wildlife={catalog.slug} aria-labelledby={titleId}>
                <div className="now-group__head">
                  <span className="now-group__icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <div className="now-group__heading">
                    <h3 id={titleId} className="now-group__title">
                      {catalog.name}
                      <span className="now-group__label">{text.label}</span>
                    </h3>
                    <p className="now-group__count">
                      {t('home.nowCount', {
                        count: <strong>{list.length}</strong>,
                        total: baseGame.length,
                        noun: text.noun,
                        unit: text.unit,
                        period: period.id,
                      })}
                    </p>
                  </div>
                  <Link to={`${catalog.href()}?waktu=${period.id}`} className="btn btn--ghost now-group__all">
                    {t('common.seeAll')}
                    <span className="visually-hidden">{t('home.nowAllHidden', { noun: text.noun, period: period.id })}</span>
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </div>

                {list.length > 0 ? (
                  <ul className="now-grid">
                    {list.slice(0, PREVIEW_COUNT).map((entry) => (
                      <li key={entry.slug}>
                        {/* Kotak gambar persegi (gambar tinggi/lebar masuk utuh), nama maks. 2 baris dengan teks
                            lengkap di title; badge di pojok atas gambar seperti kartu daftar. */}
                        <Link to={catalog.href(entry)} className="now-tile">
                          <span className="now-tile__stage">
                            <EntryImage src={entry.image} alt="" size={entry.imageSize} className="now-tile__image" />
                          </span>
                          <span className="now-tile__name" title={entry.name}>
                            {entry.name}
                          </span>
                          <span className="now-tile__badges">
                            {entry.level != null && (
                              <span className="card-badge card-badge--level" style={levelToneStyle(entry.level)}>
                                <span aria-hidden="true">{t('common.levelShort', { level: entry.level })}</span>
                                <span className="visually-hidden">{t('common.level', { level: entry.level })}</span>
                              </span>
                            )}
                            {entry.schedule.length === 1 && (
                              <span
                                className="period-badge now-tile__only"
                                data-period={period.id}
                                title={t('home.nowOnly', { period: period.id })}
                              >
                                <PeriodIcon aria-hidden="true" />
                                <span className="visually-hidden">{t('home.nowOnly', { period: period.id })}</span>
                              </span>
                            )}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="now-empty">{t('home.nowEmpty', { noun: text.noun, unit: text.unit, period: period.id })}</p>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default NowAppearing
