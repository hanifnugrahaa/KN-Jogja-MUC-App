import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Download, FileText, Info } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { brand } from '@/lib/brand'
import { loadReportFonts, ReportFontError } from '@/lib/report-font'
import { reportColumns, reportFilename } from '@/lib/report'
import type { Report } from '@/lib/report'

export function ReportPreview({ report, onClose }: { report: Report | null; onClose: () => void }) {
  const paper = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState<'pdf' | 'docx' | null>(null)

  async function download(format: 'pdf' | 'docx') {
    if (!report) return
    setBusy(format)
    const candidate = report.details[0][1]
    try {
      let blob: Blob
      if (format === 'pdf') {
        const [fonts, { createPdf }] = await Promise.all([loadReportFonts(), import('@/lib/export-pdf')])
        blob = (await createPdf(report, fonts)).output('blob')
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
    } catch (error) {
      toast.error(error instanceof ReportFontError ? error.message : 'Could not generate the document. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Dialog open={!!report} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="preview-dialog" onOpenAutoFocus={(event) => {
        if (paper.current) { event.preventDefault(); paper.current.focus() }
      }}>
        <DialogHeader>
          <div className="flex items-center gap-1.5">
            <DialogTitle>Document Preview</DialogTitle>
            <TooltipProvider delayDuration={160}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="guidance" aria-label="Document preview information"><Info size={15} /></button>
                </TooltipTrigger>
                <TooltipContent>Review the evaluation before downloading the report.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <DialogDescription className="sr-only">Review the evaluation before downloading the report.</DialogDescription>
        </DialogHeader>
        {report && (
          <div ref={paper} className="paper-scroll" tabIndex={0} aria-label="Report preview content">
            <article className="paper">
              <header className="paper-letterhead"><img src={brand.logo} alt={brand.name} /><span>{brand.letterhead}</span></header>
              <h2>{brand.title}</h2>
              <dl className="paper-details">{report.details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
              <table className="paper-rubric">
                <thead><tr>{reportColumns.map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
                <tbody>{report.rows.map(([label, ...values]) => <tr key={label}><th scope="row">{label}</th>{values.map((value, index) => <td key={index}>{value}</td>)}</tr>)}</tbody>
              </table>
              <dl className="paper-outcome"><div><dt>Final Score</dt><dd>{report.score}</dd></div><div><dt>Recommendation</dt><dd>{report.recommendation}</dd></div></dl>
              <section className="paper-notes-card">
                <h3>Supervisor Notes</h3>
                <p className="paper-notes">{report.notes}</p>
              </section>
              <section className="paper-signature-block">
                <h3>Supervisor Signature</h3>
                {report.signature && <img className="paper-signature-image" src={report.signature.dataUrl} alt={'Signature of ' + report.evaluator} />}
                <p className="paper-signature">{report.evaluator}</p>
                {report.evaluatorRole && <p className="paper-signature-role">{report.evaluatorRole}</p>}
              </section>
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
