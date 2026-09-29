import { Moon, Sun, Sunrise, Sunset } from 'lucide-react'
import { SERVERS, formatClock, formatUtcOffset, getPeriod, getServerTime } from '../data/gameTime'
import { useNow } from '../hooks/useNow'
import './ServerTime.css'

// Ikon lucide per periode; dipakai di badge supaya tampilannya sama di semua sistem (bukan emoji).
export const PERIOD_ICONS = { Dawn: Sunrise, Day: Sun, Dusk: Sunset, Night: Moon }

// Jam live untuk semua server Heartopia beserta periode waktunya: baris-baris yang ukurannya menyesuaikan lebar wadah
// (container query), dipakai di halaman detail wildlife. Beranda memakai pita siklus hari (DayCycle).
function ServerTime() {
  const now = useNow()
  const servers = SERVERS.map((server) => {
    const { hours, minutes } = getServerTime(now, server.utcOffset)
    const period = getPeriod(hours)
    return { server, period, clock: formatClock(hours, minutes), PeriodIcon: PERIOD_ICONS[period.id] }
  })

  return (
    <div className="server-time">
      <ul className="server-time__list">
        {servers.map(({ server, period, clock, PeriodIcon }) => (
          <li key={server.id} className="server-row">
            <div className="server-row__name">
              <span className="server-row__server">{server.name}</span>
              <span className="server-row__offset">{formatUtcOffset(server.utcOffset)}</span>
            </div>
            <time className="server-row__clock" dateTime={clock}>
              {clock}
            </time>
            <span className="server-row__period" data-period={period.id}>
              <PeriodIcon aria-hidden="true" />
              {period.id}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ServerTime
