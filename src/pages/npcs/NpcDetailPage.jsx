import { useLocation, useParams } from 'react-router-dom'
import { ChevronRight, Gift, MapPin, ShoppingBag } from 'lucide-react'
import Breadcrumbs from '../../components/Breadcrumbs'
import PanelTitle from '../../components/PanelTitle'
import { categoryToneStyle } from '../../components/catalog/categoryTone'
import LinkTileList from '../../components/items/LinkTileList'
import { itemHref } from '../../components/items/itemHref'
import { formatCoins } from '../../components/recipes/starValues'
import EntryImage from '../../components/wildlife/EntryImage'
import LocationMap from '../../components/wildlife/LocationMap'
import { getItem } from '../../data/items'
import { GIFT_LINKS } from '../../data/npcs/giftLinks'
import { getNpcBySlug } from '../../data/npcs/npcs'
import { useI18n } from '../../i18n/I18nProvider'
import { Link } from '../../i18n/LocaleLink'
import NotFoundPage from '../NotFoundPage'
import { DetailFooter } from '../goods/GoodsDetailParts'
import { NPC_KIND } from './npcKind'
import '../wildlife/WildlifeDetailPage.css'
import '../goods/goodsTints.css'
import '../goods/GoodsDetailPage.css'
import './NpcDetailPage.css'

/**
 * Halaman detail satu NPC, empat kotak: (1) gambar, nama, kategori, peran, deskripsi; (2) lokasi dan peta dengan pin
 * posisi NPC (kalau tidak ada, zona lokasi); (3) hadiah favorit (jenis yang jelas sama dengan satu halaman daftar
 * Hatowiki ditautkan, lihat src/data/npcs/giftLinks.js); (4) barang yang dijual beserta harganya, tertaut ke halaman
 * benda itu (barang yang belum punya halaman tampil tanpa tautan).
 */
function NpcDetailPage() {
  const { slug } = useParams()
  const location = useLocation()
  const npc = getNpcBySlug(slug)
  const i18n = useI18n()
  const { t, formatNumber, gift: giftLabel } = i18n
  const text = i18n.kind('npcs')
  const listHref = `/npcs${location.state?.listSearch ?? ''}`

  if (!npc) {
    return (
      <NotFoundPage
        title={text.notFoundTitle}
        message={text.notFoundMessage}
        backTo="/npcs"
        backLabel={t('detail.seeList', { name: NPC_KIND.name })}
      />
    )
  }

  const description = i18n.description(NPC_KIND.slug, npc)
  const emoji = NPC_KIND.entryCategories[npc.category]?.emoji
  const shop = npc.shop.map((offer, index) => {
    const item = offer.item ? getItem(offer.item) : null
    const href = item ? itemHref(item) : null
    const price = offer.price != null ? `${formatCoins(offer.price, formatNumber)} ${t('common.coins')}` : t('npc.priceMissing')
    return {
      key: `${offer.item ?? offer.name}#${index}`,
      href,
      image: item?.image ?? null,
      imageSize: item?.imageSize,
      name: item?.name ?? offer.name,
      meta: href ? price : `${price} · ${t('npc.notLinked')}`,
    }
  })

  return (
    <div className="container page entry-detail" data-wildlife="npcs">
      <Breadcrumbs
        items={[
          { label: t('common.home'), to: '/' },
          { label: NPC_KIND.name, to: listHref },
          { label: npc.name },
        ]}
      />

      <div className="entry-detail__grid entry-detail__grid--npc">
        {/* Kotak 1 — identitas & gambar. Teks lebih dulu di DOM supaya nama terbaca paling awal. */}
        <section className="panel panel--ident" aria-labelledby="entry-name">
          <div className="ident-layout">
            <div className="ident-layout__text">
              <p className="eyebrow">{NPC_KIND.name}</p>
              <h1 id="entry-name" className="entry-detail__name">
                {npc.name}
              </h1>
              {npc.role && (
                <p className="npc-role">
                  <span className="visually-hidden">{t('npc.role')}: </span>
                  {npc.role}
                </p>
              )}
              {npc.category && (
                <p className="category-tag" style={categoryToneStyle(npc.category)}>
                  <span className="visually-hidden">{t('common.categoryPrefix')}</span>
                  {emoji && <span aria-hidden="true">{emoji}</span>}
                  {npc.category}
                </p>
              )}
              {description ? (
                <p className="entry-detail__description">{description}</p>
              ) : (
                <p className="entry-detail__description is-missing">{t('detail.noDescription')}</p>
              )}
            </div>
            <div className="entry-stage">
              <EntryImage src={npc.image} alt={npc.name} className="entry-stage__image" loading="eager" size={npc.imageSize} />
            </div>
          </div>
        </section>

        {/* Kotak 2 — lokasi: nama lokasi dan pin posisi NPC (atau zona lokasinya) di peta */}
        <section className="panel panel--location" aria-labelledby="entry-location">
          <div className="location-layout">
            <div className="location-info">
              <PanelTitle icon={MapPin} id="entry-location">
                {t('common.location')}
              </PanelTitle>
              {npc.locations.length > 1 ? (
                <ul className="location-info__list">
                  {npc.locations.map((item) => (
                    <li key={item.name}>{item.name}</li>
                  ))}
                </ul>
              ) : (
                <p className="location-info__name">{npc.locations[0]?.name ?? '—'}</p>
              )}
            </div>
            <LocationMap
              locations={npc.locations}
              image={npc.locationImage}
              spot={npc.mapPin}
              spotLabel={t('npc.pin', { name: npc.name })}
            />
          </div>
        </section>

        {/* Kotak 3 — hadiah favorit */}
        <section className="panel panel--gifts" aria-labelledby="entry-gifts">
          <PanelTitle icon={Gift} id="entry-gifts">
            {t('npc.gifts')}
          </PanelTitle>
          {npc.favoriteGifts.length ? (
            <ul className="gift-list">
              {npc.favoriteGifts.map((gift) => (
                <li key={gift}>
                  {GIFT_LINKS[gift] ? (
                    <Link to={GIFT_LINKS[gift]} className="gift-chip gift-chip--link">
                      {giftLabel(gift)}
                      <ChevronRight aria-hidden="true" />
                    </Link>
                  ) : (
                    <span className="gift-chip">{giftLabel(gift)}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="entry-detail__description is-missing">{t('npc.noGifts')}</p>
          )}
        </section>

        {/* Kotak 4 — barang yang dijual beserta harganya */}
        <section className="panel panel--shop" aria-labelledby="entry-shop">
          <PanelTitle icon={ShoppingBag} id="entry-shop">
            {t('npc.shop')}
            {shop.length > 0 && <span className="panel__hint">{t('npc.shopCount', { count: shop.length })}</span>}
          </PanelTitle>
          {shop.length ? (
            <LinkTileList label={t('npc.shopLabel', { name: npc.name })} entries={shop} />
          ) : (
            <p className="entry-detail__description is-missing">{t('npc.noShop', { name: npc.name })}</p>
          )}
        </section>
      </div>

      <DetailFooter kind={NPC_KIND} entry={npc} listHref={listHref} />
    </div>
  )
}

export default NpcDetailPage
