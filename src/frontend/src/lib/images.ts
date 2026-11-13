/**
 * Screenshots for the feedback form: shrunk in the browser before they are sent, so an uploaded photo is a few
 * hundred kilobytes instead of several megabytes (cheaper to store, quicker on a phone's connection).
 */

export const MAX_IMAGES = 6
/** The biggest file a player may pick (before shrinking). */
export const MAX_PICK_BYTES = 2 * 1024 * 1024
/** All the images in one submission, after shrinking. The server enforces the same limit. */
export const MAX_TOTAL_BYTES = 4 * 1024 * 1024
export const ACCEPT = 'image/png,image/jpeg,image/webp'
const TYPES = ACCEPT.split(',')

/** From gentle to hard: how big and how compressed an image is made. */
const LEVELS = [
  { edge: 1600, quality: 0.8 },
  { edge: 1400, quality: 0.7 },
  { edge: 1200, quality: 0.6 },
  { edge: 1000, quality: 0.5 },
  { edge: 800, quality: 0.4 },
]

export function isPickable(file: File): string | null {
  if (!TYPES.includes(file.type)) return `“${file.name}” isn't a PNG, JPEG or WebP image`
  if (file.size > MAX_PICK_BYTES) return `“${file.name}” is over 2 MB`
  return null
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

/** One image, shrunk to `edge` pixels on its long side and re-encoded as WebP (JPEG where WebP isn't available). */
export async function shrink(file: Blob, level = 0): Promise<Blob> {
  const { edge, quality } = LEVELS[Math.min(level, LEVELS.length - 1)]
  // createImageBitmap applies the photo's rotation (EXIF), so a portrait shot isn't sent on its side.
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('No canvas')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const webp = await toBlob(canvas, 'image/webp', quality)
    // Safari quietly hands back a PNG when it can't make WebP, so check what came out.
    if (webp && webp.type === 'image/webp') return webp
    // JPEG has no transparency: put the picture on white.
    context.globalCompositeOperation = 'destination-over'
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    const jpeg = await toBlob(canvas, 'image/jpeg', quality)
    if (!jpeg) throw new Error('Could not encode')
    return jpeg
  } finally {
    bitmap.close()
  }
}

/** Every image shrunk, at the gentlest level that fits them all under `limit`, or null when none does. */
export async function fit(files: Blob[], limit = MAX_TOTAL_BYTES): Promise<Blob[] | null> {
  for (let level = 0; level < LEVELS.length; level++) {
    const shrunk = await Promise.all(files.map((file) => shrink(file, level)))
    if (shrunk.reduce((sum, blob) => sum + blob.size, 0) <= limit) return shrunk
  }
  return null
}

export const extension = (blob: Blob) => (blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg')

export function readable(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}
