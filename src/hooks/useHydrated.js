import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/**
 * false saat render di server (HTML statis, src/entry-server.jsx) dan saat render hydrate pertama di browser, lalu true
 * (React merender ulang komponennya tepat setelah hydrate). Render biasa di browser (bukan hydrate, mis. pindah halaman)
 * langsung true. Dipakai bagian yang bergantung pada browser (jam, tema) supaya render hydrate sama persis dengan HTML
 * statisnya.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
