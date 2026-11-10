/**
 * How the version is written. It is stored in package.json (and
 * package-lock.json) as a three-part semver that npm accepts, and shown to
 * people as v2.YYMMDD, plus .HHMM when a second version ships on the same day.
 *
 *   stored "2.261110.0"   -> shown "v2.261110"
 *   stored "2.261110.905" -> shown "v2.261110.0905"  (09:05)
 *
 * scripts/stamp-version.mjs writes the stored form. This file has no imports,
 * so vite.config.ts can use it too.
 */
export function displayVersion(stored: string): string {
  const [major, date, time] = stored.split('.')
  return `v${major}.${date}` + (time && time !== '0' ? `.${time.padStart(4, '0')}` : '')
}
