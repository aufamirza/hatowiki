import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useHydrated } from '../../hooks/useHydrated'
import { useI18n } from '../../i18n/I18nProvider'

const STORAGE_KEY = 'hdx-theme'

const readTheme = () => (typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')

function ThemeToggle() {
  const { t } = useI18n()
  const hydrated = useHydrated()
  // Tema awal sudah dipasang di index.html sebelum React jalan. HTML statis tidak tahu tema pengunjung, jadi sampai
  // hydrate selesai labelnya label tema terang; ikonnya (bulan di tema terang, matahari di tema gelap) dipilih lewat CSS
  // dari atribut data-theme (Layout.css), jadi sudah benar sejak awal.
  const [theme, setTheme] = useState(readTheme)
  const isDark = hydrated && theme === 'dark'

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Penyimpanan diblokir (mis. mode privat): tema tetap berganti untuk sesi ini.
    }
    setTheme(next)
  }

  const label = isDark ? t('layout.themeToLight') : t('layout.themeToDark')

  return (
    <button type="button" className="icon-button" onClick={toggleTheme} aria-label={label} title={label}>
      <Sun className="theme-toggle__sun" aria-hidden="true" />
      <Moon className="theme-toggle__moon" aria-hidden="true" />
    </button>
  )
}

export default ThemeToggle
