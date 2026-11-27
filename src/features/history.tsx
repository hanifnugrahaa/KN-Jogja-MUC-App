import { Copy, FileSearch, History, Pencil, Search, Share2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { assess, formatDate } from '@/lib/evaluation'
import type { SavedEvaluation } from '@/lib/evaluation'
import { RecommendationBadge } from './summary'

export function EvaluationHistory({ records, onEdit, onDuplicate, onPreview, onDelete, onNew, onShare }: {
  records: SavedEvaluation[]; onEdit?: (row: SavedEvaluation) => void; onDuplicate?: (row: SavedEvaluation) => void
  onPreview: (row: SavedEvaluation) => void; onDelete?: (row: SavedEvaluation) => void; onNew?: () => void; onShare?: (row: SavedEvaluation) => void
}) {
  const [query, setQuery] = useState('')
  const term = query.trim().toLowerCase()
  const matches = records.filter(({ evaluation }) =>
    [evaluation.candidate, evaluation.topic, evaluation.evaluator, evaluation.branch].some((value) => value.toLowerCase().includes(term)),
  )
  return (
    <Card className="workspace-card history-card">
      <CardHeader className="history-tools">
        <CardTitle>Saved Evaluations</CardTitle>
        <div className="search">
          <Search size={17} />
          <Input aria-label="Search evaluations" placeholder="Search evaluations…" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
      </CardHeader>
      <CardContent>
        {matches.length ? (
          <Table className="history-table">
            <TableHeader>
              <TableRow><TableHead>Candidate / Topic</TableHead><TableHead>Evaluation Date</TableHead><TableHead>Score</TableHead><TableHead>Recommendation</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((record) => {
                const { evaluation } = record
                const result = assess(evaluation, record.thresholds)
                return (
                  <TableRow key={record.id}>
                    <TableCell><strong>{evaluation.candidate}</strong><div className="table-subtitle">{evaluation.topic}</div></TableCell>
                    <TableCell>{formatDate(evaluation.date)}<div className="table-subtitle">{evaluation.branch}</div></TableCell>
                    <TableCell><span className="history-score"><strong>{result.score}</strong><small>/100</small></span></TableCell>
                    <TableCell><RecommendationBadge value={result.recommendation} /></TableCell>
                    <TableCell>
                      <div className="history-actions">
                        {onEdit && <Button type="button" variant="ghost" size="icon" title="Edit" aria-label={'Edit ' + evaluation.candidate} onClick={() => onEdit(record)}><Pencil /></Button>}
                        {onDuplicate && <Button type="button" variant="ghost" size="icon" title="Duplicate" aria-label={'Duplicate ' + evaluation.candidate} onClick={() => onDuplicate(record)}><Copy /></Button>}
                        <Button type="button" variant="ghost" size="icon" title="Preview and export" aria-label={'Preview and export ' + evaluation.candidate} onClick={() => onPreview(record)} className={!onNew ? "public-report-control" : undefined}><FileSearch aria-hidden="true" />{!onNew && <span>Report</span>}</Button>
                        {onShare && <Button type="button" variant="ghost" size="icon" title="Publish Evaluation" aria-label={'Publish Evaluation: ' + evaluation.candidate} onClick={() => onShare(record)}><Share2 /></Button>}
                        {onDelete && <Button type="button" variant="ghost" size="icon" className="delete-action" title="Delete" aria-label={'Delete ' + evaluation.candidate} onClick={() => onDelete(record)}><Trash2 /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="empty-state">
            <span className="section-icon"><History /></span>
            <h2>{records.length ? 'No matching evaluations' : onNew ? 'No saved evaluations yet' : 'No public evaluations yet'}</h2>
            <p>{records.length ? 'Try another candidate, topic, evaluator, or branch.' : onNew ? 'Complete and save an evaluation to see it here.' : 'Evaluations will appear here once a trainer publishes them.'}</p>
            {!records.length && onNew && <Button type="button" variant="outline" onClick={onNew}>Open evaluation form</Button>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
