import autoTable from 'jspdf-autotable'
import type { UserOptions } from 'jspdf-autotable'
import { brand } from './brand'
import type { loadReportFonts } from './report-font'
import { boldFont, createBrandedPdf, pdfMargin, regularFont } from './pdf-letterhead'
import { reportColumns } from './report'
import type { Report } from './report'

export async function createPdf(report: Report, fonts: Awaited<ReturnType<typeof loadReportFonts>>) {
  const doc = await createBrandedPdf(brand.title, fonts)
  const margin = pdfMargin
  const ink = '#' + brand.ink
  const muted = '#' + brand.muted
  const blue = '#' + brand.blue
  const border = '#' + brand.border
  const light = '#' + brand.light

  const styles = { font: regularFont, fontSize: 9, cellPadding: 2.4, textColor: ink }
  const margins = { top: 17, right: margin, bottom: 21, left: margin }
  let y = 46
  const didParseCell: UserOptions['didParseCell'] = ({ cell }) => {
    if (cell.styles.fontStyle === 'bold') {
      cell.styles.font = boldFont
      cell.styles.fontStyle = 'normal'
    }
  }
  const didDrawPage: UserOptions['didDrawPage'] = ({ cursor }) => { if (cursor) y = cursor.y }
  autoTable(doc, {
    startY: y, didDrawPage, didParseCell, margin: margins, theme: 'plain', styles,
    body: report.details, columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' } },
  })
  autoTable(doc, {
    startY: y + 5, didDrawPage, margin: margins, theme: 'plain', styles: { ...styles, lineColor: border, lineWidth: { bottom: 0.16 } },
    head: [reportColumns], body: report.rows,
    headStyles: { fillColor: light, textColor: blue, fontStyle: 'bold' },
    didParseCell: (data) => {
      didParseCell?.(data)
      if (data.section === 'head' && data.column.index > 0) data.cell.styles.halign = 'center'
    },
    columnStyles: { 1: { cellWidth: 22, halign: 'center' }, 2: { cellWidth: 22, halign: 'center' }, 3: { cellWidth: 36, halign: 'center' } },
  })
  autoTable(doc, {
    startY: y + 6, didDrawPage, margin: margins, theme: 'plain', styles,
    body: [['Final Score', report.score], ['Recommendation', report.recommendation]],
    columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' } },
    didParseCell: (data) => {
      if (data.row.index === 0) {
        data.cell.styles.fillColor = light
        data.cell.styles.fontStyle = 'bold'
        if (data.column.index === 1) data.cell.styles.textColor = blue
      }
      didParseCell?.(data)
    },
    pageBreak: 'avoid',
  })
  autoTable(doc, {
    startY: y + 5, didDrawPage, didParseCell, margin: margins, theme: 'plain',
    head: [['Supervisor Notes']], body: [[report.notes]],
    styles: { ...styles, fillColor: '#FFFFFF', lineColor: border, lineWidth: 0.15 },
    headStyles: { textColor: blue, lineWidth: { top: 0.15, left: 0.15, right: 0.15 } },
  })

  const right = 193
  const evaluator = doc.setFont(boldFont, 'normal').setFontSize(9).splitTextToSize(report.evaluator, 95) as string[]
  const lineOffset = report.signature ? 21 : 12
  const nameOffset = lineOffset + 5
  const roleOffset = nameOffset + evaluator.length * 4
  y += 9
  if (y + roleOffset > 275) {
    doc.addPage()
    y = 19
  }
  doc.setTextColor(ink).text('Supervisor Signature', right, y, { align: 'right' })
  if (report.signature) {
    const { width, height, dataUrl } = report.signature
    const scale = Math.min(42 / width, 15 / height)
    doc.addImage(dataUrl, 'PNG', right - width * scale, y + 3, width * scale, height * scale)
  } else {
    doc.setDrawColor(border).setLineWidth(0.35).line(right - 62, y + lineOffset, right, y + lineOffset)
  }
  doc.text(evaluator, right, y + nameOffset, { align: 'right' })
  if (report.evaluatorRole) {
    doc.setFont(regularFont, 'normal').setFontSize(8).setTextColor(muted)
      .text(report.evaluatorRole, right, y + roleOffset, { align: 'right' })
  }

  if (doc.getNumberOfPages() > 1) {
    doc.setFont(regularFont, 'normal').setTextColor(muted).setFontSize(8)
    for (let page = 1; page <= doc.getNumberOfPages(); page++) {
      doc.setPage(page)
      doc.text(String(page), right, 286, { align: 'right' })
    }
  }
  return doc
}
