import { useEffect } from 'react'
import { useI18n } from '../i18n/I18nProvider'

// "<judul> | Hatowiki", atau judul dasar situs (per bahasa) kalau halaman tidak punya judul sendiri.
export function usePageTitle(title) {
  const { t } = useI18n()
  useEffect(() => {
    document.title = title ? t('meta.titlePage', { title }) : t('meta.titleDefault')
  }, [title, t])
}
