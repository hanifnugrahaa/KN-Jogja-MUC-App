import { blankEvaluation, defaultThresholds, workspaceSchema } from './evaluation'
import type { Workspace } from './evaluation'
import { z } from 'zod'

const key = 'koding-next-muc-v1'
const teachersKey = 'koding-next-muc-teachers-v1'
const defaultTeachers = ['Mr Ahsan', 'Mr Luthfi', 'Ms Karin', 'Ms Azizah', 'Mr Roy', 'Ms Audia']
const teacherList = z.array(z.string().trim().min(1).max(120))

export function loadTeachers(): string[] {
  try {
    const saved = localStorage.getItem(teachersKey)
    if (saved !== null) return teacherList.parse(JSON.parse(saved))
  } catch {
    return defaultTeachers
  }
  return defaultTeachers
}

export function saveTeachers(teachers: string[]) {
  localStorage.setItem(teachersKey, JSON.stringify(teacherList.parse(teachers)))
}

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
