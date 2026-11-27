import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SavedEvaluation } from '@/lib/evaluation'

export function ShareEvaluation({ client, record, onClose }: {
  client: SupabaseClient; record: SavedEvaluation; onClose: () => void
}) {
  const [email, setEmail] = useState('')
  const [includeNotes, setIncludeNotes] = useState(false)
  const [shared, setShared] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    void client.from('muc_shared_evaluations').select('teacher_email,evaluation').eq('id', record.id).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error) { toast.error('Could not load the current sharing status.'); return }
        if (data) {
          setShared(true)
          setEmail(data.teacher_email)
          setIncludeNotes(!!data.evaluation?.notes)
        }
        setLoading(false)
      })
    return () => { active = false }
  }, [client, record.id])

  async function update(revoke: boolean) {
    setBusy(true)
    try {
      const { error } = revoke
        ? await client.from('muc_shared_evaluations').delete().eq('id', record.id)
        : await client.from('muc_shared_evaluations').upsert({
          id: record.id, teacher_email: email.trim().toLowerCase(),
          evaluation: { ...record.evaluation, notes: includeNotes ? record.evaluation.notes : '' },
          thresholds: record.thresholds, shared_at: new Date().toISOString(),
        })
      if (error) throw error
      toast.success(revoke ? 'Teacher access removed' : 'Evaluation shared')
      onClose()
    } catch {
      toast.error('Could not update sharing. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share with Teacher</DialogTitle>
          <DialogDescription>Share a read-only copy for {record.evaluation.candidate}. The teacher must sign in with the email below.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); void update(false) }}>
          <Label htmlFor="share-email">Teacher email</Label>
          <Input id="share-email" type="email" maxLength={254} required disabled={loading || busy} value={email}
            onChange={(event) => setEmail(event.target.value)} />
          <Label><input type="checkbox" checked={includeNotes} disabled={loading || busy}
            onChange={(event) => setIncludeNotes(event.target.checked)} /> Include evaluator notes</Label>
          {shared && <p className="helper-text">Updating the teacher email replaces the previous recipient.</p>}
          <DialogFooter>
            {shared && <Button type="button" variant="destructive" disabled={busy} onClick={() => void update(true)}>Remove access</Button>}
            <Button type="submit" disabled={loading || busy}>{shared ? 'Update sharing' : 'Share evaluation'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
