import { Link } from 'react-router-dom'
import { ChevronRight, Package } from 'lucide-react'
import './ItemList.css'

/**
 * Daftar tautan berbentuk kotak benda (tampilan sama dengan ItemList): gambar, nama, dan satu baris keterangan.
 * Dipakai kotak "Dipakai di resep" dan "Makanan favorit hewan". `entries` = [{ key, href, image, imageSize, name,
 * meta }].
 */
function LinkTileList({ entries, label }) {
  return (
    <ul className="item-list" aria-label={label}>
      {entries.map(({ key, href, image, imageSize, name, meta }) => (
        <li key={key} className="item-tile">
          <Link to={href} className="item-tile__inner item-tile__inner--link">
            <span className="item-tile__media">
              {image ? (
                <img
                  src={image}
                  alt=""
                  width={imageSize?.[0] ?? 400}
                  height={imageSize?.[1] ?? 400}
                  loading="lazy"
                  decoding="async"
                  className="item-tile__image"
                />
              ) : (
                <Package aria-hidden="true" className="item-tile__placeholder" />
              )}
            </span>
            <span className="item-tile__text">
              <span className="item-tile__name">{name}</span>
              {meta && <span className="item-tile__type">{meta}</span>}
            </span>
            <ChevronRight aria-hidden="true" className="item-tile__go" />
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default LinkTileList
