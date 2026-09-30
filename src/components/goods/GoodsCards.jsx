import { Coins, Hourglass, MapPin, Store } from 'lucide-react'
import { useI18n } from '../../i18n/I18nProvider'
import { COLLECTIBLE_KIND, CROP_KIND, INGREDIENT_KIND, formatGrowthTime } from '../../pages/goods/goodsKinds'
import CatalogCard from '../catalog/CatalogCard'
import { formatCoins } from '../recipes/starValues'

// Angka tunggal: null tampil "—", atau "Belum pasti" kalau field itu desimal di sumber (`uncertain`).
function amount(entry, key, { t, formatNumber }) {
  const value = entry[key]
  const text = value != null ? formatCoins(value, formatNumber) : entry.uncertain?.includes(key) ? t('common.uncertain') : '—'
  return { short: text, full: text }
}

/** Kartu tanaman di halaman daftar: gambar, badge kategori & level, waktu tumbuh, dan harga benih. */
export function CropCard({ crop, linkState }) {
  const i18n = useI18n()
  const { t } = i18n
  const growth = formatGrowthTime(crop.growthTime, i18n)
  const facts = [
    { key: 'growth', label: t('card.growthTime'), Icon: Hourglass, short: growth, full: growth },
    { key: 'seed', label: t('card.seedPrice'), Icon: Coins, ...amount(crop, 'seedPrice', i18n) },
  ]
  return (
    <CatalogCard
      to={CROP_KIND.href(crop)}
      linkState={linkState}
      image={crop.image}
      imageSize={crop.imageSize}
      name={crop.name}
      category={crop.category}
      categoryEmoji={CROP_KIND.entryCategories[crop.category]?.emoji}
      level={crop.level}
      facts={facts}
    />
  )
}

/**
 * Kartu collectible di halaman daftar: gambar, badge kategori (tanpa level), lokasi (lokasi pertama +N), dan nilai
 * jual.
 */
export function CollectibleCard({ item, linkState }) {
  const i18n = useI18n()
  const { t } = i18n
  const locations = (item.locations ?? []).map((location) => location.name)
  const facts = [
    {
      key: 'location',
      label: t('common.location'),
      Icon: MapPin,
      short: locations[0] ?? '—',
      more: Math.max(locations.length - 1, 0),
      full: locations.join(', ') || '—',
    },
    { key: 'price', label: t('card.sellValue'), Icon: Coins, ...amount(item, 'sellValue', i18n) },
  ]
  return (
    <CatalogCard
      to={COLLECTIBLE_KIND.href(item)}
      linkState={linkState}
      image={item.image}
      imageSize={item.imageSize}
      name={item.name}
      category={item.category}
      categoryEmoji={COLLECTIBLE_KIND.entryCategories[item.category]?.emoji}
      facts={facts}
    />
  )
}

/**
 * Kartu bahan masak di halaman daftar: gambar, badge kategori (tanpa level), harga beli, dan tempat membelinya (hanya
 * toko/NPC; syarat waktunya ada di atribut title dan halaman detail).
 */
export function IngredientCard({ item, linkState }) {
  const i18n = useI18n()
  const { t, dataText } = i18n
  const obtained = item.obtainedFrom
  const facts = [
    { key: 'buy', label: t('card.buyPrice'), Icon: Coins, ...amount(item, 'buyPrice', i18n) },
    {
      key: 'obtained',
      label: t('card.obtainedFrom'),
      Icon: Store,
      short: obtained ? dataText(obtained.place) : '—',
      full: obtained ? [dataText(obtained.place), dataText(obtained.when)].filter(Boolean).join(', ') : '—',
    },
  ]
  return (
    <CatalogCard
      to={INGREDIENT_KIND.href(item)}
      linkState={linkState}
      image={item.image}
      imageSize={item.imageSize}
      name={item.name}
      category={item.category}
      categoryEmoji={INGREDIENT_KIND.entryCategories[item.category]?.emoji}
      facts={facts}
    />
  )
}
