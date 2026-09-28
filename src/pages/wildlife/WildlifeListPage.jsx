import CatalogListPage from '../catalog/CatalogListPage'
import EntryCard from '../../components/wildlife/EntryCard'
import { WILDLIFE_KINDS } from './wildlifeKinds'
import './wildlifeTints.css'

/**
 * Halaman daftar satu kategori wildlife (Fish, Bugs, Birds, Animals). Pencarian, filter, urutan, dan statusnya
 * di URL ada di CatalogListPage; isi dan teksnya diatur lewat WILDLIFE_KINDS[kindSlug].
 */
function WildlifeListPage({ kindSlug }) {
  const kind = WILDLIFE_KINDS[kindSlug]
  return (
    <CatalogListPage
      kind={kind}
      tint={kind.slug}
      breadcrumbs={[{ label: 'Wildlife', to: '/wildlife' }, { label: kind.name }]}
      eyebrow={`Wildlife · ${kind.hobby}`}
      renderCard={(entry, linkState) => <EntryCard entry={entry} category={kind} linkState={linkState} />}
    />
  )
}

export default WildlifeListPage
