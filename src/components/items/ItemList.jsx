import { ChevronRight, Fish, Package } from 'lucide-react'
import { getItem } from '../../data/items'
import { useI18n } from '../../i18n/I18nProvider'
import { Link } from '../../i18n/LocaleLink'
import { itemHref } from './itemHref'
import './ItemList.css'

// Ikon pengganti untuk benda generik tanpa gambar (mis. "Any Fish"), per jenis.
const TYPE_ICONS = { Fish }

/**
 * Daftar benda (bahan resep, makanan favorit hewan) dari src/data/items.js: gambar, nama, dan opsional jenis
 * (`showType`) serta jumlah (`quantity`, mis. "x2"). Benda yang punya halaman di Hatowiki ditautkan.
 * `entries` = [{ id, quantity? }].
 */
function ItemList({ entries, showType = false }) {
  return (
    <ul className="item-list">
      {/* Kunci memakai posisi juga: sumber kadang mencantumkan bahan yang sama dua kali (mis. Raspberry Frosted Pancake). */}
      {entries.map(({ id, quantity }, index) => (
        <ItemTile key={`${id}#${index}`} id={id} quantity={quantity} showType={showType} />
      ))}
    </ul>
  )
}

function ItemTile({ id, quantity, showType }) {
  const { t } = useI18n()
  const item = getItem(id) ?? { id, name: id, type: null, image: null }
  const href = itemHref(item)
  const Icon = TYPE_ICONS[item.type] ?? Package
  const content = (
    <>
      <span className="item-tile__media">
        {item.image ? (
          <img
            src={item.image}
            alt=""
            width={item.imageSize?.[0] ?? 400}
            height={item.imageSize?.[1] ?? 400}
            loading="lazy"
            decoding="async"
            className="item-tile__image"
          />
        ) : (
          <Icon aria-hidden="true" className="item-tile__placeholder" />
        )}
        {/* Jumlah di pojok gambar (seperti ikon bahan di game), supaya nama bahan dapat ruang penuh */}
        {quantity != null && (
          <span className="item-tile__qty" aria-hidden="true">
            x{quantity}
          </span>
        )}
      </span>
      <span className="item-tile__text">
        <span className="item-tile__name">{item.name}</span>
        {quantity != null && <span className="visually-hidden">{t('detail.quantityHidden', { quantity })}</span>}
        {showType && item.type && <span className="item-tile__type">{item.type}</span>}
      </span>
      {href && <ChevronRight aria-hidden="true" className="item-tile__go" />}
    </>
  )

  return (
    <li className="item-tile">
      {href ? (
        <Link to={href} className="item-tile__inner item-tile__inner--link">
          {content}
        </Link>
      ) : (
        <span className="item-tile__inner">{content}</span>
      )}
    </li>
  )
}

export default ItemList
