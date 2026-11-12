/** What this device can do. Settings hides the switches for things it can't. */

/** The main way of pointing is a finger: a phone or a tablet. This is what "mobile" means for the keyboard setting. */
export const touchFirst = matchMedia('(pointer: coarse)').matches

/**
 * Chrome on Android can vibrate. iPhones can't, and desktop Chrome has the API but no motor,
 * so it only counts on a touch-first device.
 */
export const canVibrate = touchFirst && typeof navigator.vibrate === 'function'

/** The Screen Wake Lock API, which keeps the screen from dimming. */
export const canKeepAwake = 'wakeLock' in navigator

/**
 * The browser can show a page full screen: computers, Android, iPads. (Not iPhones, where only video can; a page
 * added to the Home Screen is full screen anyway.)
 */
export const canFullscreen = !!(
  document.fullscreenEnabled || (document as Document & { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled
)
