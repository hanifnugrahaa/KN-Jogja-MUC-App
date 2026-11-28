import { jsPDF } from 'jspdf'
import { brand } from './brand'
import { reportLogo } from './report'
import type { loadReportFonts } from './report-font'

export const regularFont = 'SegoeUI'
export const boldFont = 'SegoeUI-Bold'
export const pdfMargin = 17

const defaultTheme = {
  regular: regularFont, bold: boldFont, ink: '#' + brand.ink, muted: '#' + brand.muted, accent: '#' + brand.blue, titleSize: 17,
}

export async function createBrandedPdf(title: string, fonts: Awaited<ReturnType<typeof loadReportFonts>>, theme = defaultTheme) {
  const doc = new jsPDF({ format: 'a4', compress: true, putOnlyUsedFonts: true })
  for (const { filename, style, base64 } of fonts) {
    doc.addFileToVFS(filename, base64)
    doc.addFont(filename, style === 'bold' ? theme.bold : theme.regular, 'normal')
  }
  const logo = await reportLogo()
  const right = doc.internal.pageSize.getWidth() - pdfMargin
  doc.setProperties({ title, author: brand.name })
  doc.addImage(logo, 'PNG', pdfMargin, 12, 27, 27 / brand.logoRatio)
  doc.setFont(theme.regular, 'normal').setFontSize(9).setTextColor(theme.muted)
    .text(brand.letterhead, right, 21, { align: 'right' })
  doc.setDrawColor(theme.accent).setLineWidth(0.36).line(pdfMargin, 29, right, 29)
  doc.setFont(theme.bold, 'normal').setFontSize(theme.titleSize).setTextColor(theme.ink).text(title, pdfMargin, 41)
  return doc
}
