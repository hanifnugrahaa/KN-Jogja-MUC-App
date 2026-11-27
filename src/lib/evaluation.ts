import { z } from 'zod'

export const rubric = [
  { id: 'preparation', label: 'Preparation', weight: 10, guidance: 'Lesson plan, materials, and technical setup are ready.' },
  { id: 'opening', label: 'Opening & Engagement', weight: 10, guidance: 'Captures interest and introduces clear learning objectives.' },
  { id: 'technical', label: 'Technical Knowledge', weight: 20, guidance: 'Explains coding concepts accurately and handles technical questions.' },
  { id: 'delivery', label: 'Teaching Delivery', weight: 20, guidance: 'Structures the lesson clearly, with effective pacing and demonstrations.' },
  { id: 'communication', label: 'Communication Skills', weight: 10, guidance: 'Uses clear language, appropriate examples, and accessible instructions.' },
  { id: 'interaction', label: 'Student Interaction', weight: 15, guidance: 'Invites participation, checks understanding, and gives feedback.' },
  { id: 'management', label: 'Classroom Management', weight: 10, guidance: 'Manages time, transitions, and student behavior effectively.' },
  { id: 'closing', label: 'Lesson Closing', weight: 5, guidance: 'Recaps key concepts and checks that the learning objectives were met.' },
] as const

export const ratingLabels = ['Poor', 'Needs Improvement', 'Satisfactory', 'Good', 'Excellent'] as const
export const recommendations = ['Highly Recommended', 'Recommended', 'Recommended with Grooming', 'Not Recommended'] as const
export const defaultThresholds = { high: 85, recommended: 75, conditional: 60 }
export const thresholdSchema = z.object({
  high: z.number().int().min(1).max(100),
  recommended: z.number().int().min(1).max(99),
  conditional: z.number().int().min(1).max(98),
}).refine(({ high, recommended, conditional }) => high > recommended && recommended > conditional, {
  message: 'Minimum scores must decrease from the highest recommendation to the lowest.', path: ['high'],
})

const rubricId = z.enum(rubric.map(({ id }) => id))
const ratingSchema = z.partialRecord(rubricId, z.number().int().min(1).max(5))
const overrideSchema = z.union([z.enum(recommendations), z.literal('automatic')])
const details = {
  candidate: 'Teacher Name',
  topic: 'Module / Lesson',
  evaluator: 'Supervisor Name',
  date: 'Evaluation Date',
  branch: 'Center / Branch',
} as const
export const detailFields = Object.entries(details) as [keyof typeof details, string][]
export const draftSchema = z.object({
  candidate: z.string(), topic: z.string(), evaluator: z.string(), date: z.string(), branch: z.string(),
  ratings: ratingSchema, notes: z.string(), override: overrideSchema,
})
export const evaluationSchema = draftSchema.extend({
  candidate: z.string().trim().min(1, 'Enter the Teacher Name.').max(120),
  topic: z.string().trim().min(1, 'Enter the topic or module.').max(120),
  evaluator: z.string().trim().min(1, 'Enter the Supervisor Name.').max(120),
  date: z.iso.date({ error: 'Select an evaluation date.' }),
  branch: z.string().trim().min(1, 'Enter the center or branch.').max(120),
  notes: z.string().trim().max(4000, 'Use 4,000 characters or fewer.'),
  ratings: ratingSchema.refine((ratings) => rubric.every(({ id }) => ratings[id] !== undefined), 'Rate all eight criteria.'),
})
export const recordSchema = z.object({
  id: z.string(), savedAt: z.iso.datetime(), evaluation: evaluationSchema, thresholds: thresholdSchema,
})
export const workspaceSchema = z.object({
  draft: draftSchema, editingId: z.string().nullable(), records: z.array(recordSchema), thresholds: thresholdSchema,
})

export type Evaluation = z.infer<typeof evaluationSchema>
export type Thresholds = z.infer<typeof thresholdSchema>
export type SavedEvaluation = z.infer<typeof recordSchema>
export type Workspace = z.infer<typeof workspaceSchema>
export type Recommendation = typeof recommendations[number]

export function localDate(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date + 'T00:00:00'))
}

export function blankEvaluation(): Evaluation {
  return { candidate: '', topic: '', evaluator: '', date: localDate(), branch: 'Yogyakarta', ratings: {}, notes: '', override: 'automatic' }
}

export const totalWeight = rubric.reduce((total, row) => total + row.weight, 0)

export function assess(evaluation: Evaluation, thresholds: Thresholds) {
  const breakdown = rubric.map((criterion) => {
    const rating = evaluation.ratings[criterion.id]
    return { ...criterion, rating, weighted: rating === undefined ? undefined : rating * criterion.weight / 5 }
  })
  const score = breakdown.reduce((total, row) => total + (row.weighted ?? 0), 0)
  const assessed = breakdown.filter((row) => row.rating !== undefined).length
  const automatic = score >= thresholds.high ? recommendations[0]
    : score >= thresholds.recommended ? recommendations[1]
      : score >= thresholds.conditional ? recommendations[2] : recommendations[3]
  const recommendation = assessed < rubric.length ? undefined
    : evaluation.override === 'automatic' ? automatic : evaluation.override
  return { breakdown, score, assessed, recommendation }
}
