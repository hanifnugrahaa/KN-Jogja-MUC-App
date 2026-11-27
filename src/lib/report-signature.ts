export type ReportSignature = { dataUrl: string; width: number; height: number }

export async function loadLocalSignature(token: string): Promise<ReportSignature | undefined> {
  const response = await fetch('/api/local-report-signature', {
    headers: { Authorization: 'Bearer ' + token },
  })
  if (!response.ok) return

  const image = await createImageBitmap(await response.blob())
  try {
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext('2d')
    if (!context) return
    context.drawImage(image, 0, 0)

    // Trim transparent padding for consistent signature placement across export formats.
    const pixels = context.getImageData(0, 0, image.width, image.height).data
    let left = image.width, top = image.height, right = -1, bottom = -1
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        if (!pixels[(y * image.width + x) * 4 + 3]) continue
        left = Math.min(left, x)
        top = Math.min(top, y)
        right = Math.max(right, x)
        bottom = Math.max(bottom, y)
      }
    }
    if (right < 0) return
    const width = right - left + 1
    const height = bottom - top + 1
    canvas.width = width
    canvas.height = height
    context.drawImage(image, left, top, width, height, 0, 0, width, height)
    return { dataUrl: canvas.toDataURL('image/png'), width, height }
  } finally {
    image.close()
  }
}
