import type { SupabaseClient } from '@supabase/supabase-js'
import { recordSchema } from './evaluation'
import type { SavedEvaluation } from './evaluation'

export async function loadEvaluationHistory(client: SupabaseClient, signal: AbortSignal, owner?: string) {
  const records: (SavedEvaluation & { isPublic: boolean })[] = []
  let incomplete = false
  let after: string | undefined

  for (;;) {
    const query = owner
      ? client.from('muc_private_evaluations').select('id, saved_at, evaluation, thresholds').eq('owner_id', owner).not('evaluation', 'is', null)
      : client.from('muc_shared_evaluations').select('id, shared_at, is_public, evaluation, thresholds')
    query.order('id').limit(200)
    if (after) query.gt('id', after)
    const { data, error } = await query.abortSignal(signal)
    if (error) return { records, incomplete: true }
    if (!data.length) return { records, incomplete }

    for (const row of data) {
      const parsed = recordSchema.safeParse({
        ...row, savedAt: new Date('shared_at' in row ? row.shared_at : row.saved_at).toJSON(),
      })
      if (parsed.success) records.push({ ...parsed.data, isPublic: 'is_public' in row && row.is_public === true })
      else incomplete = true
    }
    after = data[data.length - 1].id
  }
}

export async function savePrivateEvaluations(client: SupabaseClient, owner: string, records: SavedEvaluation[], mode: 'save' | 'import' | 'preserve' = 'save') {
  for (let offset = 0; offset < records.length; offset += 100) {
    const batch = records.slice(offset, offset + 100)
      .map(({ id, savedAt, evaluation, thresholds }) => ({ id, saved_at: savedAt, evaluation, thresholds }))
    const { error } = mode === 'import'
      ? await client.rpc('muc_import_trainer_evaluations', { evaluations: batch, expected_owner: owner })
      : await client.from('muc_private_evaluations')
        .upsert(batch.map((row) => ({ ...row, owner_id: owner })), { onConflict: 'owner_id,id', ignoreDuplicates: mode === 'preserve' })
    if (error) return false
  }
  return true
}
