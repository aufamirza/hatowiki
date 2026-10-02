import { useI18n } from '../i18n/I18nProvider'

/**
 * Keterangan singkat di bawah nama entri (H1) halaman detail: jenis entrinya di Heartopia dalam bahasa halaman, mis.
 * "Burung di Heartopia" / "A bird in Heartopia" (messages `kinds.<slug>.inHeartopia`). H1 tetap nama entri saja.
 */
function InHeartopia({ kindSlug }) {
  const { kind } = useI18n()
  return <p className="entry-detail__context">{kind(kindSlug).inHeartopia}</p>
}

export default InHeartopia
