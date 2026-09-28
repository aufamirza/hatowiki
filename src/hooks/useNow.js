import { useEffect, useState } from 'react'

const MINUTE_MS = 60_000

// Waktu sekarang yang diperbarui tepat di pergantian menit, dan langsung disegarkan
// saat tab kembali aktif (timer di tab latar belakang bisa diperlambat browser).
export function useNow() {
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

  return now
}
