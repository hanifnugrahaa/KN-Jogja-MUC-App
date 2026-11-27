import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { CalendarDays, ClipboardList, Info, MessageSquareText, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { assess, detailFields, formatDate, localDate, ratingLabels } from '@/lib/evaluation'
import type { Evaluation } from '@/lib/evaluation'

type Props = { form: UseFormReturn<Evaluation>; result: ReturnType<typeof assess>; notes: string }

const calendarEnd = new Date(new Date().getFullYear() + 10, 11)
const placeholders = { candidate: 'e.g. Mr Ahsan', topic: 'e.g. Python First', evaluator: 'e.g. Mr Hanif', branch: 'e.g. Yogyakarta', date: '' }

function DateField({ value, onChange, onBlur, invalid }: {
  value: string; onChange: (date: string) => void; onBlur: () => void; invalid: boolean
}) {
  const [open, setOpen] = useState(false)
  const selected = new Date(value + 'T00:00:00')
  const date = Number.isNaN(selected.valueOf()) ? undefined : selected
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id="field-date" type="button" variant="outline" className="date-trigger" aria-invalid={invalid}
          aria-describedby={invalid ? 'error-date' : undefined} onBlur={onBlur}>
          <CalendarDays aria-hidden="true" />
          {date ? formatDate(value) : 'Select a date'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} defaultMonth={date} autoFocus captionLayout="dropdown"
          startMonth={new Date(1900, 0)} endMonth={calendarEnd}
          onSelect={(next) => { if (next) { onChange(localDate(next)); setOpen(false) } }} />
      </PopoverContent>
    </Popover>
  )
}

export function EvaluationForm({ form, result, notes }: Props) {
  const { control, register, formState: { errors } } = form
  const [polished, setPolished] = useState<string | null>(null)
  const [polishing, setPolishing] = useState(false)

  async function requestPolish() {
    setPolishing(true)
    try {
      const response = await fetch('/api/polish-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      const result = await response.json()
      if (!response.ok || typeof result.notes !== 'string') {
        throw new Error(result.error || 'Gemini did not return polished notes.')
      }
      if (form.getValues('notes') !== notes) {
        toast.info('The notes changed. Run Polish Notes again to use the latest version.')
        return
      }
      setPolished(result.notes)
    } catch (error) {
      toast.error(error instanceof Error && !(error instanceof SyntaxError) ? error.message : 'The Gemini endpoint is unavailable.')
    } finally {
      setPolishing(false)
    }
  }
  return (
    <div className="evaluation-fields">
      <Card className="workspace-card">
        <CardHeader className="section-heading">
          <span className="section-icon"><UserRound /></span>
          <div>
            <CardTitle><h2>Candidate Information</h2></CardTitle>
          </div>
        </CardHeader>
        <CardContent className="details-grid">
          {detailFields.map(([name, label]) => (
            <div className="field" key={name}>
              <Label htmlFor={'field-' + name}>{label} <span className="required" aria-hidden="true">*</span></Label>
              {name === 'date' ? (
                <Controller name="date" control={control} render={({ field }) => (
                  <DateField value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalid={!!errors.date} />
                )} />
              ) : (
                <Input id={'field-' + name} placeholder={placeholders[name]} maxLength={120} aria-required="true"
                  aria-invalid={!!errors[name]} aria-describedby={errors[name] ? 'error-' + name : undefined} {...register(name)} />
              )}
              {errors[name] && <p className="field-error" id={'error-' + name}>{errors[name]?.message}</p>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="workspace-card rubric-card">
        <CardHeader className="section-heading">
          <span className="section-icon"><ClipboardList /></span>
          <div>
            <CardTitle><h2>Assessment Rubric</h2></CardTitle>

          </div>
        </CardHeader>
        <CardContent>
          <ul className="rating-legend" aria-label="Rating scale">
            {ratingLabels.map((label, index) => <li key={label}><span>{index + 1}</span>{label}</li>)}
          </ul>
          <div className="rubric-grid rubric-head" aria-hidden="true"><span>Assessment Criterion</span><span>Weight</span><span>Rating</span><span>Score</span></div>
          {result.breakdown.map(({ id, label, guidance, weight, rating, weighted }) => (
            <div key={id} className="rubric-grid rubric-row">
              <div className="criterion-name">
                <span id={'criterion-' + id}>{label}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="guidance" type="button" aria-label={label + ' guidance'}><Info size={14} /></button>
                  </TooltipTrigger>
                  <TooltipContent>{guidance}</TooltipContent>
                </Tooltip>
                <span className="mobile-weight">{weight} pts</span>
              </div>
              <span className="weight">{weight} pts</span>
              <Controller control={control} name={`ratings.${id}` as const} render={({ field }) => (
                <ToggleGroup type="single" value={String(field.value ?? '')} onValueChange={(value) => { if (value) field.onChange(Number(value)) }}
                  aria-labelledby={'criterion-' + id} className="rating-group" variant="outline">
                  {ratingLabels.map((description, index) => (
                    <ToggleGroupItem key={description} value={String(index + 1)} aria-label={(index + 1) + ' ' + description}>
                      {index + 1}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              )} />
              <span className="row-score">{rating ? <>{rating}/5 <small>({weighted}/{weight})</small></> : '—'}</span>
            </div>
          ))}
          {errors.ratings && <p className="field-error rubric-error" role="alert">{errors.ratings.message}</p>}
        </CardContent>
      </Card>

      <Card className="workspace-card">
        <CardHeader className="section-heading">
          <span className="section-icon"><MessageSquareText /></span>
          <div>
            <CardTitle><h2><label htmlFor="evaluation-notes">Evaluator Notes</label></h2></CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea id="evaluation-notes" className="notes-input" placeholder="Add observations from the session…" maxLength={4000}
            aria-invalid={!!errors.notes} aria-describedby={errors.notes ? 'notes-error notes-count' : 'notes-count'} {...register('notes')} />
          {errors.notes && <p className="field-error" id="notes-error">{errors.notes.message}</p>}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <Dialog open={polished !== null} onOpenChange={(open) => { if (!open) setPolished(null) }}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" disabled={polishing || !notes.trim()} onClick={() => void requestPolish()}>
                  <span aria-hidden="true" className="rounded border border-primary/30 bg-accent px-1 text-xs font-semibold text-primary">AI</span> {polishing ? 'Polishing?' : 'Polish Notes'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Review Polished Notes</DialogTitle>
                  <DialogDescription>Review and edit the suggested wording before applying it.</DialogDescription>
                </DialogHeader>
                <Textarea aria-label="Polished notes" className="min-h-40" value={polished ?? ''}
                  onChange={(event) => setPolished(event.target.value)} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setPolished(null)}>Cancel</Button>
                  <Button type="button" disabled={!polished?.trim() || polished.length > 4000}
                    onClick={() => {
                      if (polished === null) return
                      form.setValue('notes', polished.trim(), { shouldDirty: true, shouldValidate: true })
                      setPolished(null)
                    }}>Apply Notes</Button>
                </DialogFooter>
                {(polished?.length ?? 0) > 4000 && <p className="field-error" role="alert">Use 4,000 characters or fewer.</p>}
              </DialogContent>
            </Dialog>
            <p className="notes-count" id="notes-count">{notes.length.toLocaleString('en-US')} / 4,000</p>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}
