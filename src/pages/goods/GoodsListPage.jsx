import CatalogListPage from '../catalog/CatalogListPage'
import { CollectibleCard, CropCard, IngredientCard } from '../../components/goods/GoodsCards'
import { useI18n } from '../../i18n/I18nProvider'
import { GOODS_KINDS } from './goodsKinds'
import './goodsTints.css'

/**
 * Halaman daftar Crops (/crops), Collectibles (/collectibles), dan Ingredients (/ingredients). Pencarian, filter, urutan,
 * section, dan statusnya di URL ada di CatalogListPage; isi dan teksnya dari GOODS_KINDS[kindSlug].
 */
function GoodsListPage({ kindSlug }) {
  const kind = GOODS_KINDS[kindSlug]
  const { t, kind: kindText } = useI18n()
  return (
    <CatalogListPage
      kind={kind}
      tint={kind.slug}
      breadcrumbs={[{ label: t('common.home'), to: '/' }, { label: kind.name }]}
      eyebrow={t('list.eyebrowCollection', { hobby: kindText(kind.slug).hobby })}
      renderCard={(entry, linkState) =>
        kindSlug === 'crops' ? (
          <CropCard crop={entry} linkState={linkState} />
        ) : kindSlug === 'ingredients' ? (
          <IngredientCard item={entry} linkState={linkState} />
        ) : (
          <CollectibleCard item={entry} linkState={linkState} />
        )
      }
    />
  )
}

export default GoodsListPage
