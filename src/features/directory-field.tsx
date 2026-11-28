import { Check, ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import type { Ref } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { loadDirectory, saveDirectory } from '@/lib/storage'
import type { Directory } from '@/lib/storage'

type Action = { type: 'add' } | { type: 'edit' | 'delete'; name: string }

export function DirectoryField({ id, directory, value, onChange, onBlur, inputRef, invalid }: {
  id: 'candidate' | 'topic'; directory: Directory
  value: string; onChange: (name: string) => void; onBlur: () => void; inputRef: Ref<HTMLButtonElement>; invalid: boolean
}) {
  const [entries, setEntries] = useState(() => loadDirectory(directory))
  const [open, setOpen] = useState(false)
  const [action, setAction] = useState<Action | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const addButton = useRef<HTMLButtonElement>(null)
  const label = directory === 'teacher' ? 'Teacher' : 'Module'
  const inputId = id + '-directory-name'

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
      saveDirectory(directory, next)
      setEntries(next)
      returnToList()
    } catch {
      setError(`Could not save the ${directory} list. Check your browser storage.`)
    }
  }

  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) start(null) }}>
      <PopoverTrigger asChild>
        <Button id={'field-' + id} ref={inputRef} onBlur={onBlur} type="button" variant="outline"
          className="detail-trigger min-w-0" aria-invalid={invalid} aria-describedby={invalid ? 'error-' + id : undefined}>
          <span className={value ? 'truncate' : 'truncate text-muted-foreground'}>{value || `Select a ${directory}`}</span>
          <ChevronDown className="ml-auto" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" aria-label={`${label} directory`}
        className="w-(--radix-popover-trigger-width) min-w-64 max-w-[calc(100vw-1.5rem)] gap-2">
        {!action ? <>
          <ul className="max-h-[min(15rem,35dvh)] space-y-0.5 overflow-y-auto" aria-label={`${label}s`}>
            {entries.map((entry) => (
              <li key={entry} className="flex items-center gap-0.5">
                <Button type="button" variant="ghost" aria-pressed={value === entry}
                  className="h-auto min-h-8 min-w-0 flex-1 justify-start whitespace-normal text-left aria-pressed:bg-muted"
                  onClick={() => { onChange(entry); setOpen(false) }}>
                  <span className="min-w-0 break-words">{entry}</span>
                  {value === entry && <Check className="ml-auto" aria-hidden="true" />}
                </Button>
                <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${entry}`} onClick={() => start({ type: 'edit', name: entry })}><Pencil /></Button>
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${entry}`} onClick={() => start({ type: 'delete', name: entry })}><Trash2 /></Button>
              </li>
            ))}
          </ul>
          {entries.length === 0 && <p className="px-2 text-muted-foreground">No {directory}s yet.</p>}
          <Button ref={addButton} type="button" variant="outline" className="w-full" onClick={() => start({ type: 'add' })}><Plus /> Add {directory}</Button>
        </> : action.type === 'delete' ? (
          <div className="grid gap-2">
            <p className="break-words">Remove <strong>{action.name}</strong> from the {directory} list?</p>
            {error && <p role="alert" className="field-error">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" autoFocus onClick={returnToList}>Cancel</Button>
              <Button type="button" variant="destructive" onClick={() => save(entries.filter((entry) => entry !== action.name))}>Remove {directory}</Button>
            </div>
          </div>
        ) : (
          <form className="grid gap-2" onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            const next = name.trim().replace(/\s+/g, ' ')
            if (!next) { setError(`Enter a ${directory} name.`); return }
            const previous = action.type === 'edit' ? action.name : undefined
            if (entries.some((entry) => entry !== previous && entry.toLowerCase() === next.toLowerCase())) {
              setError(`This ${directory} name is already in the list.`)
              return
            }
            save(previous ? entries.map((entry) => entry === previous ? next : entry) : [...entries, next])
          }}>
            <Label htmlFor={inputId}>{action.type === 'edit' ? 'Edit' : 'New'} {directory} name</Label>
            <Input id={inputId} value={name} maxLength={120} autoFocus aria-invalid={!!error}
              onChange={(event) => { setName(event.target.value); setError('') }} />
            {error && <p role="alert" className="field-error">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={returnToList}>Cancel</Button>
              <Button type="submit">Save {directory}</Button>
            </div>
          </form>
        )}
      </PopoverContent>
    </Popover>
  )
}
