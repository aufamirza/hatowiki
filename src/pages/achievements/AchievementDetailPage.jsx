import { useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Award, Eye, EyeOff, LockKeyhole, Target, Trophy } from 'lucide-react'
import Breadcrumbs from '../../components/Breadcrumbs'
import { categoryToneStyle } from '../../components/catalog/categoryTone'
import EntryImage from '../../components/wildlife/EntryImage'
import InHeartopia from '../../components/InHeartopia'
import { getAchievementBySlug } from '../../data/achievements/achievements'
import { useI18n } from '../../i18n/I18nProvider'
import NotFoundPage from '../NotFoundPage'
import { DetailFooter } from '../goods/GoodsDetailParts'
import { ACHIEVEMENT_KIND } from './achievementKind'
import '../wildlife/WildlifeDetailPage.css'
import '../goods/goodsTints.css'
import '../goods/GoodsDetailPage.css'
import './AchievementDetailPage.css'

/**
 * Tujuan achievement tersembunyi: tampil buram dan baru terlihat setelah diklik (anti-spoiler). Selama buram, teksnya
 * juga disembunyikan dari pembaca layar; tombolnya yang dibacakan.
 */
function SpoilerObjective({ text }) {
  const { t } = useI18n()
  const [shown, setShown] = useState(false)
  return (
    <div className="spoiler" data-revealed={shown}>
      <div className="spoiler__body">
        <p className="entry-detail__description spoiler__text" aria-hidden={!shown}>
          {text}
        </p>
        {!shown && (
          <button type="button" className="spoiler__cover" onClick={() => setShown(true)}>
            <span className="spoiler__pill">
              <Eye aria-hidden="true" />
              {t('achievement.reveal')}
            </span>
          </button>
        )}
      </div>
      {shown && (
        <button type="button" className="text-button spoiler__hide" onClick={() => setShown(false)}>
          <EyeOff aria-hidden="true" />
          {t('achievement.hide')}
        </button>
      )}
    </div>
  )
}

/**
 * Halaman detail satu achievement: (1) nama, kategori hobi, dan tujuan (Objective); tujuan achievement tersembunyi tampil
 * buram sampai diklik; (2) gambar dengan hadiahnya (title dan kategori hadiah). Bagian "Pro Tips" di Heartodex sengaja
 * tidak diambil.
 */
function AchievementDetailPage() {
  const { slug } = useParams()
  const location = useLocation()
  const entry = getAchievementBySlug(slug)
  const i18n = useI18n()
  const { t } = i18n
  const text = i18n.kind('achievements')
  const listHref = `/achievements${location.state?.listSearch ?? ''}`

  if (!entry) {
    return (
      <NotFoundPage
        title={text.notFoundTitle}
        message={text.notFoundMessage}
        backTo="/achievements"
        backLabel={t('detail.seeList', { name: ACHIEVEMENT_KIND.name })}
      />
    )
  }

  const objective = i18n.description(ACHIEVEMENT_KIND.slug, entry)
  const emoji = ACHIEVEMENT_KIND.entryCategories[entry.category]?.emoji
  const rewardTitle = entry.rewardTitle ?? (entry.hidden ? t('achievement.titleHidden') : '—')

  return (
    <div className="container page entry-detail" data-wildlife="achievements">
      <Breadcrumbs
        items={[
          { label: t('common.home'), to: '/' },
          { label: ACHIEVEMENT_KIND.name, to: listHref },
          { label: entry.name },
        ]}
      />

      <div className="entry-detail__grid entry-detail__grid--goods entry-detail__grid--pair">
        {/* Kotak 1 — identitas & tujuan. Pertama di DOM supaya nama terbaca paling awal. */}
        <section className="panel panel--info" aria-labelledby="entry-name">
          <p className="eyebrow">{ACHIEVEMENT_KIND.name}</p>
          <h1 id="entry-name" className="entry-detail__name">
            {entry.name}
          </h1>
          <InHeartopia kindSlug={ACHIEVEMENT_KIND.slug} />
          <div className="achievement-tags">
            {entry.category && (
              <p className="category-tag" style={categoryToneStyle(entry.category)}>
                <span className="visually-hidden">{t('common.categoryPrefix')}</span>
                {emoji && <span aria-hidden="true">{emoji}</span>}
                {entry.category}
              </p>
            )}
            {entry.hidden && (
              <p className="achievement-hidden">
                <LockKeyhole aria-hidden="true" />
                {t('achievement.hidden')}
              </p>
            )}
          </div>
          <h2 className="achievement-objective__title">
            <Target aria-hidden="true" />
            {t('achievement.objective')}
          </h2>
          {!objective ? (
            <p className="entry-detail__description is-missing">{t('detail.noDescription')}</p>
          ) : entry.hidden ? (
            <>
              <SpoilerObjective text={objective} />
              <p className="achievement-hidden__note">{t('achievement.hiddenNote')}</p>
            </>
          ) : (
            <p className="entry-detail__description">{objective}</p>
          )}
        </section>

        {/* Kotak 2 — gambar | hadiah */}
        <section className="panel panel--hero" aria-label={t('achievement.hero', { name: entry.name })}>
          <div className="hero-layout hero-layout--split">
            <div className="entry-stage">
              <EntryImage src={entry.image} alt={entry.name} className="entry-stage__image" loading="eager" size={entry.imageSize} />
            </div>
            <dl className="spec-list goods-specs goods-specs--hero">
              <div className="spec spec--wide">
                <dt className="spec__label">
                  <Award aria-hidden="true" />
                  {t('achievement.rewardTitle')}
                </dt>
                <dd className={`spec__value spec__value--text${entry.rewardTitle ? '' : ' is-missing'}`}>{rewardTitle}</dd>
              </div>
              <div className="spec spec--wide">
                <dt className="spec__label">
                  <Trophy aria-hidden="true" />
                  {t('achievement.rewardCategory')}
                </dt>
                <dd className={`spec__value spec__value--text${entry.rewardCategory ? '' : ' is-missing'}`}>{entry.rewardCategory ?? '—'}</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      <DetailFooter kind={ACHIEVEMENT_KIND} entry={entry} listHref={listHref} />
    </div>
  )
}

export default AchievementDetailPage
