import ServerTime from '../components/ServerTime'
import { usePageTitle } from '../hooks/usePageTitle'
import CategorySection from './home/CategorySection'
import HomeHero from './home/HomeHero'
import NowAppearing from './home/NowAppearing'
import './HomePage.css'

// Beranda: hero, waktu server (versi kotak), kartu kategori, dan Muncul Sekarang.
function HomePage() {
  usePageTitle()

  return (
    <div className="home">
      <HomeHero />

      <section className="home-section home-time" id="waktu-server" aria-labelledby="time-title">
        <div className="container">
          <header className="section-head">
            <p className="eyebrow">Jam live</p>
            <h2 id="time-title">Waktu Server</h2>
            <p>
              Jam dan periode waktu (Dawn, Day, Dusk, Night) di kelima server Heartopia. Jadwal muncul ikan, serangga,
              dan burung mengikuti periode ini.
            </p>
          </header>
          <ServerTime variant="cards" />
        </div>
      </section>

      <CategorySection />
      <NowAppearing />
    </div>
  )
}

export default HomePage
