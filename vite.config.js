import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // Data wildlife (ikan, serangga, burung, poligon zona) dan library dipisah dari kode aplikasi supaya
        // tiap berkas di bawah batas peringatan 500 kB. Semuanya tetap dimuat di awal seperti sebelumnya.
        codeSplitting: {
          groups: [
            { name: 'wildlife-data', test: /[\\/]src[\\/]data[\\/]wildlife[\\/]/ },
            { name: 'vendor', test: /[\\/]node_modules[\\/]/ },
          ],
        },
      },
    },
  },
})
