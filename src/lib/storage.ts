import { blankEvaluation, defaultThresholds, workspaceSchema } from './evaluation'
import type { Workspace } from './evaluation'
import { z } from 'zod'

const key = 'koding-next-muc-v1'
const directories = {
  teacher: {
    key: 'koding-next-muc-teachers-v1',
    names: ['Mr Ahsan', 'Mr Luthfi', 'Ms Karin', 'Ms Azizah', 'Mr Roy', 'Ms Audia'],
  },
  module: {
    key: 'koding-next-muc-modules-v1',
    names: [
      '2D Games and AI', 'Minecraft I', 'Minecraft II', 'Roblox I', 'Roblox II', 'Unity 2D Game Development',
      'AI - First Steps', 'Mobile Apps Development', 'Vibe Coding', '2D & 3D Design', 'Cyber Security',
      'Python First', 'Artificial Intelligence', 'Internet of Things', 'Future Engineer', 'SpaceTech',
      'Website Dev & Ai', 'JavaScript', 'Python Arcade', 'Unity 3D Development',
    ],
  },
}
export type Directory = keyof typeof directories
const directoryNames = z.array(z.string().trim().min(1).max(120))

export function loadDirectory(directory: Directory): string[] {
  const { key, names } = directories[directory]
  try {
    const saved = localStorage.getItem(key)
    if (saved !== null) return directoryNames.parse(JSON.parse(saved))
  } catch {
    return names
  }
  return names
}

export function saveDirectory(directory: Directory, names: string[]) {
  localStorage.setItem(directories[directory].key, JSON.stringify(directoryNames.parse(names)))
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
