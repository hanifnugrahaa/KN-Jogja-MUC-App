import type { SupabaseClient } from '@supabase/supabase-js'
import { recordSchema } from './evaluation'
import type { SavedEvaluation } from './evaluation'

export async function loadSharedHistory(client: SupabaseClient, signal: AbortSignal) {
  const records: SavedEvaluation[] = []
  let incomplete = false
  let after: string | undefined

  for (;;) {
    const query = client.from('muc_shared_evaluations')
      .select('id, shared_at, evaluation, thresholds').order('id').limit(200)
    const { data, error } = await (after ? query.gt('id', after) : query).abortSignal(signal)
    if (error) return { records, incomplete: true }
    if (!data.length) return { records, incomplete }

    for (const row of data) {
      const parsed = recordSchema.safeParse({
        ...row, savedAt: new Date(row.shared_at).toJSON(),
      })
      if (parsed.success) records.push(parsed.data)
      else incomplete = true
    }
    after = data[data.length - 1].id
  }
}
