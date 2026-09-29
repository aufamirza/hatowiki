import { useLayoutEffect, useRef, useState } from 'react'
import { PERIODS, SERVERS, formatClock, formatUtcOffset, getPeriod, getServerTime } from '../data/gameTime'
import { useNow } from '../hooks/useNow'
import { spreadLabels } from './dayCycleLayout'
import { PERIOD_ICONS } from './ServerTime'
import './DayCycle.css'

// Periode diurutkan dari tengah malam, sesuai posisinya di pita (00 → 24).
const BAND_PERIODS = [...PERIODS].sort((a, b) => a.startHour - b.startHour)
const BOUNDARY_HOURS = [0, 6, 12, 18, 24]
// Wadah lebih sempit dari ini (ponsel): pita dibuat vertikal, label di sampingnya.
const VERTICAL_BELOW = 560
// Jarak antarlabel yang berdekatan, dan panjang garis penghubung label → penanda.
const LABEL_GAP = 8
const LEADER = 28

const sameLayout = (a, b) =>
  a && a.vertical === b.vertical && Math.abs(a.length - b.length) < 0.5 && a.centers.every((c, i) => Math.abs(c - b.centers[i]) < 0.5)

/**
 * Jam semua server Heartopia sebagai pita siklus hari 24 jam (beranda). Pita dibagi empat periode (Night, Dawn, Day,
 * Dusk) sesuai getPeriod; tiap server punya penanda di posisi jamnya sekarang dengan label nama & jam. Label yang
 * berdekatan (SEA, TW HK MO, Asia hanya selisih satu jam) disebar tanpa saling menutupi dan dihubungkan ke penandanya
 * dengan garis. Di wadah sempit pita menjadi vertikal. Gambar pita disembunyikan dari pembaca layar; gantinya daftar
 * teks berisi server, jam, dan periode.
 */
function DayCycle() {
  const now = useNow()
  const rootRef = useRef(null)
  const bandRef = useRef(null)
  const labelRefs = useRef([])
  const [vertical, setVertical] = useState(false)
  const [layout, setLayout] = useState(null)

  const servers = SERVERS.map((server) => {
    const { hours, minutes } = getServerTime(now, server.utcOffset)
    const period = getPeriod(hours)
    return {
      server,
      period,
      clock: formatClock(hours, minutes),
      fraction: (hours * 60 + minutes) / 1440,
      PeriodIcon: PERIOD_ICONS[period.id],
    }
  })

  // Ukur panjang pita & ukuran label, lalu sebar label. Diulang saat jam berganti, wadah berubah ukuran, atau label
  // berubah ukuran (mis. font selesai dimuat).
  useLayoutEffect(() => {
    const measure = () => {
      const root = rootRef.current
      const band = bandRef.current
      if (!root || !band) return
      const nextVertical = root.clientWidth < VERTICAL_BELOW
      if (nextVertical !== vertical) {
        setVertical(nextVertical)
        return
      }
      const rect = band.getBoundingClientRect()
      const length = vertical ? rect.height : rect.width
      const items = servers.map(({ fraction }, index) => {
        const label = labelRefs.current[index]
        return { target: fraction * length, size: vertical ? label.offsetHeight : label.offsetWidth }
      })
      const next = { vertical, length, targets: items.map((item) => item.target), centers: spreadLabels(items, length, LABEL_GAP) }
      setLayout((previous) => (sameLayout(previous, next) ? previous : next))
    }
    measure()
    let frame = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    })
    observer.observe(rootRef.current)
    labelRefs.current.forEach((label) => observer.observe(label))
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
    // `servers` dihitung ulang dari `now`, jadi cukup bergantung pada `now`.
  }, [now, vertical])

  const placed = layout && layout.vertical === vertical ? layout : null

  return (
    <div ref={rootRef} className={`day-cycle${vertical ? ' day-cycle--vertical' : ''}`}>
      <div className="day-cycle__figure" aria-hidden="true">
        <div className="day-cycle__labels">
          {servers.map(({ server, period, clock, fraction, PeriodIcon }, index) => (
            <span
              key={server.id}
              ref={(node) => {
                labelRefs.current[index] = node
              }}
              className="day-cycle__label"
              data-server={server.id}
              data-period={period.id}
              style={{ '--at': placed ? `${placed.centers[index]}px` : `${fraction * 100}%` }}
            >
              <span className="day-cycle__server">
                <PeriodIcon />
                {server.name}
              </span>
              <span className="day-cycle__clock">{clock}</span>
            </span>
          ))}
        </div>

        <svg
          className="day-cycle__leaders"
          viewBox={placed ? (vertical ? `0 0 ${LEADER} ${placed.length}` : `0 0 ${placed.length} ${LEADER}`) : undefined}
          preserveAspectRatio="none"
        >
          {placed?.centers.map((center, index) => {
            const target = placed.targets[index]
            const mid = LEADER / 2
            const d = vertical
              ? `M ${LEADER} ${center} C ${mid} ${center}, ${mid} ${target}, 0 ${target}`
              : `M ${center} 0 C ${center} ${mid}, ${target} ${mid}, ${target} ${LEADER}`
            return <path key={servers[index].server.id} d={d} />
          })}
        </svg>

        <div ref={bandRef} className="day-cycle__band">
          <div className="day-cycle__track">
            {BAND_PERIODS.map((period) => (
              <span key={period.id} className="day-cycle__period" data-period={period.id} />
            ))}
          </div>
          {servers.map(({ server, fraction }) => (
            <span key={server.id} className="day-cycle__marker" data-server={server.id} style={{ '--pos': fraction }} />
          ))}
        </div>

        <div className="day-cycle__scale">
          {BAND_PERIODS.map((period) => {
            const Icon = PERIOD_ICONS[period.id]
            return (
              <span
                key={period.id}
                className="day-cycle__name"
                data-period={period.id}
                style={{ '--pos': (period.startHour + period.endHour) / 48 }}
              >
                <Icon />
                {period.id}
              </span>
            )
          })}
          {BOUNDARY_HOURS.map((hour) => (
            <span
              key={hour}
              className={`day-cycle__hour${hour === 0 ? ' day-cycle__hour--start' : hour === 24 ? ' day-cycle__hour--end' : ''}`}
              style={{ '--pos': hour / 24 }}
            >
              {String(hour).padStart(2, '0')}
            </span>
          ))}
        </div>
      </div>

      <ul className="day-cycle__list visually-hidden">
        {servers.map(({ server, period, clock }) => (
          <li key={server.id}>
            {server.name} ({formatUtcOffset(server.utcOffset)}): <time dateTime={clock}>{clock}</time>, periode {period.id}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default DayCycle
