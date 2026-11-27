import type { SupabaseClient } from '@supabase/supabase-js'
import { ShareEvaluation } from '@/features/share-evaluation'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ChevronRight, ClipboardCheck, HardDrive, FilePlus2, FileText, Globe, History, Info, LayoutGrid, LogOut,
  Menu, RotateCcw, Save, Settings2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Toaster } from '@/components/ui/sonner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { EvaluationForm } from '@/features/evaluation-form'
import { EvaluationHistory } from '@/features/history'
import { ReportPreview } from '@/features/report-preview'
import { Settings } from '@/features/settings'
import { Summary } from '@/features/summary'
import { brand } from '@/lib/brand'
import { assess, blankEvaluation, evaluationSchema } from '@/lib/evaluation'
import type { Evaluation, SavedEvaluation, Thresholds } from '@/lib/evaluation'
import { reportData } from '@/lib/report'
import type { Report } from '@/lib/report'
import { loadWorkspace, saveWorkspace } from '@/lib/storage'

const pages = {
  evaluation: { label: 'New Evaluation', icon: FilePlus2, description: 'Assess a coding teacher candidate’s live MUC session.' },
  history: { label: 'Evaluation History', icon: History, description: 'Find, manage, and export saved MUC evaluations.' },
  settings: { label: 'Settings', icon: Settings2, description: 'Configure how final scores translate into recommendations.' },
}
type Page = keyof typeof pages

function currentPage(): Page {
  const hash = window.location.hash.slice(1)
  return hash === 'history' || hash === 'settings' ? hash : 'evaluation'
}

function Sidebar({ page, onNavigate, onSignOut }: { page: Page; onNavigate: (opensEvaluation: boolean) => void; onSignOut?: () => Promise<void> }) {
  return (
    <div className="sidebar-inner">
      <div className="sidebar-brand">
        <img src={brand.logo} width={95} height={43} alt="Koding Next" />
      </div>
      <div className="sidebar-identity">
        <span className="sidebar-identity-icon"><ClipboardCheck size={19} /></span>
        <div><strong>MUC</strong><span>Evaluation System</span></div>
      </div>
      <nav aria-label="Main navigation" className="navigation">
        <p>WORKSPACE</p>
        {Object.entries(pages).map(([key, { label, icon: Icon }]) => (
          <a key={key} href={'#' + key} aria-current={key === page ? 'page' : undefined} onClick={() => onNavigate(key === 'evaluation')}>
            <Icon size={18} /><span>{label}</span>{key === page && <ChevronRight className="navigation-chevron" size={15} />}
          </a>
        ))}
      </nav>
      <div className="sidebar-footer">
        {onSignOut && (
          <div className="trainer-nav-actions" role="group" aria-label="Trainer navigation">
            <Button variant="ghost" className="trainer-nav-public" asChild>
              <a href="/"><span className="trainer-nav-icon"><Globe aria-hidden="true" /></span>Public Evaluations</a>
            </Button>
            <Button type="button" variant="ghost" className="trainer-nav-signout" onClick={() => void onSignOut()}>
              <span className="trainer-nav-icon"><LogOut aria-hidden="true" /></span>Sign out
            </Button>
          </div>
        )}
        <strong>Koding Next Yogyakarta</strong>
        <span>Made by Coordinator Teacher</span>
      </div>
    </div>
  )
}

type Confirmation = { title: string; description: string; action: string; run: () => void }

