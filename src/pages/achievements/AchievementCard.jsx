import { Award, Target } from 'lucide-react'
import CatalogCard from '../../components/catalog/CatalogCard'
import { useI18n } from '../../i18n/I18nProvider'
import { ACHIEVEMENT_KIND } from './achievementKind'

/**
 * Kartu achievement di halaman daftar: gambar, badge kategori hobi, title hadiah, dan tujuan (satu baris; teks lengkap
 * di atribut title). Achievement tersembunyi tidak menampilkan tujuan maupun title-nya di kartu (anti-spoiler).
 */
function AchievementCard({ entry, linkState }) {
  const i18n = useI18n()
  const { t } = i18n
  const objective = entry.hidden ? t('achievement.cardHidden') : i18n.description(ACHIEVEMENT_KIND.slug, entry) ?? '—'
  const reward = entry.rewardTitle ?? (entry.hidden ? t('achievement.titleHidden') : '—')
  const facts = [
    { key: 'reward', label: t('card.reward'), Icon: Award, short: reward, full: reward },
    { key: 'objective', label: t('card.objective'), Icon: Target, short: objective, full: objective },
  ]
  return (
    <CatalogCard
      to={ACHIEVEMENT_KIND.href(entry)}
      linkState={linkState}
      image={entry.image}
      imageSize={entry.imageSize}
      name={entry.name}
      category={entry.category}
      categoryEmoji={ACHIEVEMENT_KIND.entryCategories[entry.category]?.emoji}
      facts={facts}
    />
  )
}

export default AchievementCard
