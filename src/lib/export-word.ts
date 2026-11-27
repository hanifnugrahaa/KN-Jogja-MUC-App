import {
  AlignmentType, BorderStyle, Document, HeadingLevel, ImageRun, Packer,
  Paragraph, Table, TableCell, TableRow, TextRun, WidthType,
} from 'docx'
import type { IParagraphOptions } from 'docx'
import { brand } from './brand'
import { reportFontFamily } from './report-font'
import { reportColumns, reportLogo } from './report'
import type { Report } from './report'

function paragraph(text: string, options: { bold?: boolean; color?: string; size?: number; after?: number; keepNext?: boolean; alignment?: IParagraphOptions["alignment"] } = {}) {
  const { bold = false, color = brand.ink, size = 20, after = 65, keepNext = false, alignment } = options
  return new Paragraph({ alignment, spacing: { after }, keepNext, children: [new TextRun({ text, bold, color, size })] })
}

const rowRule = { style: BorderStyle.SINGLE, color: brand.border, size: 4 } as const

function table(rows: string[][], widths: number[], header = false, outcome = false) {
  return new Table({
    width: { size: widths.reduce((sum, width) => sum + width, 0), type: WidthType.DXA },
    columnWidths: widths,
    margins: { top: 60, bottom: 40, left: 110, right: 100 },
    rows: rows.map((row, index) => {
      const isHeader = index === 0 && header
      const isFinalScore = index === 0 && outcome
      return new TableRow({
        tableHeader: isHeader, cantSplit: true,
        children: row.map((cell, column) => new TableCell({
          width: { size: widths[column], type: WidthType.DXA },
          shading: { fill: isHeader || isFinalScore ? brand.light : 'FFFFFF' },
          children: [paragraph(cell, {
            bold: isHeader || isFinalScore || (!header && column === 0),
            color: isHeader || (isFinalScore && column > 0) ? brand.blue : brand.ink,
            alignment: header && column > 0 ? AlignmentType.CENTER : undefined,
            after: 0,
          })],
        })),
      })
    }),
    borders: {
      top: { style: BorderStyle.NONE }, bottom: header ? rowRule : { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideHorizontal: header ? rowRule : { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
    },
  })
}

export async function createWord(report: Report) {
  const logo = await reportLogo()
  const rule = { style: BorderStyle.SINGLE, color: brand.blue, size: 8, space: 6 } as const
  const notes = new Table({
    width: { size: 9986, type: WidthType.DXA },
    margins: { top: 115, bottom: 85, left: 135, right: 135 },
    borders: { top: rowRule, bottom: rowRule, left: rowRule, right: rowRule },
    rows: [new TableRow({
      children: [new TableCell({
        children: [
          paragraph('Supervisor Notes', { bold: true, color: brand.blue, keepNext: true }),
          ...report.notes.split(/\r?\n/).map((line) => paragraph(line)),
        ],
      })],
    })],
  })
  const alignment = AlignmentType.RIGHT
  const signature = report.signature
  const signatureScale = signature ? Math.min(155 / signature.width, 56 / signature.height) : 0
  const signatureLine = signature ? new Paragraph({
    alignment, keepNext: true, spacing: { after: 20 },
    children: [new ImageRun({
      type: 'png', data: signature.dataUrl,
      transformation: { width: Math.round(signature.width * signatureScale), height: Math.round(signature.height * signatureScale) },
      altText: { title: report.evaluator, description: 'Supervisor Signature', name: 'Supervisor Signature' },
    })],
  }) : null
  const signoff = [
    paragraph('Supervisor Signature', { alignment, bold: true, after: signatureLine ? 60 : 365, keepNext: true }),
    signatureLine ?? paragraph('________________________________', { alignment, color: brand.muted, keepNext: true }),
    paragraph(report.evaluator, { alignment, bold: true, keepNext: !!report.evaluatorRole, after: 25 }),
    ...(report.evaluatorRole ? [paragraph(report.evaluatorRole, { alignment, color: brand.muted, size: 17 })] : []),
  ]
  const doc = new Document({
    title: brand.title, creator: brand.name,
    styles: { default: { document: { run: { font: reportFontFamily, size: 20, color: brand.ink }, paragraph: { spacing: { line: 255 } } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 800, bottom: 850, left: 960, right: 960, footer: 420 } } },
      children: [
        new Paragraph({
          children: [new ImageRun({
            type: 'png', data: logo, transformation: { width: 102, height: Math.round(102 / brand.logoRatio) },
            altText: { title: brand.name, description: 'Koding Next logo', name: 'Koding Next' },
          })],
          alignment: AlignmentType.LEFT,
          spacing: { after: 120 },
        }),
        new Paragraph({ border: { bottom: rule }, spacing: { after: 240 }, children: [new TextRun({ text: brand.letterhead, color: brand.muted, size: 17 })] }),
        new Paragraph({
          heading: HeadingLevel.TITLE, keepNext: true, spacing: { after: 220 },
          children: [new TextRun({ text: brand.title, font: reportFontFamily, bold: true, color: brand.ink, size: 32 })],
        }),
        table(report.details, [2400, 7586]),
        new Paragraph({ spacing: { after: 45 } }),
        table([reportColumns, ...report.rows], [4850, 1250, 1450, 2436], true),
        new Paragraph({ spacing: { after: 45 } }),
        table([['Final Score', report.score], ['Recommendation', report.recommendation]], [2400, 7586], false, true),
        new Paragraph({ spacing: { after: 45 }, keepNext: true }),
        notes,
        new Paragraph({ spacing: { after: 55 }, keepNext: true }),
        ...signoff,
      ],
    }],
  })
  return Packer.toBlob(doc)
}
