type LocalFont = { postscriptName: string; blob: () => Promise<Blob> }
type LocalFontWindow = Window & { queryLocalFonts?: (options: { postscriptNames: string[] }) => Promise<LocalFont[]> }
const faces = [['SegoeUI', 'normal'], ['SegoeUI-Bold', 'bold']] as const

export const reportFontFamily = 'Segoe UI'
export class ReportFontError extends Error {}

function canSubset(bytes: ArrayBuffer) {
  const font = new DataView(bytes)
  for (let index = 0; index < font.getUint16(4); index++) {
    const entry = 12 + index * 16
    if (font.getUint32(entry) !== 0x4f532f32) continue // OS/2
    const flags = font.getUint16(font.getUint32(entry + 8) + 8)
    return flags === 0 || flags === 8
  }
  return false
}

export async function loadReportFonts() {
  const browser = window as LocalFontWindow
  if (!browser.queryLocalFonts) {
    throw new ReportFontError('PDF export uses the installed Segoe UI font. Open MUC in desktop Chrome or Edge with Segoe UI installed.')
  }

  let fonts: LocalFont[]
  try {
    fonts = await browser.queryLocalFonts({ postscriptNames: faces.map(([name]) => name) })
  } catch {
    throw new ReportFontError('Allow local font access in your browser to export a Segoe UI PDF.')
  }

  return Promise.all(faces.map(async ([name, style]) => {
    const font = fonts.find((item) => item.postscriptName === name)
    if (!font) throw new ReportFontError('Install Segoe UI Regular and Bold on this device to export a PDF.')
    const bytes = await (await font.blob()).arrayBuffer()
    if (!canSubset(bytes)) throw new ReportFontError('This Segoe UI font does not permit subset embedding in the PDF.')
    const base64 = btoa(Array.from(new Uint8Array(bytes), (byte) => String.fromCharCode(byte)).join(''))
    return { filename: name + '.ttf', style, base64 }
  }))
}
