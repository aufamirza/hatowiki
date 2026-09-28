import { useLocation, useParams } from 'react-router-dom'
import { Coins, Hourglass, Sprout, Ticket } from 'lucide-react'
import Breadcrumbs from '../../components/Breadcrumbs'
import PanelTitle from '../../components/PanelTitle'
import { formatCoins } from '../../components/recipes/starValues'
import EntryImage from '../../components/wildlife/EntryImage'
import MarketValue from '../../components/wildlife/MarketValue'
import { levelToneStyle } from '../../components/wildlife/levelTone'
import { getCropBySlug } from '../../data/crops/crops'
import { usePageTitle } from '../../hooks/usePageTitle'
import NotFoundPage from '../NotFoundPage'
import { DetailFooter, IdentityPanel } from './GoodsDetailParts'
import { AnimalUsagePanel, RecipeUsagePanel, getItemUsage } from './UsagePanels'
import { CROP_KIND, formatGrowthTime } from './goodsKinds'
import '../wildlife/WildlifeDetailPage.css'
import './goodsTints.css'
import './GoodsDetailPage.css'

// Deret "Market Value" ditampilkan sebagai harga jual; deret lain (mis. "Event Tokens") memakai label aslinya.
const MARKET_VALUE = 'Market Value'

/**
 * Halaman detail satu tanaman: (1) nama, kategori, deskripsi; (2) gambar dengan badge level dan tabel nilai jual per
 * kualitas (semua deret dari sumber); (3) info tanam: harga benih & waktu tumbuh; (4) resep yang memakainya dan
 * (5) hewan yang menyukainya, dihitung dari data Hatowiki. Farming Mastery tidak ditampilkan.
 */
function CropDetailPage() {
  const { slug } = useParams()
  const location = useLocation()
  const crop = getCropBySlug(slug)
  const listHref = `/crops${location.state?.listSearch ?? ''}`
  usePageTitle(crop ? crop.name : 'Tanaman tidak ditemukan')

  if (!crop) {
    return (
      <NotFoundPage
        title="Tanaman tidak ditemukan"
        message="Tanaman ini belum ada di database kami, atau alamatnya salah ketik."
        backTo="/crops"
        backLabel={`Lihat daftar ${CROP_KIND.name}`}
      />
    )
  }

  const usage = getItemUsage(`crops/${crop.slug}`)
  const seedPrice = crop.seedPrice != null ? formatCoins(crop.seedPrice) : crop.uncertain?.includes('seedPrice') ? 'Belum pasti' : '—'

  return (
    <div className="container page entry-detail" data-wildlife="crops">
      <Breadcrumbs
        items={[
          { label: 'Beranda', to: '/' },
          { label: CROP_KIND.name, to: listHref },
          { label: crop.name },
        ]}
      />

      <div className={`entry-detail__grid entry-detail__grid--goods${usage.animals.length ? '' : ' entry-detail__grid--no-animals'}`}>
        {/* Kotak 1 — identitas. Pertama di DOM supaya nama terbaca paling awal. */}
        <IdentityPanel kind={CROP_KIND} entry={crop} />

        {/* Kotak 2 — gambar dengan badge level | nilai jual per kualitas (semua deret dari sumber) */}
        <section className="panel panel--hero" aria-label={`Gambar, level, dan nilai jual ${crop.name}`}>
          <div className="hero-layout hero-layout--split">
            <div className="entry-stage">
              <EntryImage src={crop.image} alt={crop.name} className="entry-stage__image" loading="eager" size={crop.imageSize} />
              <p className="stage-level" style={levelToneStyle(crop.level)}>
                <span aria-hidden="true">Lv. {crop.level ?? '—'}</span>
                <span className="visually-hidden">Syarat level {crop.level ?? 'belum diketahui'}</span>
              </p>
            </div>
            <div className="market-stack">
              {crop.starValues.map((row) => {
                const market = row.label === MARKET_VALUE
                return (
                  <div key={row.label} className="market">
                    <h2 className={`market__title${market ? '' : ' market__title--token'}`}>
                      {market ? <Coins aria-hidden="true" /> : <Ticket aria-hidden="true" />}
                      {market ? 'Harga jual' : row.label}
                      <span className="market__hint">per kualitas</span>
                    </h2>
                    <MarketValue
                      values={row.values}
                      uncertain={row.uncertain}
                      unit={market ? 'koin' : row.label}
                      {...(market ? {} : { icon: Ticket, iconClassName: 'market-value__token' })}
                    />
                  </div>
                )
              })}
              {crop.starValues.length === 0 && <p className="entry-detail__description is-missing">Nilai jual belum tercantum di sumber.</p>}
            </div>
          </div>
        </section>

        {/* Kotak 3 — info tanam */}
        <section className="panel panel--aside panel--facts" aria-labelledby="entry-planting">
          <PanelTitle icon={Sprout} id="entry-planting">
            Info tanam
          </PanelTitle>
          <dl className="spec-list goods-specs">
            <div className="spec">
              <dt className="spec__label">
                <Coins aria-hidden="true" />
                Harga benih
              </dt>
              <dd className="spec__value">
                {seedPrice}
                {crop.seedPrice != null && <span className="spec__unit">koin</span>}
              </dd>
            </div>
            <div className="spec">
              <dt className="spec__label">
                <Hourglass aria-hidden="true" />
                Waktu tumbuh
              </dt>
              <dd className="spec__value">{formatGrowthTime(crop.growthTime)}</dd>
            </div>
          </dl>
        </section>

        {/* Kotak 4 & 5 — dihitung dari data resep & hewan Hatowiki */}
        <RecipeUsagePanel usage={usage} name={crop.name} />
        <AnimalUsagePanel usage={usage} name={crop.name} />
      </div>

      <DetailFooter kind={CROP_KIND} entry={crop} listHref={listHref} />
    </div>
  )
}

export default CropDetailPage
