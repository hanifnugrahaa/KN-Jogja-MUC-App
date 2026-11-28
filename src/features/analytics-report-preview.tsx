import { Download, ExternalLink, FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import type { AnalyticsPdfData } from '@/lib/export-analytics-pdf'
import { reportFilename } from '@/lib/report'

function PdfPreview({ report }: { report: AnalyticsPdfData }) {
  const [pdf, setPdf] = useState<{ url: string; pages: number }>()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    let url: string | undefined

    void import('@/lib/export-analytics-pdf').then(({ createAnalyticsPdf }) => active ? createAnalyticsPdf(report) : undefined).then((result) => {
      if (!active || !result) return
      url = URL.createObjectURL(result.output('blob'))
      setPdf({ url, pages: result.getNumberOfPages() })
    }).catch(() => { if (active) setFailed(true) })

    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [report])

  return (
    <>
      <DialogHeader className="pr-8">
        <DialogTitle>Analytics Report Preview</DialogTitle>
        <DialogDescription className="wrap-break-word">
          {report.teacher} · {report.period}{pdf && ` · ${pdf.pages} ${pdf.pages === 1 ? 'page' : 'pages'}`}
        </DialogDescription>
      </DialogHeader>
      {failed ? <p role="alert" className="rounded-md bg-muted px-4 py-6">Could not prepare the report. Close the preview and try again.</p>
        : !pdf ? <p role="status" className="rounded-md bg-muted px-4 py-6">Preparing PDF preview…</p>
          : navigator.pdfViewerEnabled ? <iframe title="Analytics PDF preview" src={`${pdf.url}#toolbar=0&view=FitH`}
            className="h-[min(67dvh,740px)] w-full rounded-md border bg-muted" />
            : <p className="rounded-md bg-muted px-4 py-6">Choose Open PDF to preview the report in a new tab.</p>}
      {pdf && <DialogFooter className="flex-row flex-wrap justify-end">
        <Button asChild variant="outline">
          <a href={pdf.url} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" />Open PDF</a>
        </Button>
        <Button asChild>
          <a href={pdf.url} download={reportFilename(`Analytics-${report.teacher}-${report.period}`, 'pdf')}>
            <Download aria-hidden="true" />Download PDF
          </a>
        </Button>
      </DialogFooter>}
    </>
  )
}

export function AnalyticsReportPreview({ report }: { report: AnalyticsPdfData }) {
  const [open, setOpen] = useState(false)
  const [snapshot, setSnapshot] = useState<AnalyticsPdfData | null>(null)

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (next) setSnapshot(report)
      setOpen(next)
    }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={report.scores.length === 0}>
          <FileText aria-hidden="true" />Preview Report
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-4xl">
        {snapshot && <PdfPreview key={`${snapshot.teacher}:${snapshot.period}`} report={snapshot} />}
      </DialogContent>
    </Dialog>
  )
}
