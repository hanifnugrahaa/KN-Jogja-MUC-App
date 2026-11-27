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
  return window.location.pathname.replace(/\/$/, '') === '/trainer'
    ? <TrainerPortal client={client} />
    : <PublicEvaluations client={client} />
}

function PublicEvaluations({ client }: { client: SupabaseClient }) {
  const [records, setRecords] = useState<SavedEvaluation[]>()
  const [error, setError] = useState(false)
  const [report, setReport] = useState<Report | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const result = await client.rpc('muc_public_evaluations')
        if (result.error) throw result.error
        const evaluations = result.data.map((row: { id: string; shared_at: string; evaluation: unknown; thresholds: unknown }) =>
          recordSchema.parse({ id: row.id, savedAt: new Date(row.shared_at).toISOString(), evaluation: row.evaluation, thresholds: row.thresholds }))
        if (active) setRecords(evaluations)
      } catch {
        if (active) setError(true)
      }
    }
    void load()
    return () => { active = false }
  }, [client])

  return (
    <main className="main-content max-w-5xl">
      <header className="mb-6 flex items-center justify-between gap-4">
        <img src={brand.logo} width={101} alt={brand.name} />
        <Button variant="outline" asChild><a href="/trainer">Trainer Login</a></Button>
      </header>
      <h1 className="mb-4 text-3xl font-bold">Public Evaluations</h1>
      {error ? <p role="alert">Could not load public evaluations. Please reload the page.</p>
        : records ? <EvaluationHistory records={records} onPreview={(row) => setReport(reportData(row.evaluation, row.thresholds))} />
        : <p role="status">Loading evaluations?</p>}
      <ReportPreview report={report} onClose={() => setReport(null)} />
      <Toaster position="bottom-right" richColors />
    </main>
  )
}

function TrainerPortal({ client }: { client: SupabaseClient }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [access, setAccess] = useState<{ userId: string; trainer: boolean }>()
  const [failure, setFailure] = useState(false)
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
        if (active) setAccess({ userId: userId!, trainer: role.data === true })
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
        options: { emailRedirectTo: window.location.origin + '/trainer', shouldCreateUser: false },
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
    setSent(false)
  }

  if (user && access?.userId === user.id && access.trainer) {
    return <App portal={{ client, signOut }} />
  }

  return (
    <main className="main-content max-w-5xl">
      <header className="mb-6 flex items-center justify-between gap-4">
        <img src={brand.logo} width={101} alt={brand.name} />
        <Button variant="outline" asChild><a href="/">Public Evaluations</a></Button>
      </header>
      {user === undefined || (user && !failure && access?.userId !== user.id) ? (
        <p role="status">Loading MUC…</p>
      ) : failure ? (
        <div className="space-y-3"><p role="alert">Could not check trainer access.</p><Button variant="outline" onClick={() => void signOut()}>Sign out</Button></div>
      ) : user ? (
        <div className="space-y-3">
          <p role="alert">This account does not have trainer access.</p>
          <Button variant="outline" onClick={() => void signOut()}>Sign out</Button>
        </div>
      ) : (
        <Card className="workspace-card mx-auto mt-12 max-w-md">
          <CardHeader><CardTitle><h1>Trainer Login</h1></CardTitle></CardHeader>
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
      <Toaster position="bottom-right" richColors />
    </main>
  )
}
