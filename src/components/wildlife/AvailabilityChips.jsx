import { useI18n } from '../../i18n/I18nProvider'
import './AvailabilityChips.css'

/**
 * Semua pilihan selalu tampil; yang berlaku untuk ikan ini aktif, sisanya redup.
 * options: [{ id, emoji, hint? }], active: array id yang berlaku.
 * layout: 'row' (emoji di samping teks) atau 'stack' (emoji di atas teks, lebih ringkas).
 */
function AvailabilityChips({ options, active = [], label, columns = 2, layout = 'row' }) {
  const { t } = useI18n()
  return (
    <ul
      className={`availability availability--${layout}`}
      style={{ '--availability-columns': columns }}
      aria-label={label}
    >
      {options.map((option) => {
        const isOn = active.includes(option.id)
        return (
          <li key={option.id} className={`availability__chip ${isOn ? 'is-on' : 'is-off'}`}>
            <span className="availability__emoji" aria-hidden="true">
              {option.emoji}
            </span>
            <span className="availability__text">
              <span className="availability__label">{option.id}</span>
              {option.hint && <span className="availability__hint">{option.hint}</span>}
            </span>
            <span className="visually-hidden">{isOn ? t('detail.appliesHidden') : t('detail.notAppliesHidden')}</span>
          </li>
        )
      })}
    </ul>
  )
}

export default AvailabilityChips
