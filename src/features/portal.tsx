import { useEffect, useState } from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Toaster } from '@/components/ui/sonner'
import { brand } from '@/lib/brand'
import { recordSchema } from '@/lib/evaluation'
import type { SavedEvaluation } from '@/lib/evaluation'
import { reportData } from '@/lib/report'
import type { Report } from '@/lib/report'
import { EvaluationHistory } from './history'
import { ReportPreview } from './report-preview'
import App from '@/App'

export function Portal({ client }: { client: SupabaseClient }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [access, setAccess] = useState<{ userId: string; trainer: boolean; records: SavedEvaluation[] }>()
  const [failure, setFailure] = useState(false)
  const [report, setReport] = useState<{ userId: string; data: Report } | null>(null)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  useEffect(() => {
    const { data } = client.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [client])

  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    let active = true
    async function load() {
      try {
        const role = await client.rpc('muc_is_trainer')
        if (role.error) throw role.error
        const trainer = role.data === true
        const records: SavedEvaluation[] = []
        if (!trainer) {
          const shared = await client.from('muc_shared_evaluations').select('id,evaluation,thresholds,shared_at').order('shared_at', { ascending: false })
          if (shared.error) throw shared.error
          for (const row of shared.data) {
            records.push(recordSchema.parse({
              id: row.id, savedAt: new Date(row.shared_at).toISOString(), evaluation: row.evaluation, thresholds: row.thresholds,
            }))
          }
        }
        if (active) setAccess({ userId: userId!, trainer, records })
      } catch {
        if (active) setFailure(true)
      }
    }
    void load()
    return () => { active = false }
  }, [client, userId])

  async function sendLink() {
    setSending(true)
    try {
      const { error } = await client.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: window.location.origin + window.location.pathname },
      })
      if (error) throw error
      setSent(true)
    } catch {
      toast.error('Could not send the sign-in link. Check the email address or try again later.')
    } finally {
      setSending(false)
    }
  }

  async function signOut() {
    const { error } = await client.auth.signOut()
    if (error) {
      toast.error('Could not sign out. Try again.')
      return
    }
    setAccess(undefined)
    setFailure(false)
    setReport(null)
    setSent(false)
  }

  if (user && access?.userId === user.id && access.trainer) {
    return <App portal={{ client, signOut }} />
  }

  return (
    <main className="main-content max-w-5xl">
      <header className="mb-6 flex items-center justify-between gap-4">
        <img src={brand.logo} width={101} alt={brand.name} />
        {user && <Button variant="outline" onClick={() => void signOut()}>Sign out</Button>}
      </header>
      {user === undefined || (user && !failure && access?.userId !== user.id) ? (
        <p role="status">Loading MUC…</p>
      ) : failure ? (
        <p role="alert">Could not load the portal. Reload the page or sign in again.</p>
      ) : user ? (
        <>
          <h1 className="mb-4 text-3xl font-bold">My Evaluations</h1>
          <EvaluationHistory records={access?.records ?? []} onPreview={(row) => setReport({ userId: user.id, data: reportData(row.evaluation, row.thresholds) })} />
        </>
      ) : (
        <Card className="workspace-card mx-auto mt-12 max-w-md">
          <CardHeader><CardTitle><h1>Sign in to MUC</h1></CardTitle></CardHeader>
          <CardContent>
            {sent ? (
              <p role="status">Check your email for a sign-in link.</p>
            ) : (
              <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); void sendLink() }}>
                <Label htmlFor="portal-email">Email address</Label>
                <Input id="portal-email" type="email" autoComplete="email" maxLength={254} required value={email}
                  onChange={(event) => setEmail(event.target.value)} />
                <Button disabled={sending} type="submit">{sending ? 'Sending…' : 'Send sign-in link'}</Button>
              </form>
            )}
            {sent && <Button className="mt-3" variant="outline" onClick={() => setSent(false)}>Use another email</Button>}
          </CardContent>
        </Card>
      )}
      <ReportPreview report={user && report?.userId === user.id ? report.data : null} onClose={() => setReport(null)} />
      <Toaster position="bottom-right" richColors />
    </main>
  )
}
