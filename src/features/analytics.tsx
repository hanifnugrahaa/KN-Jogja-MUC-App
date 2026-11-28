import { Download } from 'lucide-react'
import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { assess, formatDate, recommendations, rubric, totalWeight } from '@/lib/evaluation'
import type { SavedEvaluation } from '@/lib/evaluation'
import { reportFilename } from '@/lib/report'
import { loadReportFonts, ReportFontError } from '@/lib/report-font'
import { loadDirectory } from '@/lib/storage'

const monthsFormat = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const axisDateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const monthLabel = (month: string) => monthsFormat.format(new Date(`${month}-01T00:00:00Z`))
const teacherKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase()

type Bar = { id: string; label: string; value: number; detail: string }
type ScorePoint = { id: string; date: string; teacher: string; module: string; score: number }

function ScoreChart({ values }: { values: ScorePoint[] }) {
  const points = new Map(values.map((point) => [point.id, point]))
  return (
    <Card className="workspace-card min-w-0">
      <CardHeader><CardTitle><h2 id="analytics-score-title">Scores by evaluation date</h2></CardTitle></CardHeader>
      <CardContent>
        <div className="h-60 min-w-0 sm:h-72" role="group" aria-labelledby="analytics-score-title">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={values} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} accessibilityLayer
              title="Evaluation scores out of 100" desc="Each point is one evaluation. Use the left and right arrow keys to read the scores.">
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
              <XAxis dataKey="id" axisLine={false} tickLine={false} tickMargin={8} minTickGap={22} interval="preserveStartEnd"
                padding={{ left: 10, right: 10 }} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                tickFormatter={(id: string) => {
                  const point = points.get(id)
                  return point ? axisDateFormat.format(new Date(`${point.date}T00:00:00Z`)) : ''
                }} />
              <YAxis domain={[0, totalWeight]} ticks={[0, 25, 50, 75, 100]} width={34} axisLine={false} tickLine={false} tickMargin={5}
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <Tooltip
                trigger={window.matchMedia('(hover: none)').matches ? 'click' : 'hover'}
                defaultIndex={values.length === 1 ? 0 : undefined} isAnimationActive={false}
                cursor={{ stroke: 'var(--border)' }}
                contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: 6, fontSize: 12, whiteSpace: 'normal', maxWidth: 200 }}
                labelFormatter={(id) => {
                  const point = points.get(String(id))
                  return point && <>{formatDate(point.date)}<br />{point.teacher} · {point.module}</>
                }}
                formatter={(value) => [`${value} / ${totalWeight}`, 'Score']} />
              <Line type="linear" dataKey="score" stroke="var(--primary)" strokeWidth={2.5}
                dot={values.length <= 36 ? { r: 3.5, fill: 'var(--primary)', stroke: 'var(--card)', strokeWidth: 1 } : false}
                activeDot={{ r: 5 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function BarChart({ title, values, max }: { title: string; values: Bar[]; max: number }) {
  return (
    <Card className="workspace-card min-w-0">
      <CardHeader><CardTitle><h2>{title}</h2></CardTitle></CardHeader>
      <CardContent>
        <ul aria-label={title} tabIndex={values.length > 8 ? 0 : undefined} className="max-h-88 space-y-3 overflow-auto">
          {values.map(({ id, label, value, detail }) => (
            <li key={id}>
              <div className="mb-1 flex justify-between gap-3 text-sm">
                <span className="min-w-0 wrap-break-word">{label}</span>
                <strong className="shrink-0 tabular-nums">{detail}</strong>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div className="h-full rounded-full bg-primary" style={{ width: `${value / max * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export default function Analytics({ records, incomplete }: { records: SavedEvaluation[]; incomplete: boolean }) {
  const [teacher, setTeacher] = useState<string | undefined>()
  const [month, setMonth] = useState('all')
  const [exporting, setExporting] = useState(false)
  const [directory] = useState(() => loadDirectory('teacher'))
  const teachers = new Map(records.map(({ evaluation }) => [teacherKey(evaluation.candidate), evaluation.candidate]))
  for (const { name } of directory) teachers.set(teacherKey(name), name)
  const selectedTeacher = teacher && teachers.has(teacher) ? teacher : undefined
  const teacherRecords = records.filter(({ evaluation }) => !selectedTeacher || teacherKey(evaluation.candidate) === selectedTeacher)
  const months = [...new Set(teacherRecords.map(({ evaluation }) => evaluation.date.slice(0, 7)))].sort().reverse()
  const selectedMonth = months.includes(month) ? month : 'all'
  const matching = teacherRecords.filter(({ evaluation }) => selectedMonth === 'all' || evaluation.date.startsWith(selectedMonth))
    .sort((a, b) => a.evaluation.date.localeCompare(b.evaluation.date) || a.savedAt.localeCompare(b.savedAt))
    .map((record) => ({ ...record, result: assess(record.evaluation, record.thresholds) }))
  const count = matching.length
  const average = count ? matching.reduce((sum, { result }) => sum + result.score, 0) / count : 0
  const scores = matching.map(({ id, evaluation, result }) => ({
    id, date: evaluation.date, teacher: evaluation.candidate, module: evaluation.topic, score: result.score,
  }))
  const criteria = count ? rubric.map(({ id, label }, index) => {
    const value = matching.reduce((sum, { result }) => sum + (result.breakdown[index].rating ?? 0), 0) / count
    return { id, label, value, detail: `${value.toFixed(1)} / 5` }
  }).sort((a, b) => a.value - b.value) : []
  const distribution = recommendations.map((label) => {
    const value = matching.filter(({ result }) => result.recommendation === label).length
    return { id: label, label, value, detail: String(value) }
  })

  async function exportPdf() {
    setExporting(true)
    const teacherName = (selectedTeacher && teachers.get(selectedTeacher)) || 'All teachers'
    const period = selectedMonth === 'all' ? 'All months' : monthLabel(selectedMonth)
    try {
      const [fonts, { createAnalyticsPdf }] = await Promise.all([loadReportFonts(), import('@/lib/export-analytics-pdf')])
      const pdf = await createAnalyticsPdf({ teacher: teacherName, period, average, incomplete, scores, criteria, recommendations: distribution }, fonts)
      pdf.save(reportFilename(`Analytics-${teacherName}-${period}`, 'pdf'))
      toast.success('Analytics PDF downloaded')
    } catch (error) {
      toast.error(error instanceof ReportFontError ? error.message : 'Could not export analytics. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="grid gap-4">
      <Card className="workspace-card">
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <div className="field">
            <Label htmlFor="analytics-teacher">Teacher</Label>
            <Select value={selectedTeacher ? `teacher:${selectedTeacher}` : 'all'} onValueChange={(value) => {
              setTeacher(value === 'all' ? undefined : value.slice('teacher:'.length))
              setMonth('all')
            }}>
              <SelectTrigger id="analytics-teacher" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="all">All teachers</SelectItem>
                {[...teachers].sort(([, a], [, b]) => a.localeCompare(b)).map(([key, name]) =>
                  <SelectItem key={key} value={`teacher:${key}`}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="field">
            <Label htmlFor="analytics-month">Month</Label>
            <Select value={selectedMonth} onValueChange={setMonth}>
              <SelectTrigger id="analytics-month" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="all">All months</SelectItem>
                {months.map((value) => <SelectItem key={value} value={value}>{monthLabel(value)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" disabled={!count || exporting} onClick={() => void exportPdf()}>
            <Download aria-hidden="true" />{exporting ? 'Exporting…' : 'Export PDF'}
          </Button>
        </CardContent>
      </Card>
      {count === 0 ? <div className="empty-state"><h2>No evaluations to chart yet</h2></div> : <>
        <Card className="workspace-card">
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <div><dt className="text-sm text-muted-foreground">Evaluations</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{count}</dd></div>
              <div><dt className="text-sm text-muted-foreground">Average score</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{average.toFixed(1)}<span className="ml-1 text-sm text-muted-foreground">/ {totalWeight}</span></dd></div>
            </dl>
          </CardContent>
        </Card>
        <ScoreChart key={`${selectedTeacher ?? ''}:${selectedMonth}`} values={scores} />
        <div className="grid gap-4 lg:grid-cols-2">
          <BarChart title="Average rating by criterion" max={5} values={criteria} />
          <BarChart title="Recommendation breakdown" max={count} values={distribution} />
        </div>
      </>}
    </div>
  )
}
