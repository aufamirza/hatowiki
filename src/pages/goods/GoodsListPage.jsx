import CatalogListPage from '../catalog/CatalogListPage'
import { CollectibleCard, CropCard, HobbyItemCard, IngredientCard } from '../../components/goods/GoodsCards'
import { useI18n } from '../../i18n/I18nProvider'
import AchievementCard from '../achievements/AchievementCard'
import { ACHIEVEMENT_KIND } from '../achievements/achievementKind'
import NpcCard from '../npcs/NpcCard'
import { NPC_KIND } from '../npcs/npcKind'
import { GOODS_KINDS } from './goodsKinds'
import './goodsTints.css'

// Katalog grup Wiki selain resep yang memakai halaman daftar ini, beserta kartunya.
const LIST_KINDS = { ...GOODS_KINDS, npcs: NPC_KIND, achievements: ACHIEVEMENT_KIND }
const CARDS = {
  crops: (entry, linkState) => <CropCard crop={entry} linkState={linkState} />,
  collectibles: (entry, linkState) => <CollectibleCard item={entry} linkState={linkState} />,
  ingredients: (entry, linkState) => <IngredientCard item={entry} linkState={linkState} />,
  items: (entry, linkState) => <HobbyItemCard item={entry} linkState={linkState} />,
  npcs: (entry, linkState) => <NpcCard entry={entry} linkState={linkState} />,
  achievements: (entry, linkState) => <AchievementCard entry={entry} linkState={linkState} />,
}

/**
 * Halaman daftar Crops (/crops), Collectibles (/collectibles), Ingredients (/ingredients), Items (/items), NPCs (/npcs),
 * dan Achievements (/achievements). Pencarian, filter, urutan, section, dan statusnya di URL ada di CatalogListPage; isi
 * dan teksnya dari konfigurasi katalognya (LIST_KINDS[kindSlug]).
 */
function GoodsListPage({ kindSlug }) {
  const kind = LIST_KINDS[kindSlug]
  const { t, kind: kindText } = useI18n()
  return (
    <CatalogListPage
      kind={kind}
      tint={kind.slug}
      breadcrumbs={[{ label: t('common.home'), to: '/' }, { label: kind.name }]}
      eyebrow={t('list.eyebrowCollection', { hobby: kindText(kind.slug).hobby })}
      renderCard={CARDS[kindSlug]}
    />
  )
}

export default GoodsListPage
