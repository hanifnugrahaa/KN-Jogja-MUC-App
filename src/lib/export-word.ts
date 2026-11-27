import {
  AlignmentType, BorderStyle, Document, Footer, HeadingLevel, ImageRun, Packer,
  Paragraph, Table, TableCell, TableRow, TextRun, WidthType,
} from 'docx'
import { brand } from './brand'
import { reportColumns, reportLogo } from './report'
import type { Report } from './report'

function paragraph(text: string, options: { bold?: boolean; color?: string; size?: number; after?: number; keepNext?: boolean } = {}) {
  const { bold = false, color = brand.ink, size = 20, after = 65, keepNext = false } = options
  return new Paragraph({ spacing: { after }, keepNext, children: [new TextRun({ text, bold, color, size })] })
}

function table(rows: string[][], widths: number[], header = false, highlighted = false) {
  return new Table({
    width: { size: widths.reduce((sum, width) => sum + width, 0), type: WidthType.DXA },
    columnWidths: widths,
    margins: { top: 60, bottom: 40, left: 110, right: 100 },
    rows: rows.map((row, index) => {
      const isHeader = index === 0 && header
      return new TableRow({
        tableHeader: isHeader, cantSplit: true,
        children: row.map((cell, column) => new TableCell({
          width: { size: widths[column], type: WidthType.DXA },
          shading: { fill: isHeader ? brand.navy : (highlighted || (header && index % 2 === 0)) ? brand.light : 'FFFFFF' },
          children: [paragraph(cell, { bold: isHeader || (!header && column === 0), color: isHeader ? 'FFFFFF' : brand.ink, after: 0 })],
        })),
      })
    }),
    borders: {
      top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
    },
  })
}

export async function createWord(report: Report) {
  const logo = await reportLogo()
  const rule = { style: BorderStyle.SINGLE, color: brand.blue, size: 12, space: 6 } as const
  const signoff = [
    new Paragraph({ spacing: { before: 200, after: 365 }, keepNext: true, children: [new TextRun({ text: 'Evaluator Signature', bold: true })] }),
    new Paragraph({ keepNext: true, children: [new TextRun({ text: '________________________________', color: brand.muted })] }),
    paragraph(report.evaluator),
  ]
  const doc = new Document({
    title: brand.title, creator: brand.name,
    styles: { default: { document: { run: { font: 'Arial', size: 20, color: brand.ink }, paragraph: { spacing: { line: 255 } } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 800, bottom: 850, left: 960, right: 960, footer: 420 } } },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            border: { top: { ...rule, color: brand.border, size: 4 } },
            children: [new TextRun({ text: brand.footer, color: brand.muted, size: 17 })],
          })],
        })
      },
      children: [
        new Paragraph({
          children: [new ImageRun({
            type: 'png', data: logo, transformation: { width: 102, height: Math.round(102 / brand.logoRatio) },
            altText: { title: brand.name, description: 'Koding Next logo', name: 'Koding Next' },
          })],
          alignment: AlignmentType.LEFT,
          spacing: { after: 120 },
        }),
        new Paragraph({ border: { bottom: rule }, spacing: { after: 240 }, children: [new TextRun({ text: 'PT Ruang Kelas Indonesia', color: brand.muted, size: 17 })] }),
        new Paragraph({
          heading: HeadingLevel.TITLE, keepNext: true, spacing: { after: 220 },
          children: [new TextRun({ text: brand.title, bold: true, color: brand.ink, size: 32 })],
        }),
        table(report.details, [2400, 7586]),
        new Paragraph({ spacing: { after: 45 } }),
        table([reportColumns, ...report.rows], [4850, 1250, 1450, 2436], true),
        new Paragraph({ spacing: { after: 45 } }),
        table([['Final Score', report.score], ['Recommendation', report.recommendation]], [2400, 7586], false, true),
        new Paragraph({ spacing: { before: 190, after: 85 }, keepNext: true, children: [new TextRun({ text: 'Evaluator Notes', bold: true, color: brand.navy })] }),
        ...report.notes.split(/\r?\n/).map((line) => paragraph(line)),
        ...signoff,
      ],
    }],
  })
  return Packer.toBlob(doc)
}
