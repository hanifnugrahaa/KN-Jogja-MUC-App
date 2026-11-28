import { Check, ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import type { Ref } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { loadTeachers, saveTeachers } from '@/lib/storage'

type Action = { type: 'add' } | { type: 'edit' | 'delete'; name: string }

export function TeacherField({ value, onChange, onBlur, inputRef, invalid }: {
  value: string; onChange: (name: string) => void; onBlur: () => void; inputRef: Ref<HTMLButtonElement>; invalid: boolean
}) {
  const [teachers, setTeachers] = useState(loadTeachers)
  const [open, setOpen] = useState(false)
  const [action, setAction] = useState<Action | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const addButton = useRef<HTMLButtonElement>(null)

  function start(next: Action | null) {
    setAction(next)
    setName(next?.type === 'edit' ? next.name : '')
    setError('')
  }

  function returnToList() {
    start(null)
    requestAnimationFrame(() => addButton.current?.focus())
  }

  function save(next: string[]) {
    try {
      saveTeachers(next)
      setTeachers(next)
      returnToList()
    } catch {
      setError('Could not save the teacher list. Check your browser storage.')
    }
  }

  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) start(null) }}>
      <PopoverTrigger asChild>
        <Button id="field-candidate" ref={inputRef} onBlur={onBlur} type="button" variant="outline"
          className="detail-trigger min-w-0" aria-invalid={invalid} aria-describedby={invalid ? 'error-candidate' : undefined}>
          <span className={value ? 'truncate' : 'truncate text-muted-foreground'}>{value || 'Select a teacher'}</span>
          <ChevronDown className="ml-auto" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" aria-label="Teacher directory"
        className="w-(--radix-popover-trigger-width) min-w-64 max-w-[calc(100vw-1.5rem)] gap-2">
        {!action ? <>
          <ul className="max-h-[min(15rem,35dvh)] space-y-0.5 overflow-y-auto" aria-label="Teachers">
            {teachers.map((teacher) => (
              <li key={teacher} className="flex items-center gap-0.5">
                <Button type="button" variant="ghost" aria-pressed={value === teacher}
                  className="min-w-0 flex-1 justify-start aria-pressed:bg-muted"
                  onClick={() => { onChange(teacher); setOpen(false) }}>
                  <span className="truncate">{teacher}</span>
                  {value === teacher && <Check className="ml-auto" aria-hidden="true" />}
                </Button>
                <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${teacher}`} onClick={() => start({ type: 'edit', name: teacher })}><Pencil /></Button>
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${teacher}`} onClick={() => start({ type: 'delete', name: teacher })}><Trash2 /></Button>
              </li>
            ))}
          </ul>
          {teachers.length === 0 && <p className="px-2 text-muted-foreground">No teachers yet.</p>}
          <Button ref={addButton} type="button" variant="outline" className="w-full" onClick={() => start({ type: 'add' })}><Plus /> Add teacher</Button>
        </> : action.type === 'delete' ? (
          <div className="grid gap-2">
            <p className="break-words">Remove <strong>{action.name}</strong> from the teacher list?</p>
            {error && <p role="alert" className="field-error">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" autoFocus onClick={returnToList}>Cancel</Button>
              <Button type="button" variant="destructive" onClick={() => save(teachers.filter((teacher) => teacher !== action.name))}>Remove teacher</Button>
            </div>
          </div>
        ) : (
          <form className="grid gap-2" onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            const next = name.trim().replace(/\s+/g, ' ')
            if (!next) { setError('Enter a teacher name.'); return }
            const previous = action.type === 'edit' ? action.name : undefined
            if (teachers.some((teacher) => teacher !== previous && teacher.toLowerCase() === next.toLowerCase())) {
              setError('This teacher name is already in the list.')
              return
            }
            save(previous ? teachers.map((teacher) => teacher === previous ? next : teacher) : [...teachers, next])
          }}>
            <Label htmlFor="teacher-directory-name">{action.type === 'edit' ? 'Edit teacher name' : 'New teacher name'}</Label>
            <Input id="teacher-directory-name" value={name} maxLength={120} autoFocus aria-invalid={!!error}
              onChange={(event) => { setName(event.target.value); setError('') }} />
            {error && <p role="alert" className="field-error">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={returnToList}>Cancel</Button>
              <Button type="submit">Save teacher</Button>
            </div>
          </form>
        )}
      </PopoverContent>
    </Popover>
  )
}
