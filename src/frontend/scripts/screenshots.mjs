// Makes the screenshots shown on the About page (src/assets/about/shot-*.webp):
// four screens, each as a phone and a desktop picture, in light and dark.
//
//   npm i --no-save playwright-core sharp      (kept out of package.json on purpose)
//   # start the app against the TEST database, for example from src/backend:
//   #   am_database_name=AM_FE_tests PORT=5555 python -m server
//   node scripts/screenshots.mjs [base-url]    (default http://localhost:5555)
//
// It plays one real game per picture (all pictures at once) in the installed
// Microsoft Edge, so it takes about two minutes: the "limits" screenshot waits
// for the round clock to run down. Each game ends by closing its session, and
// a game scoring 10+ is saved to whichever database the server uses, so never
// point this at production. The leaderboard picture swaps in a sample list for
// that one request in the browser; nothing is written for it.

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

let chromium, sharp
try {
  ;({ chromium } = await import('playwright-core'))
  sharp = (await import('sharp')).default
} catch {
  console.error('Run `npm i --no-save playwright-core sharp` first.')
  process.exit(1)
}

const here = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(here, '../src/assets/about')
const WORDS = path.join(here, '../../backend/models/storage_data/words.txt')
const BASE = process.argv[2] ?? 'http://localhost:5555'

