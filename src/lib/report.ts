import { brand } from './brand'
import type { ReportSignature } from './report-signature'
import { assess, detailFields, formatDate, totalWeight } from './evaluation'
import type { Evaluation, Thresholds } from './evaluation'

export const reportColumns = ['Assessment Criterion', 'Weight', 'Rating', 'Weighted Score']

export function reportData(evaluation: Evaluation, thresholds: Thresholds) {
  const result = assess(evaluation, thresholds)
  const isHanif = /^(?:mr\.?\s+)?hanif(?:\s+ardiyanta)?$/i.test(evaluation.evaluator.trim())
  return {
    details: detailFields.filter(([key]) => key !== 'lesson' || evaluation.lesson)
      .map(([key, label]) => [label, key === 'date' ? formatDate(evaluation.date) : (evaluation[key] ?? '')]),
    rows: result.breakdown.map(({ label, weight, rating, weighted }) => [label, String(weight), rating + '/5', weighted + '/' + weight]),
    score: result.score + '/' + totalWeight,
    recommendation: result.recommendation ?? 'Pending assessment',
    notes: evaluation.notes || 'No notes provided.',
    evaluator: isHanif ? 'Mr Hanif' : evaluation.evaluator,
    evaluatorRole: isHanif ? 'Coordinator Teacher' : undefined,
  }
}

export type Report = ReturnType<typeof reportData> & { signature?: ReportSignature }

export function reportFilename(candidate: string, extension: string) {
  const safeName = candidate.replace(/[^\p{L}\p{N}-]+/gu, '-').replace(/^-+|-+$/g, '') || 'candidate'
  return 'MUC-' + safeName + '.' + extension
}

export async function reportLogo() {
  const response = await fetch(brand.logo)
  if (!response.ok) throw new Error('The Koding Next logo could not be loaded.')
  return new Uint8Array(await response.arrayBuffer())
}
