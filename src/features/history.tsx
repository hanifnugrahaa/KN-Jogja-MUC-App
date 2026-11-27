import { Copy, FileSearch, History, Pencil, Search, Share2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { assess, formatDate } from '@/lib/evaluation'
import type { SavedEvaluation } from '@/lib/evaluation'
import { RecommendationBadge } from './summary'

export const PUBLIC_PAGE_SIZE = 5

type PublicControls = {
  query: string; oldest: boolean; page: number; total: number; pending: boolean
  onQuery: (query: string) => void; onSort: (oldest: boolean) => void; onPage: (page: number) => void
}

export function EvaluationHistory({ records, onEdit, onDuplicate, onPreview, onDelete, onNew, onShare, publicControls }: {
  records: SavedEvaluation[]; onEdit?: (row: SavedEvaluation) => void; onDuplicate?: (row: SavedEvaluation) => void
  onPreview: (row: SavedEvaluation) => void; onDelete?: (row: SavedEvaluation) => void; onNew?: () => void; onShare?: (row: SavedEvaluation) => void; publicControls?: PublicControls
}) {
  const [localQuery, setLocalQuery] = useState('')
  const query = publicControls?.query ?? localQuery
  const term = query.trim().toLowerCase()
  const matches = publicControls ? records : records.filter(({ evaluation }) =>
    [evaluation.candidate, evaluation.topic, evaluation.evaluator, evaluation.branch].some((value) => value.toLowerCase().includes(term)),
  )
  const noMatches = publicControls ? !!term : records.length > 0
  const pages = publicControls ? Math.ceil(publicControls.total / PUBLIC_PAGE_SIZE) : 0
  return (
    <Card className="workspace-card history-card">
      <CardHeader className="history-tools">
        <CardTitle>Saved Evaluations</CardTitle>
        <div className={publicControls ? 'public-results-tools' : undefined}>
          <div className="search">
            <Search size={17} />
            <Input aria-label="Search evaluations" placeholder={publicControls ? 'Search teacher, module, or branch' : 'Search evaluations…'}
              value={query} maxLength={publicControls ? 120 : undefined}
              onChange={(event) => (publicControls?.onQuery ?? setLocalQuery)(event.target.value)} />
          </div>
          {publicControls && (
            <Select value={publicControls.oldest ? 'oldest' : 'latest'} onValueChange={(value) => publicControls.onSort(value === 'oldest')}>
              <SelectTrigger className="public-sort-trigger" aria-label="Sort by evaluation date"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent aria-busy={publicControls?.pending || undefined}>
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
            <h2>{noMatches ? 'No matching evaluations' : onNew ? 'No saved evaluations yet' : 'No public evaluations yet'}</h2>
            {noMatches ? <p>Try another teacher, module, supervisor, or branch.</p>
              : onNew && <p>Complete and save an evaluation to see it here.</p>}
            {!records.length && onNew && <Button type="button" variant="outline" onClick={onNew}>Open evaluation form</Button>}
          </div>
        )}
        {publicControls && publicControls.total > 0 && (
          <nav className="public-pagination" aria-label="Evaluation pages">
            <span aria-live="polite">{publicControls.pending ? 'Updating results...' :
              'Showing ' + ((publicControls.page - 1) * PUBLIC_PAGE_SIZE + 1) + '-' +
              Math.min(publicControls.page * PUBLIC_PAGE_SIZE, publicControls.total) + ' of ' + publicControls.total}</span>
            {pages > 1 && (
              <div className="public-pagination-actions">
                <Button type="button" variant="outline" disabled={publicControls.pending || publicControls.page <= 1}
                  onClick={() => publicControls.onPage(publicControls.page - 1)}>Previous</Button>
                <span aria-label={'Page ' + publicControls.page + ' of ' + pages}>{publicControls.page} / {pages}</span>
                <Button type="button" variant="outline" disabled={publicControls.pending || publicControls.page >= pages}
                  onClick={() => publicControls.onPage(publicControls.page + 1)}>Next</Button>
              </div>
            )}
          </nav>
        )}
      </CardContent>
    </Card>
  )
}
