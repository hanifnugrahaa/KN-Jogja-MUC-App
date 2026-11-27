import { Eye, EyeOff, Globe, LoaderCircle, LogIn } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
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
import { loadPublishedSignature } from '@/lib/report-signature'
import { EvaluationHistory, PUBLIC_PAGE_SIZE } from './history'
import { emptyResultFilters } from './result-controls'
import type { ResultSort } from './result-controls'
import { ReportPreview } from './report-preview'
import App from '@/App'

function portalRoute() {
  return window.location.pathname.replace(/\/$/, '') === '/trainer' ? '/trainer' : '/'
}

function PagePreloader() {
  return (
    <main className="muc-page-loader">
      <div className="muc-page-loader-content" role="status">
        <img src={brand.logo} width={106} height={48} alt="Koding Next" />
        <LoaderCircle className="muc-page-loader-spinner" size={25} aria-hidden="true" />
        <span className="sr-only">Loading MUC</span>
      </div>
    </main>
  )
}

function PortalBackdrop() {
  return (
    <div className="portal-light" aria-hidden="true">
      <div className="trainer-beam trainer-beam-main" />
      <div className="trainer-beam trainer-beam-echo" />
    </div>
  )
}

export function Portal({ client }: { client: SupabaseClient }) {
  const [route, setRoute] = useState(portalRoute)
  const [visibleRoute, setVisibleRoute] = useState(route)

  useEffect(() => {
    const onPopState = () => setRoute(portalRoute())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (route === visibleRoute) return
    const reveal = window.setTimeout(() => setVisibleRoute(route), 240)
    return () => window.clearTimeout(reveal)
  }, [route, visibleRoute])

  function navigate(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null
    if (!link || link.origin !== window.location.origin || link.target || link.hasAttribute('download')) return
    if (link.hash || link.search || (link.pathname !== '/' && link.pathname !== '/trainer') || link.pathname === route) return
    event.preventDefault()
    window.history.pushState(null, '', link.pathname)
    window.scrollTo(0, 0)
    setRoute(portalRoute())
  }

  const navigating = visibleRoute !== route
  return (
    <div onClick={navigate}>
      {route === '/trainer'
        ? <TrainerPortal client={client} navigating={navigating} />
        : <PublicEvaluations client={client} navigating={navigating} />}
      <Toaster position="bottom-right" richColors />
    </div>
  )
}

