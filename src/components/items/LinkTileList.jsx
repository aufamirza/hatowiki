import { ChevronRight, Package } from 'lucide-react'
import { Link } from '../../i18n/LocaleLink'
import './ItemList.css'

/**
 * Daftar tautan berbentuk kotak benda (tampilan sama dengan ItemList): gambar, nama, dan satu baris keterangan.
 * Dipakai kotak "Dipakai di resep", "Makanan favorit hewan", dan "Barang yang dijual" NPC. `entries` = [{ key, href,
 * image, imageSize, name, meta }]. Entri tanpa `href` (benda yang belum punya halaman) tampil sebagai kotak biasa.
 */
function LinkTileList({ entries, label }) {
  return (
    <ul className="item-list" aria-label={label}>
      {entries.map(({ key, href, image, imageSize, name, meta }) => {
        const content = (
          <>
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
            {href && <ChevronRight aria-hidden="true" className="item-tile__go" />}
          </>
        )
        return (
          <li key={key} className="item-tile">
            {href ? (
              <Link to={href} className="item-tile__inner item-tile__inner--link">
                {content}
              </Link>
            ) : (
              <span className="item-tile__inner">{content}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default LinkTileList
