import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useI18n } from '../../i18n/I18nProvider'

const STORAGE_KEY = 'hdx-theme'

function ThemeToggle() {
  const { t } = useI18n()
  // Tema awal sudah dipasang di index.html sebelum React jalan.
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
  const isDark = theme === 'dark'

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
      {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </button>
  )
}

export default ThemeToggle
