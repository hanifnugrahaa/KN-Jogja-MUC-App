import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { UserOptions } from 'jspdf-autotable'
import { brand } from './brand'
import { reportColumns, reportLogo } from './report'
import type { Report } from './report'

export async function createPdf(report: Report) {
  const doc = new jsPDF({ format: 'a4', compress: true })
  const logo = await reportLogo()
  const margin = 17
  const ink = '#' + brand.ink
  const muted = '#' + brand.muted
  const blue = '#' + brand.blue
  const border = '#' + brand.border
  const navy = '#' + brand.navy
  doc.setProperties({ title: brand.title, author: brand.name })
  doc.addImage(logo, 'PNG', margin, 12, 27, 27 / brand.logoRatio)
  doc.setFontSize(9).setTextColor(muted).text('PT Ruang Kelas Indonesia', 193, 21, { align: 'right' })
  doc.setDrawColor(blue).setLineWidth(0.65).line(margin, 29, 193, 29)
  doc.setFont('helvetica', 'bold').setFontSize(17).setTextColor(ink).text(brand.title, margin, 41)

  const styles = { fontSize: 9, cellPadding: 2.4, textColor: ink }
  const margins = { top: 17, right: margin, bottom: 21, left: margin }
  let y = 46
  const didDrawPage: UserOptions['didDrawPage'] = ({ cursor }) => { if (cursor) y = cursor.y }
  autoTable(doc, {
    startY: y, didDrawPage, margin: margins, theme: 'plain', styles,
    body: report.details, columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' } },
  })
  autoTable(doc, {
    startY: y + 4, didDrawPage, margin: margins, theme: 'striped', styles,
    head: [reportColumns], body: report.rows,
    headStyles: { fillColor: navy, textColor: '#FFFFFF', fontSize: 9 },
    didParseCell: ({ cell, column, section }) => { if (section === 'head' && column.index > 0) cell.styles.halign = 'center' },
    columnStyles: { 1: { cellWidth: 22, halign: 'center' }, 2: { cellWidth: 22, halign: 'center' }, 3: { cellWidth: 36, halign: 'center' } },
  })
  autoTable(doc, {
    startY: y + 5, didDrawPage, margin: margins, theme: 'plain', styles: { ...styles, fillColor: '#' + brand.light },
    body: [['Final Score', report.score], ['Recommendation', report.recommendation]],
    columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' } },
    pageBreak: 'avoid',
  })
  autoTable(doc, {
    startY: y + 5, didDrawPage, margin: margins, theme: 'plain',
    head: [['Evaluator Notes']], body: [[report.notes]], styles,
    headStyles: { textColor: navy },
  })

  y += 10
  if (y + 23 > 276) {
    doc.addPage()
    y = 19
  }
  const evaluator = doc.setFontSize(9).splitTextToSize(report.evaluator, 120) as string[]
  doc.setFont('helvetica', 'bold').setTextColor(ink).text('Evaluator Signature', margin, y)
  doc.setDrawColor(border).setLineWidth(0.35).line(margin, y + 12, 83, y + 12)
  doc.setFont('helvetica', 'normal').text(evaluator, margin, y + 17)

  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page)
    doc.setDrawColor(border).setLineWidth(0.3).line(margin, 281, 193, 281)
    doc.setTextColor(muted).setFontSize(8).text(brand.footer, margin, 286)
    doc.text(String(page), 193, 286, { align: 'right' })
  }
  return doc
}
