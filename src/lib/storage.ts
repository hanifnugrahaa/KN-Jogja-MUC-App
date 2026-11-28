import { blankEvaluation, defaultThresholds, workspaceSchema } from './evaluation'
import type { Workspace } from './evaluation'
import { z } from 'zod'

const key = 'koding-next-muc-v1'
const legacyOwnerKey = key + ':legacy-owner'
export const moduleAgeLabels = { '8-12': '8–12', '12-16': '12–16', both: '8–12 & 12–16' } as const
const entryName = z.string().trim().min(1).max(120)
const directoryEntry = z.object({ name: entryName, age: z.enum(['8-12', '12-16', 'both']).optional() })
export type DirectoryEntry = z.infer<typeof directoryEntry>
export type Directory = 'teacher' | 'module'

const directories: Record<Directory, { key: string; entries: DirectoryEntry[] }> = {
  teacher: {
    key: 'koding-next-muc-teachers-v1',
    entries: ['Mr Ahsan', 'Mr Luthfi', 'Ms Karin', 'Ms Azizah', 'Mr Roy', 'Ms Audia'].map((name) => ({ name })),
  },
  module: {
    key: 'koding-next-muc-modules-v1',
    entries: [
      ...['2D Games and AI', 'Minecraft I', 'Minecraft II', 'Roblox I', 'Roblox II', 'Unity 2D Game Development',
        'AI - First Steps', 'Mobile Apps Development', 'Vibe Coding', '2D & 3D Design'].map((name) => ({ name, age: '8-12' as const })),
      { name: 'Cyber Security', age: 'both' },
      ...['Python First', 'Artificial Intelligence', 'Internet of Things', 'Future Engineer', 'SpaceTech',
        'Website Dev & Ai', 'JavaScript', 'Python Arcade', 'Unity 3D Development'].map((name) => ({ name, age: '12-16' as const })),
    ],
  },
}
const storedEntries = z.array(z.union([entryName, directoryEntry]))

export function loadDirectory(directory: Directory): DirectoryEntry[] {
  const { key, entries } = directories[directory]
  try {
    const saved = localStorage.getItem(key)
    if (saved !== null) {
      return storedEntries.parse(JSON.parse(saved)).map((entry) => typeof entry === 'string'
        ? { name: entry, age: entries.find(({ name }) => name.toLowerCase() === entry.toLowerCase())?.age }
        : entry)
    }
  } catch {
    return entries
  }
  return entries
}

export function saveDirectory(directory: Directory, entries: DirectoryEntry[]) {
  const values = directory === 'teacher' ? entries.map(({ name }) => name) : entries
  localStorage.setItem(directories[directory].key, JSON.stringify(storedEntries.parse(values)))
}

export function loadWorkspace(owner?: string): { workspace: Workspace; error: boolean } {
  try {
    const legacyOwner = localStorage.getItem(legacyOwnerKey)
    let saved = localStorage.getItem(owner ? `${key}:${owner}` : key)
    if (!saved && owner && (!legacyOwner || legacyOwner === owner)) saved = localStorage.getItem(key)
    if (saved) return { workspace: workspaceSchema.parse(JSON.parse(saved)), error: false }
  } catch {
    return { workspace: newWorkspace(), error: true }
  }
  return { workspace: newWorkspace(), error: false }
}

function newWorkspace(): Workspace {
  return { draft: blankEvaluation(), editingId: null, records: [], thresholds: defaultThresholds }
}

export function saveWorkspace(workspace: Workspace, owner?: string) {
  if (owner && !localStorage.getItem(legacyOwnerKey) && localStorage.getItem(key)) {
    localStorage.setItem(legacyOwnerKey, owner)
  }
  localStorage.setItem(owner ? `${key}:${owner}` : key, JSON.stringify(workspace))
}
