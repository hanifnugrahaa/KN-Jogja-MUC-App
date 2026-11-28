import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { assess, formatDate, recommendations, rubric, totalWeight } from '@/lib/evaluation'
import type { SavedEvaluation } from '@/lib/evaluation'
import { loadDirectory } from '@/lib/storage'

const monthsFormat = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const monthLabel = (month: string) => monthsFormat.format(new Date(`${month}-01T00:00:00Z`))
const teacherKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase()

type Bar = { id: string; label: string; value: number; detail: string }

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

export function Analytics({ records }: { records: SavedEvaluation[] }) {
  const [teacher, setTeacher] = useState<string | undefined>()
  const [month, setMonth] = useState('all')
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

  return (
    <div className="grid gap-4">
      <Card className="workspace-card">
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        <BarChart title="Scores by evaluation date" max={totalWeight} values={matching.map(({ id, evaluation, result }) => ({
          id, label: `${formatDate(evaluation.date)} · ${selectedTeacher ? evaluation.topic : evaluation.candidate}`,
          value: result.score, detail: `${result.score} / ${totalWeight}`,
        }))} />
        <div className="grid gap-4 lg:grid-cols-2">
          <BarChart title="Average rating by criterion" max={5} values={rubric.map(({ id, label }, index) => {
            const value = matching.reduce((sum, { result }) => sum + (result.breakdown[index].rating ?? 0), 0) / count
            return { id, label, value, detail: `${value.toFixed(1)} / 5` }
          }).sort((a, b) => a.value - b.value)} />
          <BarChart title="Recommendation breakdown" max={count} values={recommendations.map((label) => {
            const value = matching.filter(({ result }) => result.recommendation === label).length
            return { id: label, label, value, detail: String(value) }
          })} />
        </div>
      </>}
    </div>
  )
}
