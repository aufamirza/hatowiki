import { Coins, Hourglass, MapPin } from 'lucide-react'
import { COLLECTIBLE_KIND, CROP_KIND, INGREDIENT_KIND, formatGrowthTime } from '../../pages/goods/goodsKinds'
import CatalogCard from '../catalog/CatalogCard'
import { formatCoins } from '../recipes/starValues'

// Angka tunggal: null tampil "—", atau "Belum pasti" kalau field itu desimal di sumber (`uncertain`).
function amount(entry, key) {
  const value = entry[key]
  const text = value != null ? formatCoins(value) : entry.uncertain?.includes(key) ? 'Belum pasti' : '—'
  return { short: text, full: text }
}

/** Kartu tanaman di halaman daftar: gambar, badge kategori & level, waktu tumbuh, dan harga benih. */
export function CropCard({ crop, linkState }) {
  const growth = formatGrowthTime(crop.growthTime)
  const facts = [
    { key: 'growth', label: 'Waktu tumbuh', Icon: Hourglass, short: growth, full: growth },
    { key: 'seed', label: 'Harga benih', Icon: Coins, ...amount(crop, 'seedPrice') },
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
  const locations = (item.locations ?? []).map((location) => location.name)
  const facts = [
    {
      key: 'location',
      label: 'Lokasi',
      Icon: MapPin,
      short: locations[0] ?? '—',
      more: Math.max(locations.length - 1, 0),
      full: locations.join(', ') || '—',
    },
    { key: 'price', label: 'Nilai jual', Icon: Coins, ...amount(item, 'sellValue') },
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

/** Kartu bahan masak di halaman daftar: gambar, badge kategori (tanpa level), dan harga beli. */
export function IngredientCard({ item, linkState }) {
  const facts = [{ key: 'buy', label: 'Harga beli', Icon: Coins, ...amount(item, 'buyPrice') }]
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
