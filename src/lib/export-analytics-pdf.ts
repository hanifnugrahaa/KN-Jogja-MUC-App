import autoTable from 'jspdf-autotable'
import { brand } from './brand'
import { formatDate, totalWeight } from './evaluation'
import { boldFont, createBrandedPdf, pdfMargin, regularFont } from './pdf-letterhead'
import type { loadReportFonts } from './report-font'

type Metric = { label: string; value: number; detail: string }

export type AnalyticsPdfData = {
  teacher: string
  period: string
  average: number
  incomplete: boolean
  scores: { date: string; teacher: string; module: string; score: number }[]
  criteria: Metric[]
  recommendations: Metric[]
}

export async function createAnalyticsPdf(data: AnalyticsPdfData, fonts: Awaited<ReturnType<typeof loadReportFonts>>) {
  const doc = await createBrandedPdf('MUC ANALYTICS', fonts)
  const { scores, criteria, recommendations } = data
  const right = doc.internal.pageSize.getWidth() - pdfMargin
  const width = right - pdfMargin
  const ink = '#' + brand.ink
  const muted = '#' + brand.muted
  const blue = '#' + brand.blue
  const light = '#' + brand.light
  const border = '#' + brand.border

  doc.setFont(regularFont, 'normal').setFontSize(9).setTextColor(muted)
  const teacher = doc.splitTextToSize('Teacher: ' + data.teacher, width) as string[]
  doc.text(teacher, pdfMargin, 48)
  let y = 48 + teacher.length * 4
  doc.text('Period: ' + data.period, pdfMargin, y)
  if (data.incomplete) {
    y += 4
    doc.text('Some evaluations could not be loaded.', pdfMargin, y)
  }
  y += 5
  doc.setFillColor(light).rect(pdfMargin, y, width, 19, 'F')
  doc.text('Evaluations', pdfMargin + 5, y + 6).text('Average score', pdfMargin + width / 2, y + 6)
  doc.setFont(boldFont, 'normal').setFontSize(14).setTextColor(ink)
    .text(String(scores.length), pdfMargin + 5, y + 14)
    .text(`${data.average.toFixed(1)} / ${totalWeight}`, pdfMargin + width / 2, y + 14)
  y += 28

  doc.setFontSize(11).text('Scores by evaluation date', pdfMargin, y)
  const chartLeft = pdfMargin + 11
  const top = y + 5
  const height = 43
  const pointY = (score: number) => top + height * (1 - score / totalWeight)
  const pointX = (index: number) => scores.length === 1 ? (chartLeft + right) / 2 :
    chartLeft + (right - chartLeft) * index / (scores.length - 1)
  doc.setFont(regularFont, 'normal').setFontSize(8).setTextColor(muted).setDrawColor(border).setLineWidth(0.2)
  for (const score of [0, 25, 50, 75, totalWeight]) {
    doc.line(chartLeft, pointY(score), right, pointY(score))
    doc.text(String(score), chartLeft - 3, pointY(score) + 1, { align: 'right' })
  }
  doc.setDrawColor(blue).setFillColor(blue).setLineWidth(0.62)
  scores.forEach(({ score }, index) => {
    if (index > 0) doc.line(pointX(index - 1), pointY(scores[index - 1].score), pointX(index), pointY(score))
    if (scores.length <= 35) doc.circle(pointX(index), pointY(score), 0.85, 'F')
  })
  for (const index of new Set([0, Math.floor((scores.length - 1) / 2), scores.length - 1])) {
    const align = scores.length === 1 ? 'center' : index === 0 ? 'left' : index === scores.length - 1 ? 'right' : 'center'
    doc.text(formatDate(scores[index].date), pointX(index), top + height + 5, { align })
  }

  y = top + height + 16
  const columnWidth = (width - 10) / 2
  function drawBars(title: string, metrics: Metric[], max: number, x: number) {
    doc.setFont(boldFont, 'normal').setFontSize(11).setTextColor(ink).text(title, x, y)
    doc.setFont(regularFont, 'normal').setFontSize(8.5)
    metrics.forEach(({ label, value, detail }, index) => {
      const textY = y + 6 + index * 7
      doc.text(label, x, textY).text(detail, x + columnWidth, textY, { align: 'right' })
      doc.setFillColor(light).rect(x, textY + 1.7, columnWidth, 1.1, 'F')
      if (value > 0) doc.setFillColor(blue).rect(x, textY + 1.7, columnWidth * value / max, 1.1, 'F')
    })
  }
  drawBars('Average rating by criterion', criteria, 5, pdfMargin)
  drawBars('Recommendation breakdown', recommendations, scores.length, pdfMargin + columnWidth + 10)

  y += Math.max(criteria.length, recommendations.length) * 7 + 9
  doc.setFont(boldFont, 'normal').setFontSize(11).setTextColor(ink).text('Evaluation details', pdfMargin, y)
  autoTable(doc, {
    startY: y + 3,
    margin: { top: pdfMargin, right: pdfMargin, bottom: 19, left: pdfMargin },
    theme: 'plain', rowPageBreak: 'avoid',
    styles: { font: regularFont, fontSize: 8.5, cellPadding: 2, textColor: ink, lineColor: border, lineWidth: { bottom: 0.15 } },
    headStyles: { font: boldFont, fontStyle: 'normal', fillColor: light, textColor: blue },
    didParseCell: ({ section, column, cell }) => {
      if (section === 'head' && column.index === 3) cell.styles.halign = 'right'
    },
    columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 45 }, 3: { cellWidth: 22, halign: 'right' } },
    head: [['Date', 'Teacher', 'Module', 'Score']],
    body: scores.map(({ date, teacher, module, score }) => [formatDate(date), teacher, module, `${score} / ${totalWeight}`]),
  })

  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page).setFont(regularFont, 'normal').setFontSize(8).setTextColor(muted)
      .text('Koding Next · Internal Academic Analytics', pdfMargin, 287)
      .text(`${page} / ${doc.getNumberOfPages()}`, right, 287, { align: 'right' })
  }
  return doc
}
