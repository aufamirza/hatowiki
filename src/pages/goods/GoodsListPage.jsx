import CatalogListPage from '../catalog/CatalogListPage'
import { CollectibleCard, CropCard } from '../../components/goods/GoodsCards'
import { GOODS_KINDS } from './goodsKinds'
import './goodsTints.css'

/**
 * Halaman daftar Crops (/crops) dan Collectibles (/collectibles). Pencarian, filter, urutan, section, dan statusnya
 * di URL ada di CatalogListPage; isi dan teksnya dari GOODS_KINDS[kindSlug].
 */
function GoodsListPage({ kindSlug }) {
  const kind = GOODS_KINDS[kindSlug]
  return (
    <CatalogListPage
      kind={kind}
      tint={kind.slug}
      breadcrumbs={[{ label: 'Beranda', to: '/' }, { label: kind.name }]}
      eyebrow={`Koleksi · ${kind.hobby}`}
      renderCard={(entry, linkState) =>
        kindSlug === 'crops' ? <CropCard crop={entry} linkState={linkState} /> : <CollectibleCard item={entry} linkState={linkState} />
      }
    />
  )
}

export default GoodsListPage
