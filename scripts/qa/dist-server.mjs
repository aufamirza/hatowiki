/**
 * Server statis kecil untuk uji hasil build (dist/), meniru Vercel: berkas yang ada didahulukan (termasuk
 * <alamat>/index.html), alamat lain mengikuti rewrite di vercel.json (yang pertama cocok). Dipakai uji yang perlu
 * HTML statis + bundel produksi, mis. hydrate di scripts/qa/seo.test.mjs.
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
}

const isFile = (file) => existsSync(file) && statSync(file).isFile()

/** Mulai server untuk folder `dist` di `port`; mengembalikan { url, close }. */
export function startDistServer({ dist, port, vercelConfig }) {
  const { rewrites = [] } = JSON.parse(readFileSync(vercelConfig, 'utf8'))
  const resolve = (pathname) => {
    const local = path.join(dist, decodeURIComponent(pathname))
    if (!local.startsWith(dist)) return null
    if (isFile(local)) return local
    if (isFile(path.join(local, 'index.html'))) return path.join(local, 'index.html')
    const rule = rewrites.find((item) => new RegExp(`^${item.source.replace('/:path*', '(?:/.*)?')}$`).test(pathname))
    return rule ? path.join(dist, rule.destination) : null
  }
  const server = createServer((request, response) => {
    const { pathname } = new URL(request.url, 'http://localhost')
    // Fitur platform Vercel yang tidak ada di dist/: skrip Analytics dan fungsi api/geo.js (negara tidak diketahui).
    if (pathname.startsWith('/_vercel/')) {
      response.writeHead(200, { 'content-type': TYPES['.js'] })
      response.end('')
      return
    }
    if (pathname === '/api/geo') {
      response.writeHead(200, { 'content-type': TYPES['.json'] })
      response.end('{"country":null}')
      return
    }
    const file = resolve(pathname)
    if (!file || !isFile(file)) {
      response.writeHead(404, { 'content-type': 'text/plain' })
      response.end('404')
      return
    }
    response.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' })
    response.end(readFileSync(file))
  })
  return new Promise((done) => {
    server.listen(port, () => done({ url: `http://localhost:${port}`, close: () => new Promise((closed) => server.close(closed)) }))
  })
}
