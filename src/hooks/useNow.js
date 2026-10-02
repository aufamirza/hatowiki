import { useEffect, useState } from 'react'
import { useHydrated } from './useHydrated'

const MINUTE_MS = 60_000
// Waktu tetap untuk HTML statis dan render hydrate (lihat useHydrated): jam sebenarnya baru dipakai setelah hydrate.
// Komponen yang memakainya menyembunyikan isinya selama itu (data-pending).
const PLACEHOLDER_NOW = new Date(Date.UTC(2026, 0, 1, 0, 0))

// Waktu sekarang yang diperbarui tepat di pergantian menit, dan langsung disegarkan
// saat tab kembali aktif (timer di tab latar belakang bisa diperlambat browser).
export function useNow() {
  const hydrated = useHydrated()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timeoutId
    const tick = () => setNow(new Date())
    const scheduleNextMinute = () => {
      timeoutId = setTimeout(() => {
        tick()
        scheduleNextMinute()
      }, MINUTE_MS - (Date.now() % MINUTE_MS) + 50)
    }
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return
      clearTimeout(timeoutId)
      tick()
      scheduleNextMinute()
    }

    scheduleNextMinute()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return hydrated ? now : PLACEHOLDER_NOW
}
