import { ArrowLeft, ExternalLink } from 'lucide-react'
import { categoryToneStyle } from '../../components/catalog/categoryTone'
import { useI18n } from '../../i18n/I18nProvider'
import { Link } from '../../i18n/LocaleLink'

/**
 * Kotak identitas halaman detail tanaman & collectible: nama, kategori (warna dari token --category-*), deskripsi.
 * Emoji kategori di halaman detail bisa diganti per katalog (`kind.detailCategoryEmoji`, mis. Common tanaman = 🏷️)
 * tanpa mengubah kategorinya.
 */
export function IdentityPanel({ kind, entry }) {
  const i18n = useI18n()
  const { t } = i18n
  const description = i18n.description(kind.slug, entry)
  const emoji = kind.detailCategoryEmoji[entry.category] ?? kind.entryCategories[entry.category]?.emoji
  return (
    <section className="panel panel--info" aria-labelledby="entry-name">
      <p className="eyebrow">{kind.name}</p>
      <h1 id="entry-name" className="entry-detail__name">
        {entry.name}
      </h1>
      {entry.category && (
        <p className="category-tag" style={categoryToneStyle(entry.category)}>
          <span className="visually-hidden">{t('common.categoryPrefix')}</span>
          {emoji && <span aria-hidden="true">{emoji}</span>}
          {entry.category}
        </p>
      )}
      {description ? (
        <p className="entry-detail__description">{description}</p>
      ) : (
        <p className="entry-detail__description is-missing">{t('detail.noDescription')}</p>
      )}
    </section>
  )
}

/** Tombol kembali ke daftar (dengan pencarian/filter yang sama) dan kredit sumber. */
export function DetailFooter({ kind, entry, listHref }) {
  const { t } = useI18n()
  return (
    <footer className="entry-detail__footer">
      <Link to={listHref} className="btn btn--ghost">
        <ArrowLeft aria-hidden="true" />
        {t('detail.back', { name: kind.name })}
      </Link>
      <p className="source-credit">
        {t('detail.source')}{' '}
        <a href={entry.source} target="_blank" rel="noopener noreferrer">
          {t('detail.sourceLink', { name: entry.name })}
          <ExternalLink aria-hidden="true" />
          <span className="visually-hidden">{t('common.newTab')}</span>
        </a>
      </p>
    </footer>
  )
}
