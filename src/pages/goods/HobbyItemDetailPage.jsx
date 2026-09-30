import { useLocation, useParams } from 'react-router-dom'
import { Coins } from 'lucide-react'
import Breadcrumbs from '../../components/Breadcrumbs'
import { formatCoins } from '../../components/recipes/starValues'
import EntryImage from '../../components/wildlife/EntryImage'
import { getHobbyItemBySlug } from '../../data/hobbyItems/hobbyItems'
import { useI18n } from '../../i18n/I18nProvider'
import NotFoundPage from '../NotFoundPage'
import { DetailFooter, IdentityPanel, SoldBySpec } from './GoodsDetailParts'
import { ITEM_KIND } from './goodsKinds'
import '../wildlife/WildlifeDetailPage.css'
import './goodsTints.css'
import './GoodsDetailPage.css'

/**
 * Halaman detail satu item (benda pakai): (1) nama, kategori hobi, deskripsi (berisi efek/kegunaannya kalau sumber
 * mencantumkannya); (2) gambar dengan harga dan NPC penjualnya (Dijual oleh, dihitung dari data NPC dan tertaut ke
 * halaman NPC). Item tidak punya level, lokasi, maupun resep.
 */
function HobbyItemDetailPage() {
  const { slug } = useParams()
  const location = useLocation()
  const item = getHobbyItemBySlug(slug)
  const i18n = useI18n()
  const { t, formatNumber } = i18n
  const text = i18n.kind('items')
  const listHref = `/items${location.state?.listSearch ?? ''}`

  if (!item) {
    return (
      <NotFoundPage
        title={text.notFoundTitle}
        message={text.notFoundMessage}
        backTo="/items"
        backLabel={t('detail.seeList', { name: ITEM_KIND.name })}
      />
    )
  }

  return (
    <div className="container page entry-detail" data-wildlife="items">
      <Breadcrumbs
        items={[
          { label: t('common.home'), to: '/' },
          { label: ITEM_KIND.name, to: listHref },
          { label: item.name },
        ]}
      />

      <div className="entry-detail__grid entry-detail__grid--goods entry-detail__grid--pair">
        {/* Kotak 1 — identitas. Pertama di DOM supaya nama terbaca paling awal. */}
        <IdentityPanel kind={ITEM_KIND} entry={item} />

        {/* Kotak 2 — gambar | harga & penjual */}
        <section className="panel panel--hero" aria-label={t('item.hero', { name: item.name })}>
          <div className="hero-layout hero-layout--split">
            <div className="entry-stage">
              <EntryImage src={item.image} alt={item.name} className="entry-stage__image" loading="eager" size={item.imageSize} />
            </div>
            <dl className="spec-list goods-specs goods-specs--hero">
              <div className="spec">
                <dt className="spec__label">
                  <Coins aria-hidden="true" />
                  {t('item.price')}
                </dt>
                <dd className={`spec__value${item.price == null ? ' is-missing' : ''}`}>
                  {item.price != null ? formatCoins(item.price, formatNumber) : '—'}
                  {item.price != null && <span className="spec__unit">{t('common.coins')}</span>}
                </dd>
              </div>
              <SoldBySpec itemId={`items/${item.slug}`} showEmpty />
            </dl>
          </div>
        </section>
      </div>

      <DetailFooter kind={ITEM_KIND} entry={item} listHref={listHref} />
    </div>
  )
}

export default HobbyItemDetailPage
