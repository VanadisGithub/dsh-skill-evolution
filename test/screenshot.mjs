#!/usr/bin/env node
/**
 * Headless screenshot capture for the skill-evolution settings section.
 * Mints a local signed cookie from the harness credentials record (the same
 * secret the running server validates), drives the UI through CDP, and
 * captures three states: skills tab, settings tab, tuning panel expanded.
 */
import { spawn } from 'node:child_process'
import { createHash, createHmac } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import yaml from '/Users/yaoyuan/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/js-yaml/dist/js-yaml.mjs'

const GUI = 'http://127.0.0.1:3080'
const AUTHORITY = '127.0.0.1:3080'
const OUT_DIR = process.argv[2] || '/tmp/dse-shots'

// --- mint the browser cookie from the stored signing secret ----------------
const b64u = (buf) => Buffer.from(buf).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
const creds = yaml.load(readFileSync(join(process.env.HOME, '.dsh', '.credentials.yaml'), 'utf8'))
const record = creds?.records?.['client-connection/browser-session']
if (!record?.payload?.secret) throw new Error('browser-session secret not found')
const secretStr = record.payload.secret
// The server HMACs with the DECODED secret bytes, not the base64 string.
const secret = Buffer.from(secretStr.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - secretStr.length % 4) % 4), 'base64')
const issuedAt = Date.now()
const payload = { version: 1, authority: AUTHORITY, issuedAt, expiresAt: issuedAt + 7 * 86400000 }
const body = b64u(JSON.stringify(payload))
const cookieValue = `v1.${body}.${b64u(createHmac('sha256', secret).update(body).digest())}`
// Cookie name mirrors the server: "dsh-auth-" + base64url(sha256(authority))
const cookieName = 'dsh-auth-' + b64u(createHash('sha256').update(AUTHORITY).digest())

// --- launch a clean headless Chrome ----------------------------------------
const profile = mkdtempSync(join(tmpdir(), 'dse-shot-'))
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--hide-scrollbars',
  '--remote-debugging-port=9333', `--user-data-dir=${profile}`,
  '--window-size=1400,2200', 'about:blank',
], { stdio: 'ignore' })
process.on('exit', () => chrome.kill())

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function debugUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9333/json/list')
      const targets = await res.json()
      const page = targets.find((t) => t.type === 'page')
      if (page) return page.webSocketDebuggerUrl
    } catch { /* still booting */ }
    await sleep(250)
  }
  throw new Error('chrome devtools endpoint never came up')
}

// --- tiny CDP client --------------------------------------------------------
class Cdp {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.events = [] }
  static async connect(url) {
    const ws = new WebSocket(url)
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
    const cdp = new Cdp(ws)
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id && cdp.pending.has(msg.id)) {
        const { resolve, reject, method } = cdp.pending.get(msg.id)
        cdp.pending.delete(msg.id)
        msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result)
      }
    }
    return cdp
  }
  send(method, params = {}) {
    const id = ++this.id
    this.ws.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject, method }))
  }
  async eval(expression) {
    const { result, exceptionDetails } = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (exceptionDetails) throw new Error('page eval failed: ' + JSON.stringify(exceptionDetails.exception?.description || exceptionDetails))
    return result.value
  }
  async waitFor(expression, timeoutMs = 20000) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      if (await this.eval(expression)) return true
      await sleep(300)
    }
    throw new Error('timeout waiting for: ' + expression)
  }
}

const wsUrl = await debugUrl()
const cdp = await Cdp.connect(wsUrl)
await cdp.send('Page.enable')
await cdp.send('Network.enable')
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 2200, deviceScaleFactor: 2, mobile: false })
await cdp.send('Network.setCookie', { name: cookieName, value: cookieValue, domain: '127.0.0.1', path: '/', httpOnly: true })

await cdp.send('Page.navigate', { url: GUI + '/' })
await cdp.waitFor(`document.querySelector('body') && document.body.innerText.length > 0`)
await sleep(1500)

// --- open the settings page --------------------------------------------------
await cdp.eval(`(() => {
  const el = [...document.querySelectorAll('button, a, [role=button], div, span')]
    .find((e) => e.childElementCount === 0 && e.textContent.trim() === '设置');
  if (!el) throw new Error('settings nav not found');
  el.click();
})()`)
await sleep(1500)
// The plugin section lives under its own settings sub-page "技能进化".
await cdp.eval(`(() => {
  const el = [...document.querySelectorAll('button, [role=button], div, span')]
    .find((e) => e.childElementCount === 0 && e.textContent.trim() === '技能进化');
  if (!el) throw new Error('skill-evolution sub-page not found');
  el.click();
})()`)
await cdp.waitFor(`!!document.querySelector('.dse-section')`, 15000)
await sleep(1200)

const sectionRect = async () => cdp.eval(`(() => {
  const el = document.querySelector('.dse-section');
  el.scrollIntoView({ block: 'start' });
  const r = el.getBoundingClientRect();
  return { x: Math.max(0, r.x - 12), y: Math.max(0, r.y - 12), width: r.width + 24, height: r.height + 24 };
})()`)

async function shoot(file) {
  await sleep(500)
  const rect = await sectionRect()
  // CDP rejects enormous clips; cap the height so docs stay readable too.
  const clip = { ...rect, height: Math.min(rect.height, 2400), scale: 1 }
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip })
  writeFileSync(join(OUT_DIR, file), Buffer.from(data, 'base64'))
  console.log('CAPTURED:', file, clip)
}

// 1. skills tab (default)
await shoot('skills-tab.png')

// 2. settings tab
await cdp.eval(`(() => {
  const tab = [...document.querySelectorAll('.dse-tab')].find((t) => t.textContent.startsWith('设置'));
  if (!tab) throw new Error('settings tab not found');
  tab.click();
})()`)
await cdp.waitFor(`!!document.querySelector('.dse-tabs [data-active=true]') && !!document.querySelector('.dse-panel')`, 8000)
await sleep(800)
await shoot('settings-tab.png')

// 3. tuning panel expanded
await cdp.eval(`(() => {
  const summary = [...document.querySelectorAll('.dse-panel > summary')].find((s) => s.textContent.includes('阈值与控制'));
  if (!summary) throw new Error('tuning panel not found');
  const details = summary.parentElement;
  if (!details.open) summary.click();
})()`)
await cdp.waitFor(`(() => {
  const summary = [...document.querySelectorAll('.dse-panel > summary')].find((s) => s.textContent.includes('阈值与控制'));
  return summary && summary.parentElement.open && !!summary.parentElement.querySelector('.dse-flow');
})()`, 8000)
await sleep(800)
await shoot('tuning-panel.png')

await cdp.ws.close()
chrome.kill()
console.log('DONE')