const DEVICES = {
  phone: { viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
}
const THEMES = ['light', 'dark']
const NAME = 'Ada'
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Sample leaderboard: real entries from the public leaderboard, best first, top 20.
const SAMPLE = [
  ['Eric Kiminza', 1024, '2023-08-22T09:53:41.951Z'],
  ['Mary', 718, '2024-06-22T09:53:41.951Z'],
  ['Dee', 699, '2024-06-19T09:53:41.951Z'],
  ['RSA', 467, '2024-06-19T09:53:41.951Z'],
  ['uju', 461, '2024-06-19T09:53:41.951Z'],
  ['Amos', 322, '2024-06-19T09:53:41.951Z'],
  ['Vicky', 244, '2024-06-19T09:53:41.951Z'],
  ['SamDigital', 243, '2024-06-19T09:53:41.951Z'],
  ['Nura', 157, '2024-06-19T09:53:41.951Z'],
  ['Vicky', 147, '2024-06-19T09:53:41.951Z'],
  ['Mary', 147, '2024-06-19T09:53:41.951Z'],
  ['Chiamaka', 127, '2024-06-19T09:53:41.951Z'],
  ['phun', 94, '2024-06-19T09:53:41.951Z'],
  ['Tomi', 62, '2024-06-19T09:53:41.951Z'],
  ['Dee', 43, '2024-06-19T09:53:41.951Z'],
  ['Temi', 36, '2024-06-19T09:53:41.951Z'],
  ['Truman', 329, '2024-06-29T22:46:41.951Z'],
  ['Suraj', 52, '2024-06-29T22:46:41.951Z'],
  ['Fatty', 62, '2024-06-29T22:46:41.951Z'],
  ['Idowu', 24, '2024-06-19T09:53:41.951Z'],
  ['Patrick', 41, '2024-07-11T22:59:26.135Z'],
  ['Knifey', 176, '2024-07-12T15:47:54.992Z'],
  ['Donald', 1978, '2024-07-19T14:59:20.598Z'],
  ['Omotayo', 34, '2024-08-29T17:41:51.868Z'],
  ['meg', 21, '2024-12-18T17:25:53.755Z'],
  ['Kisame', 132, '2025-02-19T19:19:30.760Z'],
  ['Gambo', 296, '2025-11-13T15:40:54.476Z'],
  ['Kuku Danger', 290, '2026-02-22T14:45:14.999Z'],
]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .map(([name, score, date]) => [score, name, date]) // the API's order: [score, name, date]

const dictionary = new Set(
  readFileSync(WORDS, 'utf8')
    .split(/\r?\n/)
    .map((word) => word.trim().toLowerCase()),
)

/** Dictionary words that can be spelled from the root's letters, longest first. */
function makeable(root) {
  const letters = root.replace(/[^a-z]/g, '')
  const pool = {}
  for (const letter of letters) pool[letter] = (pool[letter] ?? 0) + 1
  const found = []
  for (const word of dictionary) {
    if (word.length < 2 || word === letters || !/^[a-z]+$/.test(word)) continue
    const used = {}
    if ([...word].every((letter) => (used[letter] = (used[letter] ?? 0) + 1) <= (pool[letter] ?? 0))) found.push(word)
  }
  return found.sort((a, b) => b.length - a.length || a.localeCompare(b))
}

/** A made-up arrangement of the root's letters that isn't a word. */
function nonsense(root) {
  const letters = root.replace(/[^a-z]/g, '')
  for (let i = 0; i < letters.length - 3; i++) {
    const word = letters.slice(i, i + 4).split('').reverse().join('')
    if (!dictionary.has(word)) return word
  }
  return letters.slice(0, 3).split('').reverse().join('')
}

async function save(page, name, device, theme) {
  const png = await page.screenshot()
  const file = path.join(OUT, `shot-${name}-${device}-${theme}.webp`)
  await sharp(png).webp({ quality: 82 }).toFile(file)
  console.log('wrote', path.basename(file))
}

async function shoot(browser, device, theme) {
  const context = await browser.newContext({ ...DEVICES[device], colorScheme: theme })
  // The pictures are made by typing, which the keyboard setting would ignore on a phone, and a
  // headless browser has no speakers to play the sound effects through.
  await context.addInitScript((t) => {
    localStorage.setItem('am-theme', t)
    localStorage.setItem('am-settings', JSON.stringify({ keyboardOff: false, sound: false }))
  }, theme)
  const page = await context.newPage()
  const tag = `${device}/${theme}`
  const status = () => page.evaluate(() => fetch('/api/v1/status').then((r) => r.json()))
  const submit = async (word) => {
    await page.keyboard.press('Escape') // start from an empty tray
    await page.keyboard.type(word, { delay: 15 })
    const reply = page.waitForResponse((r) => r.url().includes('/api/v1/play') && r.request().method() === 'POST')
    await page.keyboard.press('Enter')
    await reply
    await sleep(350) // let the message and the list settle
  }

  await page.goto(BASE)
  await page.locator('form input').fill(NAME)
  await page.getByRole('button', { name: /Start game/ }).click()
  await page.locator('.round').waitFor()
  await sleep(1500)
  await save(page, 'interface', device, theme)

  const root = (await status()).word
  const words = makeable(root)
  // The dictionary has abbreviations and oddities, so show plausible words: long
  // ones that read like English, plus a few common short ones.
  const readable = words.filter(
    (word) => word.length >= 4 && /[aeiouy]/.test(word) && !/(.)|[aeiou]{3}|[^aeiouy]{4}|aa|ii|uu|yy/.test(word),
  )
  const common = ['art', 'ten', 'set', 'tea', 'are', 'eat', 'ate', 'sat', 'tar', 'rat', 'ran', 'red', 'tan', 'net', 'sea', 'ear', 'era', 'ire', 'one', 'ore', 'toe', 'tie', 'pie', 'die', 'dim', 'lid', 'lie']
  const picks = [
    ...readable.slice(0, 5),
    ...readable.filter((_, i) => i >= 5 && i % Math.ceil(readable.length / 4) === 0).slice(0, 3),
    ...common.filter((word) => words.includes(word)).slice(0, 3),
  ]
  console.log(tag, 'root', root, 'playing', picks.length, 'words')
  for (const word of picks) await submit(word)
  await save(page, 'gameplay', device, theme)

  // Let the clock run down, then get a word wrong for the "limits" picture.
  for (;;) {
    const { time } = await status()
    if (time <= 11) break
    await sleep(Math.min(5000, (time - 11) * 1000))
  }
  await submit(nonsense(root))
  await save(page, 'limits', device, theme)

  await page.route('**/api/v1/scores', (route) => route.fulfill({ json: { scores: SAMPLE } }))
  await page.goto(`${BASE}/#scores`)
  await page.locator('.board li').first().waitFor()
  await sleep(2200)
  await save(page, 'highscores', device, theme)

  await page.evaluate(() => fetch('/api/v1/close', { method: 'POST' })) // ends the game
  await context.close()
}

const browser = await chromium.launch({ channel: 'msedge' })
try {
  const jobs = []
  for (const device of Object.keys(DEVICES)) for (const theme of THEMES) jobs.push(shoot(browser, device, theme))
  await Promise.all(jobs)
} finally {
  await browser.close()
}