export default function App({ portal }: { portal?: { client: SupabaseClient; signOut: () => Promise<void> } } = {}) {
  const [sharing, setSharing] = useState<SavedEvaluation | null>(null)
  const [{ workspace, error }] = useState(loadWorkspace)
  const [records, setRecords] = useState(workspace.records)
  const [editingId, setEditingId] = useState(workspace.editingId)
  const [thresholds, setThresholds] = useState(workspace.thresholds)
  const [page, setPage] = useState(currentPage)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [storageError, setStorageError] = useState(error)
  const [report, setReport] = useState<Report | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const lastSaved = useRef(JSON.stringify(workspace))
  const focusAfterClose = useRef<HTMLElement | null>(null)
  const mobileMenu = useRef<HTMLButtonElement>(null)
  const form = useForm<Evaluation>({ defaultValues: workspace.draft, resolver: zodResolver(evaluationSchema) })
  const draft = useWatch({ control: form.control, compute: (values: Evaluation) => values })
  const result = assess(draft, thresholds)
  const editing = records.find(({ id }) => id === editingId)
  const editingHasChanges = editing && JSON.stringify(draft) !== JSON.stringify(editing.evaluation)

  useEffect(() => {
    function navigate() {
      setPage(currentPage())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', navigate)
    return () => window.removeEventListener('hashchange', navigate)
  }, [])

  useEffect(() => {
    const next = { draft, records, editingId, thresholds }
    const serialized = JSON.stringify(next)
    if (serialized === lastSaved.current) return
    try {
      saveWorkspace(next)
      lastSaved.current = serialized
      setStorageError(false)
    } catch {
      setStorageError(true)
    }
  }, [draft, records, editingId, thresholds])

  function commit(next: typeof workspace) {
    try {
      saveWorkspace(next)
      lastSaved.current = JSON.stringify(next)
      setStorageError(false)
      return true
    } catch {
      setStorageError(true)
      toast.error('Browser storage is unavailable. Changes could not be saved.')
      return false
    }
  }

  function saveEvaluation(evaluation: Evaluation) {
    const record = { id: editing?.id ?? crypto.randomUUID(), savedAt: new Date().toISOString(), evaluation, thresholds }
    const nextRecords = [record, ...records.filter(({ id }) => id !== record.id)]
    if (!commit({ draft: evaluation, records: nextRecords, editingId: record.id, thresholds })) return
    setRecords(nextRecords)
    setEditingId(record.id)
    form.reset(evaluation)
    toast.success(editing ? 'Evaluation updated' : 'Evaluation saved')
  }

  function openPreview(evaluation: Evaluation, activeThresholds: Thresholds) {
    focusAfterClose.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setReport(reportData(evaluation, activeThresholds))
  }

  function confirm(next: Confirmation) {
    focusAfterClose.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setConfirmation(next)
  }

  function clearForm() {
    const nextDraft = blankEvaluation()
    if (!commit({ draft: nextDraft, records, editingId: null, thresholds })) return false
    form.reset(nextDraft)
    setEditingId(null)
    return true
  }

  function startEvaluation() {
    if (!editing) return
    if (!editingHasChanges) {
      clearForm()
      return
    }
    confirm({
      title: 'Start a new evaluation?',
      description: 'Starting a new evaluation will replace unsaved changes in the current draft.',
      action: 'Start new evaluation', run: clearForm,
    })
  }

  function resetEvaluation() {
    confirm({
      title: 'Reset this evaluation?',
      description: 'This clears the working form and its draft. Saved evaluations remain available in Evaluation History.',
      action: 'Reset form',
      run: () => { if (clearForm()) toast.success('Evaluation form reset') },
    })
  }

  function deleteEvaluation(record: SavedEvaluation) {
    confirm({
      title: 'Delete this evaluation?',
      description: 'The saved evaluation for ' + record.evaluation.candidate + ' will be permanently removed from this browser.' + (portal ? ' Any shared or published copy will also be removed.' : ''),
      action: 'Delete evaluation',
      run: async () => {
        if (portal) {
          const { error } = await portal.client.from('muc_shared_evaluations').delete().eq('id', record.id)
          if (error) { toast.error('Could not remove the published or shared copy. The evaluation was kept.'); return }
        }
        const nextRecords = records.filter(({ id }) => record.id !== id)
        const nextEditingId = editingId === record.id ? null : editingId
        const nextDraft = editingId === record.id && !editingHasChanges ? blankEvaluation() : form.getValues()
        if (!commit({ draft: nextDraft, records: nextRecords, editingId: nextEditingId, thresholds })) return
        setRecords(nextRecords)
        setEditingId(nextEditingId)
        form.reset(nextDraft)
        toast.success('Evaluation deleted')
      },
    })
  }

  function openRecord(record: SavedEvaluation, duplicate = false) {
    const open = () => {
      form.reset(record.evaluation)
      setEditingId(duplicate ? null : record.id)
      window.location.hash = 'evaluation'
      if (duplicate) toast.success('Evaluation copied to a new draft')
    }
    const hasWork = draft.candidate || draft.topic || draft.evaluator || draft.notes || result.assessed
      || draft.branch !== 'Yogyakarta' || draft.date !== blankEvaluation().date
    const hasUnsavedDraft = editing ? editingHasChanges : !!hasWork
    if (hasUnsavedDraft) {
      confirm({
        title: 'Replace the current draft?',
        description: 'Opening this evaluation will replace unsaved work in the form.',
        action: 'Replace draft', run: open,
      })
    } else {
      open()
    }
  }

  function saveThresholds(next: Thresholds) {
    if (!commit({ draft: form.getValues(), records, editingId, thresholds: next })) return false
    setThresholds(next)
    toast.success('Recommendation thresholds saved')
    return true
  }

  function focusValidation() {
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('.evaluation-fields [aria-invalid="true"], .rubric-error')?.scrollIntoView({ block: 'center' })
      const first = document.querySelector<HTMLElement>('.evaluation-fields [aria-invalid="true"], .rubric-card:has(.rubric-error) .rating-group button')
      first?.focus({ preventScroll: true })
    })
  }

  const title = page === 'evaluation' && editing ? 'Edit Evaluation' : pages[page].label
  return (
    <TooltipProvider delayDuration={160}>
      <a className="skip-link" href="#main-content" onClick={(event) => {
        event.preventDefault()
        document.getElementById('main-content')?.focus()
      }}>Skip to content</a>
      <div className="app-shell">
        <aside className="desktop-sidebar"><Sidebar page={page} onSignOut={portal?.signOut} onNavigate={(opensEvaluation) => { if (opensEvaluation) startEvaluation() }} /></aside>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="mobile-sidebar" onCloseAutoFocus={(event) => { event.preventDefault(); mobileMenu.current?.focus() }}>
            <SheetTitle className="sr-only">Workspace navigation</SheetTitle>
            <SheetDescription className="sr-only">Navigate the evaluation workspace.</SheetDescription>
            <Sidebar page={page} onSignOut={portal?.signOut} onNavigate={(opensEvaluation) => { setMobileOpen(false); if (opensEvaluation) startEvaluation() }} />
          </SheetContent>
        </Sheet>
        <div className="app-workspace">
          <header className="topbar">
            <div className="topbar-inner">
              <Button ref={mobileMenu} variant="ghost" size="icon" className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu /></Button>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem><LayoutGrid size={15} /><span className="breadcrumb-home">Workspace</span></BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem><BreadcrumbPage>{title}</BreadcrumbPage></BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              {storageError && (
                <div className="storage-status storage-error" role="status">
                  <HardDrive size={16} />
                  <span>Storage unavailable</span>
                </div>
              )}
            </div>
          </header>
          <main id="main-content" tabIndex={-1} className="main-content">
            <div className="page-heading">
              <div className="flex items-center gap-2">
                <h1>{title}</h1>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="guidance shrink-0" aria-label={title + ' information'}>
                      <Info size={17} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{pages[page].description}</TooltipContent>
                </Tooltip>
              </div>
            </div>
            {page === 'evaluation' && (
              <form id="evaluation-form" noValidate onSubmit={(event) => void form.handleSubmit(saveEvaluation, focusValidation)(event)}>
                <p className="required-hint"><span className="required">*</span> Required field</p>
                <div className="evaluation-layout">
                  <div className="form-column">
                    <EvaluationForm form={form} result={result} notes={draft.notes} />
                    <div className="form-footer" role="group" aria-labelledby="evaluation-actions-title">
                      <h2 id="evaluation-actions-title">Evaluation Actions</h2>
                      <div className="form-actions">
                        <Button type="button" variant="ghost" aria-label="Reset Form" onClick={resetEvaluation}>
                          <RotateCcw /><span className="form-action-full">Reset Form</span><span className="form-action-short">Reset</span>
                        </Button>
                        <Button type="button" variant="outline" aria-label="Preview Report"
                          onClick={() => void form.handleSubmit((evaluation) => openPreview(evaluation, thresholds), focusValidation)()}>
                          <FileText /><span className="form-action-full">Preview Report</span><span className="form-action-short">Preview</span>
                        </Button>
                        <Button type="submit" aria-label={editing ? 'Save Changes' : 'Save Evaluation'}>
                          <Save /><span className="form-action-full">{editing ? 'Save Changes' : 'Save Evaluation'}</span><span className="form-action-short">Save</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Summary result={result} notes={draft.notes} override={draft.override} onOverride={(value) => form.setValue('override', value, { shouldDirty: true })} />
                </div>
              </form>
            )}
            {page === 'history' && <EvaluationHistory records={records} onEdit={openRecord} onDuplicate={(row) => openRecord(row, true)}
              onDelete={deleteEvaluation} onShare={portal ? setSharing : undefined} onPreview={(row) => openPreview(row.evaluation, row.thresholds)}
              onNew={() => { window.location.hash = 'evaluation' }} />}
            {page === 'settings' && <Settings thresholds={thresholds} onSave={saveThresholds} />}
          </main>
        </div>
      </div>
      {portal && sharing && <ShareEvaluation client={portal.client} record={sharing} onClose={() => setSharing(null)} />}
      <ReportPreview report={report} onClose={() => {
        setReport(null)
        requestAnimationFrame(() => focusAfterClose.current?.focus())
      }} />
      <AlertDialog open={!!confirmation} onOpenChange={(open) => { if (!open) setConfirmation(null) }}>
        <AlertDialogContent onCloseAutoFocus={(event) => {
          event.preventDefault()
          const previous = focusAfterClose.current
          if (previous?.isConnected) previous.focus()
          else document.getElementById('main-content')?.focus()
        }}>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmation?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmation?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => confirmation?.run()}>{confirmation?.action}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {!portal && <Toaster position="bottom-right" richColors />}
    </TooltipProvider>
  )
}
