import { Download, FileText } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { brand } from '@/lib/brand'
import { reportColumns, reportFilename } from '@/lib/report'
import type { Report } from '@/lib/report'

export function ReportPreview({ report, onClose }: { report: Report | null; onClose: () => void }) {
  const [busy, setBusy] = useState<'pdf' | 'docx' | null>(null)

  async function download(format: 'pdf' | 'docx') {
    if (!report) return
    setBusy(format)
    const candidate = report.details[0][1]
    try {
      let blob: Blob
      if (format === 'pdf') {
        const { createPdf } = await import('@/lib/export-pdf')
        blob = (await createPdf(report)).output('blob')
      } else {
        const { createWord } = await import('@/lib/export-word')
        blob = await createWord(report)
      }
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = reportFilename(candidate, format)
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.success(format === 'pdf' ? 'PDF downloaded' : 'Word document downloaded')
    } catch {
      toast.error('Could not generate the document. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Dialog open={!!report} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="preview-dialog">
        <DialogHeader>
          <DialogTitle>Document Preview</DialogTitle>
          <DialogDescription>Review the evaluation before downloading the report.</DialogDescription>
        </DialogHeader>
        {report && (
          <div className="paper-scroll" tabIndex={0} aria-label="Report preview content">
            <article className="paper">
              <header className="paper-letterhead"><img src={brand.logo} alt={brand.name} /><span>PT Ruang Kelas Indonesia</span></header>
              <h2>{brand.title}</h2>
              <dl className="paper-details">{report.details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
              <table className="paper-rubric">
                <thead><tr>{reportColumns.map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
                <tbody>{report.rows.map(([label, ...values]) => <tr key={label}><th scope="row">{label}</th>{values.map((value, index) => <td key={index}>{value}</td>)}</tr>)}</tbody>
              </table>
              <dl className="paper-outcome"><div><dt>Final Score</dt><dd>{report.score}</dd></div><div><dt>Recommendation</dt><dd>{report.recommendation}</dd></div></dl>
              <h3>Evaluator Notes</h3>
              <p className="paper-notes">{report.notes}</p>
              <h3>Evaluator Signature</h3>
              <p className="paper-signature">{report.evaluator}</p>
              <footer>{brand.footer}</footer>
            </article>
          </div>
        )}
        <DialogFooter className="preview-actions">
          <Button type="button" variant="outline" disabled={!!busy} onClick={() => void download('docx')}><FileText /> {busy === 'docx' ? 'Generating Word…' : 'Download Word'}</Button>
          <Button type="button" disabled={!!busy} onClick={() => void download('pdf')}><Download /> {busy === 'pdf' ? 'Generating PDF…' : 'Download PDF'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
