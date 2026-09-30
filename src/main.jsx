import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { loadLocale } from './i18n/I18nProvider'
import { localeFromPath } from './i18n/locales'
import './index.css'

// Halaman /th: teks & deskripsi Thai dimuat dulu (berkas terpisah), baru aplikasi dirender, supaya tidak sempat kosong.
// Kalau gagal dimuat, aplikasi tetap dirender dan menunggu lewat Suspense.
const locale = localeFromPath(window.location.pathname)
const ready = locale === 'id' ? Promise.resolve() : loadLocale(locale).catch(() => {})

ready.then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
