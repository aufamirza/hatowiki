import { Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { categoryToneStyle } from '../../components/catalog/categoryTone'

/**
 * Kotak identitas halaman detail tanaman & collectible: nama, kategori (warna dari token --category-*), deskripsi.
 * Emoji kategori di halaman detail bisa diganti per katalog (`kind.detailCategoryEmoji`, mis. Common tanaman = 🏷️)
 * tanpa mengubah kategorinya.
 */
export function IdentityPanel({ kind, entry }) {
  const emoji = kind.detailCategoryEmoji[entry.category] ?? kind.entryCategories[entry.category]?.emoji
  return (
    <section className="panel panel--info" aria-labelledby="entry-name">
      <p className="eyebrow">{kind.name}</p>
      <h1 id="entry-name" className="entry-detail__name">
        {entry.name}
      </h1>
      {entry.category && (
        <p className="category-tag" style={categoryToneStyle(entry.category)}>
          <span className="visually-hidden">Kategori: </span>
          {emoji && <span aria-hidden="true">{emoji}</span>}
          {entry.category}
        </p>
      )}
      {entry.description ? (
        <p className="entry-detail__description">{entry.description}</p>
      ) : (
        <p className="entry-detail__description is-missing">Deskripsi belum tersedia.</p>
      )}
    </section>
  )
}

/** Tombol kembali ke daftar (dengan pencarian/filter yang sama) dan kredit sumber. */
export function DetailFooter({ kind, entry, listHref }) {
  return (
    <footer className="entry-detail__footer">
      <Link to={listHref} className="btn btn--ghost">
        <ArrowLeft aria-hidden="true" />
        {`Kembali ke daftar ${kind.name}`}
      </Link>
      <p className="source-credit">
        Sumber data:{' '}
        <a href={entry.source} target="_blank" rel="noopener noreferrer">
          Heartodex — {entry.name}
          <ExternalLink aria-hidden="true" />
          <span className="visually-hidden"> (membuka tab baru)</span>
        </a>
      </p>
    </footer>
  )
}
