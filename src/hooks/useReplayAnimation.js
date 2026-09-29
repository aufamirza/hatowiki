import { useLayoutEffect, useRef } from 'react'

/**
 * Memutar ulang animasi CSS masuk (kelas `className`, lihat base.css) setiap `key` berubah, tanpa memasang ulang
 * komponennya. Render pertama dilewati supaya halaman yang baru dimuat tidak ikut memudar. Animasinya hanya opacity &
 * transform, dan dimatikan kalau prefers-reduced-motion aktif (base.css).
 */
export function useReplayAnimation(ref, key, className) {
  const firstRun = useRef(true)

  useLayoutEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return undefined
    }
    const element = ref.current
    if (!element) return undefined
    element.classList.remove(className)
    // Baca ukuran sekali supaya browser menganggap kelasnya benar-benar baru (animasi mulai dari awal).
    void element.offsetWidth
    element.classList.add(className)
    const done = () => element.classList.remove(className)
    element.addEventListener('animationend', done, { once: true })
    return () => element.removeEventListener('animationend', done)
  }, [key, ref, className])
}
