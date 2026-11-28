import { Check, ChevronDown, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import type { Ref } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { loadDirectory, moduleAgeLabels, saveDirectory } from '@/lib/storage'
import type { Directory, DirectoryEntry } from '@/lib/storage'

type Action = { type: 'add' } | { type: 'edit' | 'delete'; entry: DirectoryEntry }

function normalizeSearch(text: string) {
  return text.toLowerCase().trim().replace(/\s*[-–—]\s*/g, '-')
}

export function DirectoryField({ id, directory, value, onChange, onBlur, inputRef, invalid }: {
  id: 'candidate' | 'topic'; directory: Directory
  value: string; onChange: (name: string) => void; onBlur: () => void; inputRef: Ref<HTMLButtonElement>; invalid: boolean
}) {
  const [entries, setEntries] = useState(() => loadDirectory(directory))
  const [open, setOpen] = useState(false)
  const [action, setAction] = useState<Action | null>(null)
  const [name, setName] = useState('')
  const [age, setAge] = useState<DirectoryEntry['age']>()
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const addButton = useRef<HTMLButtonElement>(null)
  const label = directory === 'teacher' ? 'Teacher' : 'Module'
  const inputId = id + '-directory-name'
  const terms = normalizeSearch(query).split(/\s+/)
  const matches = entries.filter((entry) => {
    const text = normalizeSearch(`${entry.name} ${entry.age ? moduleAgeLabels[entry.age] : ''}`)
    return terms.every((term) => text.includes(term))
  })

  function start(next: Action | null) {
    setAction(next)
    setName(next?.type === 'edit' ? next.entry.name : '')
    setAge(next?.type === 'edit' ? next.entry.age : undefined)
    setError('')
  }

  function returnToList() {
    start(null)
    requestAnimationFrame(() => addButton.current?.focus())
  }

  function save(next: DirectoryEntry[]) {
    try {
      saveDirectory(directory, next)
      setEntries(next)
      setQuery('')
      returnToList()
    } catch {
      setError(`Could not save the ${directory} list. Check your browser storage.`)
    }
  }

  function toggle(next: boolean) {
    setOpen(next)
    if (!next) {
      setQuery('')
      start(null)
    }
  }

  return (
    <Popover open={open} onOpenChange={toggle}>
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
          {directory === 'module' && <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input type="search" placeholder="Search modules" aria-label="Search modules" value={query}
              onChange={(event) => setQuery(event.target.value)} className="pl-8" />
          </div>}
          <ul className="max-h-[min(15rem,35dvh)] space-y-0.5 overflow-y-auto" aria-label={`${label}s`}>
            {matches.map((entry, index) => (
              <li key={entry.name} className="flex items-center gap-0.5">
                <Button type="button" variant="ghost" aria-pressed={value === entry.name} aria-label={entry.name}
                  aria-describedby={entry.age ? `${id}-age-${index}` : undefined}
                  className="h-auto min-h-8 min-w-0 flex-1 justify-start whitespace-normal text-left aria-pressed:bg-muted"
                  onClick={() => { onChange(entry.name); toggle(false) }}>
                  <span className="min-w-0 break-words">
                    {entry.name}
                    {entry.age && <span id={`${id}-age-${index}`} className="block text-xs font-normal text-muted-foreground">Ages {moduleAgeLabels[entry.age]}</span>}
                  </span>
                  {value === entry.name && <Check className="ml-auto" aria-hidden="true" />}
                </Button>
                <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${entry.name}`} onClick={() => start({ type: 'edit', entry })}><Pencil /></Button>
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${entry.name}`} onClick={() => start({ type: 'delete', entry })}><Trash2 /></Button>
              </li>
            ))}
          </ul>
          {matches.length === 0 && <p role="status" className="px-2 text-muted-foreground">{query.trim() ? 'No matching modules.' : `No ${directory}s yet.`}</p>}
          <Button ref={addButton} type="button" variant="outline" className="w-full" onClick={() => start({ type: 'add' })}><Plus /> Add {directory}</Button>
        </> : action.type === 'delete' ? (
          <div className="grid gap-2">
            <p className="break-words">Remove <strong>{action.entry.name}</strong> from the {directory} list?</p>
            {error && <p role="alert" className="field-error">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" autoFocus onClick={returnToList}>Cancel</Button>
              <Button type="button" variant="destructive" onClick={() => save(entries.filter((entry) => entry !== action.entry))}>Remove {directory}</Button>
            </div>
          </div>
        ) : (
          <form className="grid gap-2" onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            const next = { name: name.trim().replace(/\s+/g, ' '), age }
            if (!next.name) { setError(`Enter a ${directory} name.`); return }
            const previous = action.type === 'edit' ? action.entry : undefined
            if (entries.some((entry) => entry !== previous && entry.name.toLowerCase() === next.name.toLowerCase())) {
              setError(`This ${directory} name is already in the list.`)
              return
            }
            save(previous ? entries.map((entry) => entry === previous ? next : entry) : [...entries, next])
          }}>
            <Label htmlFor={inputId}>{action.type === 'edit' ? 'Edit' : 'New'} {directory} name</Label>
            <Input id={inputId} value={name} maxLength={120} autoFocus aria-invalid={!!error}
              onChange={(event) => { setName(event.target.value); setError('') }} />
            {directory === 'module' && <>
              <Label htmlFor={inputId + '-age'}>Age range</Label>
              <select id={inputId + '-age'} value={age ?? ''} className="h-8 rounded-lg border border-input bg-background px-2"
                onChange={(event) => {
                  const next = event.target.value
                  setAge(next === '8-12' || next === '12-16' || next === 'both' ? next : undefined)
                }}>
                <option value="">Unspecified</option>
                {Object.entries(moduleAgeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </>}
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
