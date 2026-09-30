import { BadgeInfo, MapPin } from 'lucide-react'
import CatalogCard from '../../components/catalog/CatalogCard'
import { useI18n } from '../../i18n/I18nProvider'
import { NPC_KIND } from './npcKind'

/** Kartu NPC di halaman daftar: gambar, badge kategori, peran, dan lokasi. */
function NpcCard({ entry, linkState }) {
  const { t } = useI18n()
  const locations = entry.locations.map((location) => location.name)
  const role = entry.role ?? '—'
  const facts = [
    { key: 'role', label: t('card.role'), Icon: BadgeInfo, short: role, full: role },
    {
      key: 'location',
      label: t('common.location'),
      Icon: MapPin,
      short: locations[0] ?? '—',
      more: Math.max(locations.length - 1, 0),
      full: locations.join(', ') || '—',
    },
  ]
  return (
    <CatalogCard
      to={NPC_KIND.href(entry)}
      linkState={linkState}
      image={entry.image}
      imageSize={entry.imageSize}
      name={entry.name}
      category={entry.category}
      categoryEmoji={NPC_KIND.entryCategories[entry.category]?.emoji}
      facts={facts}
    />
  )
}

export default NpcCard
