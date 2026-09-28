import { Link } from 'react-router-dom'
import EntryImage from '../wildlife/EntryImage'
import { levelToneStyle } from '../wildlife/levelTone'
import { categoryToneStyle } from './categoryTone'
import './CatalogCard.css'

/**
 * Kartu entri di halaman daftar katalog (ikan, serangga, burung, hewan, resep, tanaman, collectible): gambar, nama, badge
 * kategori & level di pojok kiri atas gambar, lalu beberapa baris info satu-baris dengan ikon. Warna badge kategori
 * dari token --category-<kunci> (categoryTone.js), warna badge level dari token --level-N (levelTone.js).
 * `facts` = [{ key, label, Icon, short, full, more }]: `short` tampil di kartu, `full` di atribut title.
 * `more` > 0 menulis "teks pertama +N" (dipakai lokasi jamak; teks pertama boleh terpotong, "+N" selalu terlihat).
 * `linkState` diteruskan ke halaman detail supaya tombol kembali bisa memulihkan filter daftar.
 */
function CatalogCard({ to, linkState, image, imageSize, name, category, categoryEmoji, level, facts }) {
  return (
    <Link to={to} state={linkState} className="entry-card">
      <span className="entry-card__media">
        <EntryImage src={image} alt="" className="entry-card__image" size={imageSize} />
      </span>
      <span className="entry-card__name">
        <span className="entry-card__name-text">{name}</span>
      </span>
      {/* Tampil di pojok kiri atas gambar, tapi di DOM setelah nama supaya nama terbaca lebih dulu */}
      <span className="entry-card__badges">
        {category && (
          <span className="card-badge card-badge--category" style={categoryToneStyle(category)}>
            <span className="visually-hidden">Kategori: </span>
            {/* Spasi tak terputus: emoji tidak pernah tertinggal sendirian di baris pertama */}
            {categoryEmoji && <span aria-hidden="true">{categoryEmoji}{' '}</span>}
            {category}
          </span>
        )}
        {level != null && (
          <span className="card-badge card-badge--level" style={levelToneStyle(level)}>
            <span aria-hidden="true">Lv. {level}</span>
            <span className="visually-hidden">Level {level}</span>
          </span>
        )}
      </span>
      {/* Baris satu-baris dengan kolom ikon yang sama; teks lengkap ada di title */}
      <ul className="entry-card__facts">
        {facts.map(({ key, label, Icon, short, full, more = 0 }) => (
          <li key={key} title={`${label}: ${full}`}>
            <Icon aria-hidden="true" className="entry-card__fact-icon" />
            {more > 0 ? (
              // Nama pertama boleh terpotong elipsis, "+N" selalu terlihat.
              <span className="entry-card__fact-text entry-card__fact-text--split">
                <span className="visually-hidden">{label}: </span>
                <span className="entry-card__fact-first">{short}</span>
                <span className="entry-card__fact-more">
                  <span aria-hidden="true">+{more}</span>
                  <span className="visually-hidden"> dan {more} lokasi lain</span>
                </span>
              </span>
            ) : (
              <span className="entry-card__fact-text">
                <span className="visually-hidden">{label}: </span>
                {short}
              </span>
            )}
          </li>
        ))}
      </ul>
    </Link>
  )
}

export default CatalogCard
