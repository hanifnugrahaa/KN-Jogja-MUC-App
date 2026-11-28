import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import type { SavedEvaluation } from '@/lib/evaluation'

export function ShareEvaluation({ client, record, onBeforeUnpublish, onUpdated, onClose }: {
  client: SupabaseClient; record: SavedEvaluation; onBeforeUnpublish: () => boolean; onUpdated: () => void; onClose: () => void
}) {
  const [includeNotes, setIncludeNotes] = useState(false)
  const [shared, setShared] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    void client.from('muc_shared_evaluations').select('is_public,evaluation').eq('id', record.id).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error) { toast.error('Could not load the current sharing status.'); return }
        if (data?.is_public) {
          setShared(true)
          setIncludeNotes(!!data.evaluation?.notes)
        }
        setLoading(false)
      })
    return () => { active = false }
  }, [client, record.id])

  async function update(revoke: boolean) {
    if (revoke && !onBeforeUnpublish()) return
    setBusy(true)
    try {
      const { error } = revoke
        ? await client.from('muc_shared_evaluations').delete().eq('id', record.id)
        : await client.from('muc_shared_evaluations').upsert({
          id: record.id, teacher_email: null, is_public: true,
          evaluation: { ...record.evaluation, notes: includeNotes ? record.evaluation.notes : '' },
          thresholds: record.thresholds, shared_at: new Date().toISOString(),
        })
      if (error) throw error
      toast.success(revoke ? 'Evaluation unpublished' : 'Evaluation published')
      onUpdated()
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
          <DialogTitle>Publish Evaluation</DialogTitle>
          <DialogDescription>Anyone who opens the portal can view and download the published evaluation for {record.evaluation.candidate}.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); void update(false) }}>
          <Label><input type="checkbox" checked={includeNotes} disabled={loading || busy}
            onChange={(event) => setIncludeNotes(event.target.checked)} /> Include Supervisor Notes</Label>
          <DialogFooter>
            {shared && <Button type="button" variant="destructive" disabled={busy} onClick={() => void update(true)}>Unpublish</Button>}
            <Button type="submit" disabled={loading || busy}>{shared ? 'Update publication' : 'Publish evaluation'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
