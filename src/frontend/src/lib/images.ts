/**
 * Screenshots for the feedback form: shrunk in the browser before they are sent, so an uploaded photo is a few
 * hundred kilobytes instead of several megabytes (cheaper to store, quicker on a phone's connection).
 */

export const MAX_IMAGES = 6
/** All the images in one submission, after shrinking. The server enforces the same limit. */
export const MAX_TOTAL_BYTES = 4 * 1024 * 1024
export const ACCEPT = 'image/png,image/jpeg,image/webp'
const TYPES = ACCEPT.split(',')

/** How big and how compressed a picture is made: up to 1600 pixels on its long side, at WebP quality 0.8. */
const EDGE = 1600
const QUALITY = 0.8

export function isPickable(file: File): string | null {
  if (!TYPES.includes(file.type)) return `“${file.name}” isn't a PNG, JPEG or WebP image`
  return null
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

/** One image, shrunk to `edge` pixels on its long side and re-encoded as WebP (JPEG where WebP isn't available). */
export async function shrink(file: Blob): Promise<Blob> {
  const edge = EDGE
  const quality = QUALITY
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

export const extension = (blob: Blob) => (blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg')

export function readable(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}