function PublicEvaluations({ client, navigating }: { client: SupabaseClient; navigating: boolean }) {
  const [filters, setFilters] = useState({
    query: '', page: 1, filters: emptyResultFilters, sort: { column: 'date', descending: true } as ResultSort,
  })
  const [result, setResult] = useState<{ filters: typeof filters; records: SavedEvaluation[]; total: number }>()
  const [error, setError] = useState(false)
  const [report, setReport] = useState<Report | null>(null)
  const previewRequest = useRef(0)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const response = await client.rpc('muc_public_evaluations_filtered', {
          page_number: filters.page, search_text: filters.query, teacher_name: filters.filters.teacher,
          from_date: filters.filters.from || null, to_date: filters.filters.to || null,
          recommendation_filter: filters.filters.recommendation,
          sort_column: filters.sort.column, sort_descending: filters.sort.descending,
        })
        if (response.error) throw response.error
        const records = response.data.rows.map((row: { id: string; shared_at: string; evaluation: unknown; thresholds: unknown }) =>
          recordSchema.parse({ id: row.id, savedAt: new Date(row.shared_at).toISOString(), evaluation: row.evaluation, thresholds: row.thresholds }))
        const total: number = response.data.total
        const lastPage = Math.max(1, Math.ceil(total / PUBLIC_PAGE_SIZE))
        if (!active) return
        if (filters.page > lastPage) {
          setFilters({ ...filters, page: lastPage })
          return
        }
        setResult({ filters, records, total })
      } catch {
        if (active) setError(true)
      }
    }
    const timer = window.setTimeout(() => void load(), filters.query ? 180 : 0)
    return () => { active = false; window.clearTimeout(timer) }
  }, [client, filters])

  async function openPreview(row: SavedEvaluation) {
    const request = ++previewRequest.current
    const next: Report = reportData(row.evaluation, row.thresholds)
    if (next.evaluatorRole) {
      try {
        next.signature = await loadPublishedSignature(client, row.id)
      } catch {
        toast.error('Could not load the signature. The preview is unsigned.')
      }
    }
    if (request === previewRequest.current) setReport(next)
  }

  if (navigating || (!result && !error)) return <PagePreloader />

  return (
    <main className="portal-surface public-results">
      <PortalBackdrop />
      <div className="public-results-inner">
        <header className="public-results-header">
          <img className="public-results-logo" src={brand.logo} width={94} height={43} alt={brand.name} />
          <Button variant="outline" className="public-dashboard-login" asChild>
            <a href="/trainer"><LogIn aria-hidden="true" />Log In</a>
          </Button>
        </header>
        <h1>MUC Result</h1>
        {error ? <p className="public-results-error" role="alert">Could not load public evaluations. Please reload the page.</p>
          : <EvaluationHistory records={result?.records ?? []} onPreview={openPreview} publicControls={{
            ...filters, page: result?.filters.page ?? 1, total: result?.total ?? 0, pending: result?.filters !== filters,
            onQuery: (query) => setFilters((previous) => ({ ...previous, query, page: 1 })),
            onApplyFilters: (value) => setFilters((previous) => ({ ...previous, filters: value, page: 1 })),
            onSort: (column) => setFilters((previous) => ({
              ...previous, page: 1,
              sort: { column, descending: previous.sort.column === column ? !previous.sort.descending : column !== 'teacher' },
            })),
            onPage: (page) => setFilters((previous) => ({ ...previous, page })),
          }} />}
        <footer className="public-results-credit">Made by Coordinator Teacher</footer>
      </div>
      <ReportPreview report={report} onClose={() => { previewRequest.current++; setReport(null) }} />
    </main>
  )
}

