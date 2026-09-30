import DayCycle from '../components/DayCycle'
import { useI18n } from '../i18n/I18nProvider'
import CategorySection from './home/CategorySection'
import HomeHero from './home/HomeHero'
import NowAppearing from './home/NowAppearing'
import './HomePage.css'

// Beranda: hero, waktu server (pita siklus hari), kartu kategori, dan Muncul Sekarang.
function HomePage() {
  const { t } = useI18n()

  return (
    <div className="home">
      <HomeHero />

      <section className="home-section home-time" id="waktu-server" aria-labelledby="time-title">
        <div className="container">
          <header className="section-head">
            <p className="eyebrow">{t('home.timeEyebrow')}</p>
            <h2 id="time-title">{t('home.timeTitle')}</h2>
            <p>{t('home.timeIntro')}</p>
          </header>
          <DayCycle />
        </div>
      </section>

      <CategorySection />
      <NowAppearing />
    </div>
  )
}

export default HomePage
