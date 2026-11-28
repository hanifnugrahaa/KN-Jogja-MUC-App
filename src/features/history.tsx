import { ChevronLeft, ChevronRight, Copy, FileSearch, History, Pencil, Search, Share2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem } from '@/components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { assess, formatDate } from '@/lib/evaluation'
import type { SavedEvaluation } from '@/lib/evaluation'
import { RecommendationBadge } from './summary'
import { ResultFiltersDialog, ResultSortHeading } from './result-controls'
import type { ResultFilters, ResultSort, ResultSortColumn } from './result-controls'

export const PUBLIC_PAGE_SIZE = 5

const publicationTime = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta', hourCycle: 'h23',
})

type PublicControls = {
  query: string; filters: ResultFilters; sort: ResultSort; page: number; total: number; pending: boolean
  onQuery: (query: string) => void; onSort: (column: ResultSortColumn) => void; onPage: (page: number) => void
  onApplyFilters: (filters: ResultFilters) => void
}

function pageItems(page: number, pages: number): (number | 'start' | 'end')[] {
  if (pages <= 5) return Array.from({ length: pages }, (_, index) => index + 1)
  if (page <= 3) return [1, 2, 3, 'end', pages]
  if (page >= pages - 2) return [1, 'start', pages - 2, pages - 1, pages]
  return [1, 'start', page, 'end', pages]
}

export function EvaluationHistory({ records, onEdit, onDuplicate, onPreview, onDelete, onNew, onShare, publication, publicControls }: {
  records: SavedEvaluation[]; onEdit?: (row: SavedEvaluation) => void; onDuplicate?: (row: SavedEvaluation) => void
  onPreview: (row: SavedEvaluation) => void; onDelete?: (row: SavedEvaluation) => void; onNew?: () => void; onShare?: (row: SavedEvaluation) => void; publicControls?: PublicControls
  publication?: { publishedAt: ReadonlyMap<string, string | null>; complete: boolean }
}) {
  const [localQuery, setLocalQuery] = useState('')
  const query = publicControls?.query ?? localQuery
  const term = query.trim().toLowerCase()
  const matches = publicControls ? records : records.filter(({ evaluation }) =>
    [evaluation.candidate, evaluation.topic, evaluation.evaluator, evaluation.branch].some((value) => value.toLowerCase().includes(term)),
  )
  const noMatches = publicControls ? !!term || Object.values(publicControls.filters).some(Boolean) : records.length > 0
  const pages = publicControls ? Math.ceil(publicControls.total / PUBLIC_PAGE_SIZE) : 0
  return (
    <Card className="workspace-card history-card">
      <CardHeader className="history-tools">
        <CardTitle>{publicControls ? 'Published Evaluations' : 'Saved Evaluations'}</CardTitle>
        <div className={publicControls ? 'public-results-tools' : undefined}>
          <div className="search">
            <Search size={17} />
            <Input aria-label="Search evaluations" placeholder={publicControls ? 'Search teacher, or module' : 'Search evaluations…'}
              value={query} maxLength={publicControls ? 120 : undefined}
              onChange={(event) => (publicControls?.onQuery ?? setLocalQuery)(event.target.value)} />
          </div>
          {publicControls && <ResultFiltersDialog value={publicControls.filters} onApply={publicControls.onApplyFilters} />}
        </div>
      </CardHeader>
      <CardContent aria-busy={publicControls?.pending || undefined}>
        {matches.length ? (
          <Table className="history-table">
            <TableHeader>
              <TableRow>
                {publicControls ? <>
                  <ResultSortHeading column="teacher" label="Teacher Name" shortLabel="Teacher" sort={publicControls.sort} onSort={publicControls.onSort} />
                  <ResultSortHeading column="date" label="Evaluation Date" shortLabel="Date" sort={publicControls.sort} onSort={publicControls.onSort} />
                  <ResultSortHeading column="score" label="Score" sort={publicControls.sort} onSort={publicControls.onSort} />
                </> : <>
                  <TableHead>Candidate / Topic</TableHead>
                  {publication && <TableHead>Publication</TableHead>}
                  <TableHead>Evaluation Date</TableHead><TableHead>Score</TableHead>
                </>}
                <TableHead>Recommendation</TableHead>
                <TableHead className="text-right"><span className={publicControls ? 'public-actions-label' : undefined}>Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((record) => {
                const { evaluation } = record
                const result = assess(evaluation, record.thresholds)
                const updatedAt = publication?.publishedAt.get(record.id)
                return (
                  <TableRow key={record.id}>
                    <TableCell><strong>{evaluation.candidate}</strong><div className="table-subtitle">{evaluation.topic}</div></TableCell>
                    {publication && <TableCell className="whitespace-normal">
                      {updatedAt ? <>
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-800">Published</Badge>
                        <div className="table-subtitle">
                          Updated <time dateTime={updatedAt} className="whitespace-nowrap">{publicationTime.format(new Date(updatedAt))} WIB</time>
                        </div>
                      </> : <Badge variant="outline">{updatedAt === null || publication.complete ? 'Private' : 'Status unavailable'}</Badge>}
                    </TableCell>}
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
            {noMatches ? <p>{publicControls ? 'Try another search or adjust the filters.' : 'Try another teacher, module, supervisor, or branch.'}</p>
              : onNew && <p>Complete and save an evaluation to see it here.</p>}
            {!records.length && onNew && <Button type="button" variant="outline" onClick={onNew}>Open evaluation form</Button>}
          </div>
        )}
        {publicControls && publicControls.total > 0 && (
          <div className="public-pagination">
            <span aria-live="polite">{publicControls.pending ? 'Updating results...' :
              'Showing ' + ((publicControls.page - 1) * PUBLIC_PAGE_SIZE + 1) + '-' +
              Math.min(publicControls.page * PUBLIC_PAGE_SIZE, publicControls.total) + ' of ' + publicControls.total}</span>
            {pages > 1 && (
              <Pagination className="public-pagination-actions" aria-label="Evaluation pages">
                <PaginationContent>
                  <PaginationItem>
                    <Button type="button" size="icon" variant="ghost" aria-label="Previous"
                      disabled={publicControls.pending || publicControls.page <= 1}
                      onClick={() => publicControls.onPage(publicControls.page - 1)}><ChevronLeft /></Button>
                  </PaginationItem>
                  {pageItems(publicControls.page, pages).map((item) => (
                    <PaginationItem key={item}>
                      {typeof item === 'number' ? (
                        <Button type="button" size="icon" variant="ghost" aria-label={'Page ' + item}
                          aria-current={item === publicControls.page ? 'page' : undefined} disabled={publicControls.pending}
                          onClick={() => { if (item !== publicControls.page) publicControls.onPage(item) }}>{item}</Button>
                      ) : <PaginationEllipsis />}
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <Button type="button" size="icon" variant="ghost" aria-label="Next"
                      disabled={publicControls.pending || publicControls.page >= pages}
                      onClick={() => publicControls.onPage(publicControls.page + 1)}><ChevronRight /></Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
