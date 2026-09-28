import { useEffect } from 'react'

const SITE_NAME = 'Hatowiki'

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Wiki Komunitas Heartopia`
  }, [title])
}
