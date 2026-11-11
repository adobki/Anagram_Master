// Stamps a new front end version into package.json and package-lock.json.
// Run `npm run stamp` before every commit that changes the front end, and
// commit both files with it.
//
// The version is v2.YYMMDD, plus .HHMM when an earlier version already exists
// on the same date. npm needs a three-part semver without leading zeros, so it
// is stored as 2.YYMMDD.0 (first of the day) or 2.YYMMDD.<HHMM as a number>
// (09:05 is stored as 905). src/lib/version-format.ts turns that back into the
// text people see.
//
// `npm run stamp -- --critical` also marks this version as a critical update:
// it writes "criticalSince" (this version) into package.json. Every device
// running something older then installs the update by itself, the next time it
// is on a screen that isn't a game. Ordinary stamps leave the mark alone, so a
// later normal version still carries it, and a device that skipped the
// critical one is still caught.
//
// "Earlier version" means the one stored in the last commit (HEAD), so running
// this twice before one commit gives the same date part both times.

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const MAJOR = 2
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const pad = (n) => String(n).padStart(2, '0')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** The version stored in the last commit, or null (no git, or no earlier commit). */
function committedVersion() {
  try {
    const json = execFileSync('git', ['show', 'HEAD:./package.json'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    return JSON.parse(json).version
  } catch {
    return null
  }
}

function nextVersion(previous, now) {
  const date = `${pad(now.getFullYear() % 100)}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const [major, day] = (previous ?? '').split('.')
  if (Number(major) !== MAJOR || day !== date) return `${MAJOR}.${date}.0` // first version of the day
  return `${MAJOR}.${date}.${now.getHours() * 100 + now.getMinutes()}`
}

/** Replaces the first match's captured version, and fails loudly if there is no match. */
function replaceVersion(file, pattern, version) {
  const text = readFileSync(file, 'utf8')
  if (!pattern.test(text)) throw new Error(`No version found in ${path.basename(file)}`)
  writeFileSync(file, text.replace(pattern, `$1${version}$2`))
}

const previous = committedVersion()
let version = nextVersion(previous, new Date())
while (version === previous) {
  // Two stamps within the same minute would repeat a version: wait for the next one.
  const wait = 60_000 - (Date.now() % 60_000) + 250
  console.log(`${version} is already the committed version; waiting ${Math.ceil(wait / 1000)}s for the next minute...`)
  await sleep(wait)
  version = nextVersion(previous, new Date())
}

replaceVersion(path.join(root, 'package.json'), /^(\s*"version":\s*")[^"]*(")/m, version)
// package-lock.json repeats the version at the top and again under packages[""].
const lock = path.join(root, 'package-lock.json')
replaceVersion(lock, /^(\s*"version":\s*")[^"]*(")/m, version)
replaceVersion(lock, /("packages":\s*\{\s*"":\s*\{[^}]*?"version":\s*")[^"]*(")/s, version)

if (process.argv.includes('--critical')) {
  const file = path.join(root, 'package.json')
  const text = readFileSync(file, 'utf8')
  const mark = /^(\s*"criticalSince":\s*")[^"]*(")/m
  writeFileSync(
    file,
    mark.test(text)
      ? text.replace(mark, `$1${version}$2`)
      : text.replace(/^(\s*"version":\s*"[^"]*",?)(\r?\n)/m, `$1$2  "criticalSince": "${version}",$2`),
  )
}

for (const file of ['package.json', 'package-lock.json']) {
  const data = JSON.parse(readFileSync(path.join(root, file), 'utf8'))
  if (data.version !== version || (data.packages && data.packages[''].version !== version)) {
    throw new Error(`${file} did not take the new version`)
  }
}
console.log(`Stamped ${version}${previous ? ` (was ${previous})` : ''}`)
