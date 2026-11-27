import { blankEvaluation, defaultThresholds, workspaceSchema } from './evaluation'
import type { Workspace } from './evaluation'

const key = 'koding-next-muc-v1'

export function loadWorkspace(): { workspace: Workspace; error: boolean } {
  try {
    const saved = localStorage.getItem(key)
    if (saved) return { workspace: workspaceSchema.parse(JSON.parse(saved)), error: false }
  } catch {
    return { workspace: newWorkspace(), error: true }
  }
  return { workspace: newWorkspace(), error: false }
}

function newWorkspace(): Workspace {
  return { draft: blankEvaluation(), editingId: null, records: [], thresholds: defaultThresholds }
}

export function saveWorkspace(workspace: Workspace) {
  localStorage.setItem(key, JSON.stringify(workspace))
}
