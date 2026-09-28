import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Leaf } from 'lucide-react'
import { WILDLIFE_CATALOGS } from '../../components/layout/catalogs'

/**
 * Hiasan hero: ikan, serangga, dan burung dari data (gambar yang sudah ada di public/images), masing-masing
 * dengan posisi & animasi sendiri di HomePage.css. Entri yang tidak ditemukan dilewati.
 */
const CREATURES = [
  { kind: 'birds', slug: 'european-robin', position: 'robin' },
  { kind: 'birds', slug: 'seagull', position: 'gull' },
  { kind: 'bugs', slug: 'blue-morpho', position: 'morpho' },
  { kind: 'bugs', slug: 'orange-tip', position: 'orange-tip' },
  { kind: 'fish', slug: 'clownfish', position: 'clownfish' },
  { kind: 'fish', slug: 'puffer-fish', position: 'puffer' },
]
  .map((creature) => {
    const entry = WILDLIFE_CATALOGS.find((catalog) => catalog.slug === creature.kind)?.entries.find((item) => item.slug === creature.slug)
    return entry && { ...creature, image: entry.image, size: entry.imageSize ?? [400, 400] }
  })
  .filter(Boolean)

// Ombak berulang (lebar 2 × 1440, periode membagi 1440) supaya bisa digeser terus tanpa sambungan terlihat.
function wavePath(y, amplitude, period, closed = true) {
  let d = `M0 ${y}`
  for (let x = 0; x < 2880; x += period) d += ` q ${period / 4} ${-amplitude} ${period / 2} 0 t ${period / 2} 0`
  return closed ? `${d} L2880 240 L0 240 Z` : d
}

const BACK_WAVE = wavePath(188, 6, 240)
const FRONT_WAVE = wavePath(200, 7, 360)
const FRONT_FOAM = wavePath(200, 7, 360, false)

// Pemandangan ilustratif (langit, matahari/bulan, awan, bukit, laut), dekoratif: disembunyikan dari pembaca layar.
function HeroScene() {
  return (
    <div className="hero-scene" aria-hidden="true">
      <span className="hero-scene__stars" />
      <span className="hero-scene__sun" />
      <svg className="hero-cloud hero-cloud--one" viewBox="0 0 100 44" width="100" height="44">
        <path d="M16 42C6 42 1 34 6 27c-4-9 6-17 15-13C23 5 35 0 45 5c6-6 20-5 24 5 9-4 20 1 20 11 8 1 12 8 9 14-1 5-5 7-10 7Z" />
      </svg>
      <svg className="hero-cloud hero-cloud--two" viewBox="0 0 100 44" width="100" height="44">
        <path d="M16 42C6 42 1 34 6 27c-4-9 6-17 15-13C23 5 35 0 45 5c6-6 20-5 24 5 9-4 20 1 20 11 8 1 12 8 9 14-1 5-5 7-10 7Z" />
      </svg>

      <svg className="hero-land" viewBox="0 0 1440 240" preserveAspectRatio="xMidYMax slice">
        <path
          className="hero-land__hill-far"
          d="M0 120C160 70 330 62 480 104c130 36 220 46 340 14 140-38 280-62 430-30 90 18 150 24 190 18V240H0Z"
        />
        <g className="hero-land__trees">
          <ellipse cx="300" cy="80" rx="15" ry="19" />
          <ellipse cx="326" cy="86" rx="11" ry="14" />
          <ellipse cx="1128" cy="70" rx="14" ry="18" />
          <ellipse cx="1152" cy="76" rx="10" ry="13" />
        </g>
        <path
          className="hero-land__hill-near"
          d="M0 168c140-36 300-40 440-12 120 24 220 30 340 8 120-22 230-28 350-6 120 22 230 18 310 2V240H0Z"
        />
        <g className="hero-land__wave hero-land__wave--back">
          <path d={BACK_WAVE} />
        </g>
        <g className="hero-land__wave hero-land__wave--front">
          <path d={FRONT_WAVE} />
          <path className="hero-land__foam" d={FRONT_FOAM} />
        </g>
        <path className="hero-land__shore" d="M0 226c240-12 480 6 720-2s480-10 720 2V240H0Z" />
      </svg>

      {CREATURES.map((creature) => (
        <span key={creature.slug} className={`hero-creature hero-creature--${creature.position}`}>
          <img
            src={creature.image}
            alt=""
            width={creature.size[0]}
            height={creature.size[1]}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            draggable="false"
          />
        </span>
      ))}
    </div>
  )
}

/**
 * Hero beranda. Animasi hanya transform (murah untuk GPU), dijeda saat hero tidak terlihat di layar, dan
 * dimatikan kalau pengguna memilih prefers-reduced-motion (lihat HomePage.css).
 */
function HomeHero() {
  const heroRef = useRef(null)

  useEffect(() => {
    const hero = heroRef.current
    if (!hero || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(([entry]) => {
      hero.toggleAttribute('data-paused', !entry.isIntersecting)
    })
    observer.observe(hero)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="hero" ref={heroRef} aria-labelledby="hero-title">
      <HeroScene />
      <div className="container hero__content">
        <p className="hero__badge">
          <Leaf aria-hidden="true" />
          Proyek komunitas, tidak resmi
        </p>
        <h1 id="hero-title">Wiki Komunitas Heartopia</h1>
        <p className="hero__lead">
          Data ikan, serangga, burung, hewan, dan resep Heartopia dalam bahasa Indonesia: jadwal muncul, cuaca, lokasi,
          bahan, dan harga jual.
        </p>
        <div className="hero__actions">
          <Link to="/wildlife" className="btn btn--primary">
            Jelajahi Wildlife
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link to="/recipes" className="btn btn--ghost">
            Lihat Resep
          </Link>
        </div>
      </div>
    </section>
  )
}

export default HomeHero
