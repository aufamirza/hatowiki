import { useCallback } from 'react'
import { Link as RouterLink, NavLink as RouterNavLink, useNavigate } from 'react-router-dom'
import { useI18n } from './I18nProvider'

/**
 * Pengganti Link/NavLink/useNavigate react-router: alamat internal ditulis tanpa awalan bahasa ('/wildlife/fish'),
 * lalu diberi awalan bahasa halaman yang sedang dibuka ('/th/wildlife/fish' di versi Thai, '/en/wildlife/fish' di versi
 * Inggris).
 */
function localizeTo(to, path) {
  if (typeof to === 'string') return path(to)
  if (to && typeof to.pathname === 'string') return { ...to, pathname: path(to.pathname) }
  return to
}

export function Link({ to, ...props }) {
  const { path } = useI18n()
  return <RouterLink to={localizeTo(to, path)} {...props} />
}

export function NavLink({ to, ...props }) {
  const { path } = useI18n()
  return <RouterNavLink to={localizeTo(to, path)} {...props} />
}

export function useLocaleNavigate() {
  const navigate = useNavigate()
  const { path } = useI18n()
  return useCallback((to, options) => navigate(localizeTo(to, path), options), [navigate, path])
}
