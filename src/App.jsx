import { Analytics } from '@vercel/analytics/react'

/**
 * Akar aplikasi: router (RouterProvider di browser, StaticRouterProvider saat build, lihat src/main.jsx dan
 * src/entry-server.jsx) dan Vercel Analytics. Bentuk pohonnya harus sama di kedua tempat supaya HTML statis bisa
 * di-hydrate tanpa perbedaan.
 */
function App({ children }) {
  return (
    <>
      {children}
      <Analytics />
    </>
  )
}

export default App
