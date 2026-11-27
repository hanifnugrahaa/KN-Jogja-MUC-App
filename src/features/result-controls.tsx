import { useState } from 'react'
import { ArrowDown, ArrowDownUp, ArrowUp, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TableHead } from '@/components/ui/table'
import { recommendations } from '@/lib/evaluation'

export type ResultFilters = { teacher: string; from: string; to: string; recommendation: string }
export type ResultSortColumn = 'teacher' | 'date' | 'score'
export type ResultSort = { column: ResultSortColumn; descending: boolean }
export const emptyResultFilters: ResultFilters = { teacher: '', from: '', to: '', recommendation: '' }

export function ResultFiltersDialog({ value, onApply }: { value: ResultFilters; onApply: (filters: ResultFilters) => void }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const active = [value.teacher, value.from || value.to, value.recommendation].filter(Boolean).length
  const invalid = !!draft.from && !!draft.to && draft.from > draft.to

  return (
    <Dialog open={open} onOpenChange={(next) => { if (next) setDraft(value); setOpen(next) }}>
      <DialogTrigger asChild>
        <Button className="public-filter-trigger" type="button" variant="outline">
          <SlidersHorizontal aria-hidden="true" />Filters{active > 0 && <span className="public-filter-count">{active}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="results-filter-dialog">
        <DialogHeader>
          <DialogTitle>Filter MUC Results</DialogTitle>
          <DialogDescription className="sr-only">Filter the published evaluations by teacher, date, or recommendation.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={(event) => {
          event.preventDefault()
          if (invalid) return
          onApply({ ...draft, teacher: draft.teacher.trim() })
          setOpen(false)
        }}>
          <div className="grid gap-2">
            <Label htmlFor="filter-teacher">Teacher name</Label>
            <Input id="filter-teacher" value={draft.teacher} maxLength={120}
              onChange={(event) => setDraft({ ...draft, teacher: event.target.value })} />
          </div>
          <div className="results-filter-dates">
            <div className="grid min-w-0 gap-2">
              <Label htmlFor="filter-from">From date</Label>
              <Input id="filter-from" type="date" value={draft.from}
                onChange={(event) => setDraft({ ...draft, from: event.target.value })} />
            </div>
            <div className="grid min-w-0 gap-2">
              <Label htmlFor="filter-to">To date</Label>
              <Input id="filter-to" type="date" value={draft.to}
                onChange={(event) => setDraft({ ...draft, to: event.target.value })} />
            </div>
          </div>
          {invalid && <p className="field-error" role="alert">The end date must be on or after the start date.</p>}
          <div className="grid gap-2">
            <Label htmlFor="filter-recommendation">Recommendation</Label>
            <Select value={draft.recommendation || 'all'} onValueChange={(value) => setDraft({ ...draft, recommendation: value === 'all' ? '' : value })}>
              <SelectTrigger id="filter-recommendation" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All recommendations</SelectItem>
                {recommendations.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { onApply(emptyResultFilters); setOpen(false) }}>Clear filters</Button>
            <Button type="submit" disabled={invalid}>Apply filters</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ResultSortHeading({ column, label, shortLabel, sort, onSort }: {
  column: ResultSortColumn; label: string; shortLabel?: string; sort: ResultSort
  onSort: (column: ResultSortColumn) => void
}) {
  const active = sort.column === column
  const Icon = active ? (sort.descending ? ArrowDown : ArrowUp) : ArrowDownUp
  return (
    <TableHead aria-sort={active ? sort.descending ? 'descending' : 'ascending' : undefined}>
      <button type="button" className="public-sort-heading" aria-label={'Sort by ' + label.toLowerCase()} onClick={() => onSort(column)}>
        {shortLabel ? <><span className="public-sort-full">{label}</span><span className="public-sort-short">{shortLabel}</span></> : label}
        <Icon size={13} aria-hidden="true" />
      </button>
    </TableHead>
  )
}
