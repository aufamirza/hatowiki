import { Coins, Star } from 'lucide-react'
import { useI18n } from '../../i18n/I18nProvider'
import './MarketValue.css'

const STAR_SLOTS = [1, 2, 3, 4, 5]

// Nilai per kualitas: baris 1★ sampai 5★. Bawaannya harga jual (ikon koin; burung: harga jual Info Card), tapi
// ikon, format angka, dan satuannya bisa diganti (mis. energi resep: ikon petir, "+40", "energi").
// Nilai yang tidak ada di sumber (`values` null) tampil "—". Satu nilai null di dalam daftar tampil sebagai
// `missingLabel`: "—" untuk ikan & resep, "Belum pasti" untuk serangga & burung (angka desimal di sumber yang
// sengaja tidak dibulatkan). `uncertain` = indeks bintang yang desimal di sumber (resep), selalu "Belum pasti".
// `absent` = indeks bintang yang tidak dicantumkan di sumber (mis. burung event yang hanya punya 1★–2★), selalu "—".
// Bawaan format angka & satuan mengikuti bahasa halaman.
function MarketValue({
  values,
  missingLabel = '—',
  uncertain = [],
  absent = [],
  icon: Icon = Coins,
  iconClassName = 'market-value__coin',
  format,
  unit,
}) {
  const { t, formatNumber } = useI18n()
  const formatValue = format ?? formatNumber
  const unitLabel = unit ?? t('common.coins')
  return (
    <ol className="market-value">
      {STAR_SLOTS.map((stars, index) => {
        const value = values?.[index] ?? null
        return (
          <li key={stars} className="market-value__row">
            <span className="market-value__stars" role="img" aria-label={t('detail.qualityStars', { stars })}>
              {STAR_SLOTS.map((slot) => (
                <Star key={slot} aria-hidden="true" className={slot <= stars ? 'is-filled' : undefined} />
              ))}
            </span>
            <Icon aria-hidden="true" className={iconClassName} />
            {value === null ? (
              <span className="market-value__amount is-missing">
                {values == null ? '—' : uncertain.includes(index) ? t('common.uncertain') : absent.includes(index) ? '—' : missingLabel}
              </span>
            ) : (
              <span className="market-value__amount">
                {formatValue(value)}
                <span className="visually-hidden">{` ${unitLabel}`}</span>
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

export default MarketValue
