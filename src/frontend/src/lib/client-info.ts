/**
 * What the app tells the server about itself, in one request header (X-Client),
 * so a later version of the API can check compatibility. Exactly this list and
 * nothing else about the player's settings:
 *
 *   version, platform (mobile or desktop view), theme (light or dark, with
 *   "-auto" when it follows the device), high contrast (only when on), text
 *   size, full screen, sound, and on-screen controls only.
 *
 * Example: `v=2.261112.1518; platform=mobile; theme=dark-auto; contrast=high;
 * text=large; fullscreen=on; sound=on; onscreen=on`. The server only receives it
 * for now. It is built fresh for every request, so it is never stale.
 */
import { touchFirst } from './device'
import { settings } from './settings.svelte'
import { theme } from './theme.svelte'
import { appVersion } from './version'

const on = (value: boolean) => (value ? 'on' : 'off')

export function clientInfo(): string {
  const platform = touchFirst || window.innerWidth < 700 ? 'mobile' : 'desktop'
  const parts = [
    `v=${appVersion.replace(/^v/, '')}`,
    `platform=${platform}`,
    `theme=${theme.current}${theme.choice === 'system' ? '-auto' : ''}`,
  ]
  if (settings.highContrast) parts.push('contrast=high')
  parts.push(
    `text=${settings.textSize}`,
    `fullscreen=${on(settings.fullscreen)}`,
    `sound=${on(settings.sound)}`,
    `onscreen=${on(settings.keyboardOff)}`,
  )
  return parts.join('; ')
}
