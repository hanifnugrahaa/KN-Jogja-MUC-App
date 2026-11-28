import autoTable from 'jspdf-autotable'
import regularSource from '@/assets/analytics-font/SourceSans3-Regular.ttf?url'
import semiboldSource from '@/assets/analytics-font/SourceSans3-Semibold.ttf?url'
import { formatDate, totalWeight } from './evaluation'
import { createBrandedPdf, pdfMargin } from './pdf-letterhead'

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

const theme = {
  regular: 'SourceSans3', bold: 'SourceSans3-Semibold', ink: '#163044', muted: '#4D6470', accent: '#116B68', titleSize: 24,
}
const light = '#EAF4F2'
const border = '#D7E4E5'

export async function createAnalyticsPdf(data: AnalyticsPdfData) {
  const fonts = await Promise.all(([
    [regularSource, 'SourceSans3-Regular.ttf', 'normal'], [semiboldSource, 'SourceSans3-Semibold.ttf', 'bold'],
  ] as const).map(async ([url, filename, style]) => {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Could not load the analytics font.')
    const bytes = new Uint8Array(await response.arrayBuffer())
    const base64 = btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))
    return { filename, style, base64 }
  }))
  const doc = await createBrandedPdf('Microteaching Analytics', fonts, theme)
  const { scores, criteria, recommendations } = data
  const right = doc.internal.pageSize.getWidth() - pdfMargin
  const width = right - pdfMargin
  const { regular: regularFont, bold: boldFont, ink, muted, accent } = theme

  const secondColumn = pdfMargin + (width + 6) / 2
  doc.setFont(regularFont, 'normal').setFontSize(8.5).setTextColor(muted)
    .text('Teacher', pdfMargin, 49).text('Reporting period', secondColumn, 49)
  doc.setFont(boldFont, 'normal').setFontSize(11).setTextColor(ink)
  const teacher = doc.splitTextToSize(data.teacher, secondColumn - pdfMargin - 7) as string[]
  doc.text(teacher, pdfMargin, 54).text(data.period, secondColumn, 54)
  let y = 54 + teacher.length * 4
  if (data.incomplete) {
    y += 4
    doc.setFont(regularFont, 'normal').setFontSize(8.5).setTextColor(muted)
      .text('Some evaluations could not be loaded.', pdfMargin, y)
  }
  y += 2
  const cardWidth = (width - 6) / 2
  doc.setFillColor(light).roundedRect(pdfMargin, y, cardWidth, 19, 1.5, 1.5, 'F')
    .roundedRect(secondColumn, y, cardWidth, 19, 1.5, 1.5, 'F')
  doc.setFont(regularFont, 'normal').setFontSize(9).setTextColor(muted)
    .text('Evaluations', pdfMargin + 5, y + 6).text('Average score', secondColumn + 5, y + 6)
  doc.setFont(boldFont, 'normal').setFontSize(17).setTextColor(accent)
    .text(String(scores.length), pdfMargin + 5, y + 15)
    .text(`${data.average.toFixed(1)} / ${totalWeight}`, secondColumn + 5, y + 15)
  y += 29

  doc.setFontSize(12).setTextColor(ink).text('Scores by evaluation date', pdfMargin, y)
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
  doc.setDrawColor(accent).setFillColor(accent).setLineWidth(0.62)
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
    doc.setFont(boldFont, 'normal').setFontSize(12).setTextColor(ink).text(title, x, y)
    doc.setFont(regularFont, 'normal').setFontSize(9)
    metrics.forEach(({ label, value, detail }, index) => {
      const textY = y + 6 + index * 7
      doc.text(label, x, textY).text(detail, x + columnWidth, textY, { align: 'right' })
      doc.setFillColor(light).rect(x, textY + 1.7, columnWidth, 1.1, 'F')
      if (value > 0) doc.setFillColor(accent).rect(x, textY + 1.7, columnWidth * value / max, 1.1, 'F')
    })
  }
  drawBars('Average rating by criterion', criteria, 5, pdfMargin)
  drawBars('Recommendation breakdown', recommendations, scores.length, pdfMargin + columnWidth + 10)

  y += Math.max(criteria.length, recommendations.length) * 7 + 9
  doc.setFont(boldFont, 'normal').setFontSize(12).setTextColor(ink).text('Evaluation details', pdfMargin, y)
  autoTable(doc, {
    startY: y + 3,
    margin: { top: pdfMargin, right: pdfMargin, bottom: 19, left: pdfMargin },
    theme: 'plain', rowPageBreak: 'avoid',
    styles: { font: regularFont, fontSize: 9, cellPadding: 2, textColor: ink, lineColor: border, lineWidth: { bottom: 0.15 } },
    headStyles: { font: boldFont, fontStyle: 'normal', fillColor: light, textColor: accent },
    didParseCell: ({ section, column, cell }) => {
      if (section === 'head' && column.index === 3) cell.styles.halign = 'right'
    },
    columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 45 }, 3: { cellWidth: 22, halign: 'right' } },
    head: [['Date', 'Teacher', 'Module', 'Score']],
    body: scores.map(({ date, teacher, module, score }) => [formatDate(date), teacher, module, `${score} / ${totalWeight}`]),
  })

  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page).setFont(regularFont, 'normal').setFontSize(8).setTextColor(muted)
      .setDrawColor(border).setLineWidth(0.25).line(pdfMargin, 282, right, 282)
      .text('Koding Next · Internal Academic Analytics', pdfMargin, 287)
      .text(`${page} / ${doc.getNumberOfPages()}`, right, 287, { align: 'right' })
  }
  return doc
}
