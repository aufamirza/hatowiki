import { Fragment } from 'react'
import { ArrowLeft, ExternalLink, Store } from 'lucide-react'
import { categoryToneStyle } from '../../components/catalog/categoryTone'
import InHeartopia from '../../components/InHeartopia'
import { sellersOf, splitNpcMentions } from '../../data/npcSales'
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
      <InHeartopia kindSlug={kind.slug} />
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

/**
 * Baris "Dijual oleh" di daftar spec halaman detail benda (item, bahan masak, tanaman, collectible): NPC yang menjual
 * benda ini menurut data NPC, masing-masing tertaut ke halaman NPC-nya. Tidak ditampilkan kalau tidak ada penjual,
 * kecuali `showEmpty` (halaman item: tampil "—").
 */
export function SoldBySpec({ itemId, showEmpty = false }) {
  const { t } = useI18n()
  const sellers = sellersOf(itemId)
  if (!sellers.length && !showEmpty) return null
  return (
    <div className="spec spec--wide">
      <dt className="spec__label">
        <Store aria-hidden="true" />
        {t('item.soldBy')}
      </dt>
      <dd className={`spec__value spec__value--text${sellers.length ? '' : ' is-missing'}`}>
        {sellers.length
          ? sellers.map(({ npc }, index) => (
              <Fragment key={npc.slug}>
                {index > 0 && ', '}
                <Link to={`/npcs/${npc.slug}`} className="spec__link">
                  {npc.name}
                </Link>
              </Fragment>
            ))
          : '—'}
      </dd>
    </div>
  )
}

/** Teks dengan nama NPC di dalamnya tertaut ke halaman NPC itu (mis. "Toko Massimo" di "Didapat dari" bahan masak). */
export function NpcMentions({ text }) {
  return splitNpcMentions(text).map((part, index) =>
    typeof part === 'string' ? (
      <Fragment key={index}>{part}</Fragment>
    ) : (
      <Link key={index} to={`/npcs/${part.npc.slug}`} className="spec__link">
        {part.text}
      </Link>
    ),
  )
}
