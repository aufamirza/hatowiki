/**
 * Alat bersama uji UI: Chrome/Edge headless lewat Chrome DevTools Protocol, tab dengan lebar tertentu, dan
 * perhitungan kontras WCAG. Dipakai scripts/qa/wildlife-list.test.mjs, scripts/qa/home.test.mjs, dan
 * scripts/qa/i18n.test.mjs.
 */
import { spawn, execSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Warna CSS terhitung ("rgb(r, g, b)") → luminans & kontras WCAG.
export const parseRgb = (css) => css.match(/[\d.]+/g).slice(0, 3).map(Number)
export const toLinear = (value) => {
  const c = value / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
export const luminance = (css) => { const [r, g, b] = parseRgb(css).map(toLinear); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
export const contrastRatio = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ]
  return candidates.find((candidate) => candidate && existsSync(candidate))
}

export async function startChrome(port) {
  const chromePath = findChrome()
  if (!chromePath) throw new Error('Chrome/Edge tidak ditemukan. Set CHROME_PATH.')
  const profile = mkdtempSync(path.join(tmpdir(), 'hatowiki-qa-'))
  const child = spawn(chromePath, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore' })
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(`http://127.0.0.1:${port}/json/version`)
      return {
        stop() {
          if (process.platform === 'win32') {
            try { execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' }) } catch { /* sudah berhenti */ }
          } else child.kill()
          try { rmSync(profile, { recursive: true, force: true }) } catch { /* profil masih dikunci, abaikan */ }
        },
      }
    } catch {
      await sleep(500)
    }
  }
  child.kill()
  throw new Error('Chrome tidak bisa dihubungi lewat DevTools Protocol.')
}

export async function openTab(port, width) {
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json()
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }))
  let id = 0
  const pending = new Map()
  const logs = []
  // Pendengar event CDP (mis. Fetch.requestPaused untuk mencegat request), lihat on() di bawah.
  const listeners = new Map()
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return }
    for (const listener of listeners.get(msg.method) ?? []) listener(msg.params)
    if (msg.method === 'Runtime.consoleAPICalled') logs.push(`console.${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ')}`)
    if (msg.method === 'Runtime.exceptionThrown') logs.push(`EXCEPTION: ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`)
    if (msg.method === 'Log.entryAdded') logs.push(`log.${msg.params.entry.level}: ${msg.params.entry.text}`)
  })
  const send = (method, params = {}) => new Promise((resolve) => {
    const mid = ++id
    pending.set(mid, resolve)
    ws.send(JSON.stringify({ id: mid, method, params }))
  })
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 })
  return {
    send,
    logs,
    evaluate: async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value,
    on(method, listener) {
      if (!listeners.has(method)) listeners.set(method, [])
      listeners.get(method).push(listener)
    },
    async close() { ws.close(); await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`) },
  }
}
