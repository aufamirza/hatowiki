import { MAP_SIZE } from './locationZones'

// Rumus potongan peta di halaman detail Heartodex: kotak pembatas poligon diperbesar 4× dari titik
// tengahnya, lalu dipotong ke batas peta. Dicocokkan dengan viewBox halaman detail ikan & serangga
// oleh scripts/heartodex-sync.mjs (selisih maks. 0,35 karena poligon disimpan 1 desimal).
const ZOOM_OUT = 4

/**
 * viewBox untuk menampilkan beberapa zona sekaligus (mis. serangga dengan beberapa lokasi).
 * @param {string[][]} polygonGroups poligon tiap zona, format "x,y x,y …" seperti di LOCATION_ZONES
 * @returns {string} "x y lebar tinggi"
 */
export function zoneViewBox(polygonGroups) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const points of polygonGroups.flat()) {
    for (const pair of points.split(' ')) {
      const [x, y] = pair.split(',').map(Number)
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
  }
  const round = (value) => Math.round(value * 10) / 10
  const span = (min, max) => {
    const center = (min + max) / 2
    const half = ((max - min) * ZOOM_OUT) / 2
    const start = Math.max(0, center - half)
    return [start, Math.min(MAP_SIZE, center + half) - start]
  }
  const [x, width] = span(minX, maxX)
  const [y, height] = span(minY, maxY)
  return [x, y, width, height].map(round).join(' ')
}
