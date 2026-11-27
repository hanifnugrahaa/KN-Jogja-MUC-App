import { brand } from './brand'
import { assess, detailFields, formatDate, totalWeight } from './evaluation'
import type { Evaluation, Thresholds } from './evaluation'

export const reportColumns = ['Assessment Criterion', 'Weight', 'Rating', 'Weighted Score']

export function reportData(evaluation: Evaluation, thresholds: Thresholds) {
  const result = assess(evaluation, thresholds)
  return {
    details: detailFields.map(([key, label]) => [label, key === 'date' ? formatDate(evaluation.date) : evaluation[key]]),
    rows: result.breakdown.map(({ label, weight, rating, weighted }) => [label, String(weight), rating + '/5', weighted + '/' + weight]),
    score: result.score + '/' + totalWeight,
    recommendation: result.recommendation ?? 'Pending assessment',
    notes: evaluation.notes || 'No notes provided.',
    evaluator: evaluation.evaluator,
  }
}

export type Report = ReturnType<typeof reportData>

export function reportFilename(candidate: string, extension: string) {
  const safeName = candidate.replace(/[^\p{L}\p{N}-]+/gu, '-').replace(/^-+|-+$/g, '') || 'candidate'
  return 'MUC-' + safeName + '.' + extension
}

export async function reportLogo() {
  const response = await fetch(brand.logo)
  if (!response.ok) throw new Error('The Koding Next logo could not be loaded.')
  return new Uint8Array(await response.arrayBuffer())
}