function TrainerPortal({ client, navigating }: { client: SupabaseClient; navigating: boolean }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [access, setAccess] = useState<{ userId: string; trainer: boolean }>()
  const [failure, setFailure] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mode, setMode] = useState<'login' | 'request' | 'recovery'>('login')
  const [busy, setBusy] = useState(false)
  const [resetResult, setResetResult] = useState<'sent' | 'unregistered' | null>(null)
  useEffect(() => {
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setMode('recovery')
      if (event === 'SIGNED_OUT') {
        setMode('login')
        setPassword('')
        setShowPassword(false)
      }
      setUser(session?.user ?? null)
    })
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

  async function submitCredentials() {
    toast.dismiss('trainer-auth-error')
    setBusy(true)
    try {
      if (mode === 'request') {
        setResetResult(null)
        const address = email.trim().toLowerCase()
        const eligible = await client.rpc('muc_reset_email_registered', { email_address: address })
        if (eligible.error) throw eligible.error
        if (eligible.data !== true) {
          setResetResult('unregistered')
          return
        }
        const { error } = await client.auth.resetPasswordForEmail(address, {
          redirectTo: window.location.origin + '/trainer',
        })
        if (error) throw error
        setResetResult('sent')
      } else if (mode === 'recovery') {
        const { error } = await client.auth.updateUser({ password })
        if (error) throw error
        setPassword('')
        setMode('login')
        toast.success('Password saved')
      } else {
        const { error } = await client.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
        if (error) throw error
        setPassword('')
      }
    } catch {
      toast.error(mode === 'request' ? 'Could not process the reset request. Try again later or contact the Coordinator Teacher.'
        : mode === 'recovery' ? 'Could not save the password. Choose a different password or request a new link.'
          : 'Could not sign in. Check your email and password.', { id: 'trainer-auth-error' })
    } finally {
      setBusy(false)
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
    setResetResult(null)
  }

  if (navigating || user === undefined || (busy && mode !== 'request')
    || (user && !failure && access?.userId !== user.id)) {
    return <PagePreloader />
  }

  const trainer = !!user && access?.userId === user.id && access.trainer
  const recovery = trainer && mode === 'recovery'
  if (trainer && !recovery) {
    return <App portal={{ client, signOut }} />
  }

  return (
    <main className="portal-surface trainer-gate">
      <PortalBackdrop />
      <header className="trainer-topbar">
        <Button variant="ghost" className="trainer-return" asChild>
          <a href="/" aria-label="Public Evaluations"><Globe aria-hidden="true" />Evaluations</a>
        </Button>
      </header>
      <div className="trainer-gate-body">
        {user === undefined || (user && !failure && access?.userId !== user.id) ? (
          <p role="status">Loading MUC…</p>
        ) : failure ? (
          <div className="trainer-status space-y-3"><p role="alert">Could not check trainer access.</p><Button variant="outline" onClick={() => void signOut()}>Sign out</Button></div>
        ) : user && !recovery ? (
          <div className="trainer-status space-y-3">
            <p role="alert">This account does not have trainer access.</p>
            <Button variant="outline" onClick={() => void signOut()}>Sign out</Button>
          </div>
        ) : (
          <Card className="trainer-glass" data-reset={mode === 'request'}>
            <CardHeader className="trainer-card-heading">
              <img className="trainer-card-logo" src={brand.logo} width={94} height={43} alt={brand.name} />
              <CardTitle><h1>{recovery ? 'Set Trainer Password' : mode === 'request' ? 'Reset Password' : 'Coordinator Teacher Login'}</h1></CardTitle>
            </CardHeader>
            <CardContent>
              {mode === 'request' && resetResult && (
                <p className="trainer-recovery-note" role={resetResult === 'unregistered' ? 'alert' : 'status'}>
                  {resetResult === 'unregistered'
                    ? 'No email was sent because this address is not registered in System. Contact the Coordinator Teacher.'
                    : 'Check your email for the password reset link. If it does not arrive, contact the Coordinator Teacher.'}
                </p>
              )}
              {!(mode === 'request' && resetResult === 'sent') && (
                <form className="trainer-credentials" onSubmit={(event) => { event.preventDefault(); void submitCredentials() }}>
                  {!recovery && <>
                    <Label htmlFor="portal-email">Email address</Label>
                    <Input id="portal-email" type="email" autoComplete="username" maxLength={254} disabled={busy} required value={email}
                      onChange={(event) => { setEmail(event.target.value); setResetResult(null) }} />
                  </>}
                  {mode !== 'request' && <>
                    <Label htmlFor="portal-password">{recovery ? 'New password' : 'Password'}</Label>
                    <div className="trainer-password">
                      <Input id="portal-password" type={showPassword ? 'text' : 'password'} autoComplete={recovery ? 'new-password' : 'current-password'}
                        minLength={recovery ? 8 : undefined} required value={password}
                        onChange={(event) => setPassword(event.target.value)} />
                      <Button type="button" variant="ghost" size="icon" className="trainer-password-toggle"
                        aria-label={showPassword ? 'Hide password' : 'Show password'} aria-controls="portal-password"
                        onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff /> : <Eye />}
                      </Button>
                    </div>
                  </>}
                  <Button className="trainer-submit" disabled={busy} aria-busy={busy} type="submit">
                    {busy && <LoaderCircle className="trainer-submit-spinner" aria-hidden="true" />}
                    {busy ? 'Please wait…'
                      : recovery ? 'Save password' : mode === 'request' ? 'Send password reset link' : 'Sign in'}
                  </Button>
                </form>
              )}
              {!recovery && <Button className="trainer-reset" variant="link" disabled={busy} onClick={() => {
                setMode(mode === 'request' ? 'login' : 'request')
                setPassword('')
                setShowPassword(false)
                setResetResult(null)
              }}>{mode === 'request' ? 'Back to sign in' : 'Set or reset password'}</Button>}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
