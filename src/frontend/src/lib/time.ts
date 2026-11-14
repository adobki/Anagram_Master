/**
 * Times of day are shown in 12-hour format everywhere in the app (the player's own time zone and language, but
 * always with am/pm), whatever the device's own preference is. Build every date-with-time from these, never from a
 * bare `toLocaleString()` / `toLocaleTimeString()`.
 */
const CLOCK = { hour: 'numeric', minute: '2-digit', hour12: true } as const

/** "14 Nov, 12:11 AM" */
export const shortStamp = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', ...CLOCK })

/** "14 Nov 2026, 12:11 AM" */
export const fullStamp = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', ...CLOCK })
