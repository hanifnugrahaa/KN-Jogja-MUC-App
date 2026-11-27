import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assess, blankEvaluation, defaultThresholds, evaluationSchema, recommendations, rubric, thresholdSchema, totalWeight, workspaceSchema } from '../src/lib/evaluation.ts'

function allRated(rating) {
  return { ...blankEvaluation(), ratings: Object.fromEntries(rubric.map(({ id }) => [id, rating])) }
}

test('weights total 100 and each rating produces the exact weighted score', () => {
  assert.equal(totalWeight, 100)
  for (let rating = 1; rating <= 5; rating++) {
    const result = assess(allRated(rating), defaultThresholds)
    assert.equal(result.score, rating * 20)
    assert.equal(result.assessed, 8)
    for (const row of result.breakdown) assert.equal(row.weighted, row.weight * rating / 5)
  }
})

test('recommendations honor each inclusive cutoff and complete manual overrides', () => {
  const atBoundary = { ...allRated(4), ratings: { ...allRated(4).ratings, technical: 5, closing: 5 } }
  assert.equal(assess(atBoundary, defaultThresholds).score, 85)
  assert.equal(assess(atBoundary, defaultThresholds).recommendation, recommendations[0])
  assert.equal(assess({ ...atBoundary, ratings: { ...atBoundary.ratings, closing: 4 } }, defaultThresholds).recommendation, recommendations[1])
  const at75 = { ...allRated(4), ratings: { ...allRated(4).ratings, technical: 3, closing: 3 } }
  assert.equal(assess(at75, defaultThresholds).score, 75)
  assert.equal(assess(at75, defaultThresholds).recommendation, recommendations[1])
  assert.equal(assess({ ...at75, ratings: { ...at75.ratings, closing: 2 } }, defaultThresholds).recommendation, recommendations[2])
  assert.equal(assess(allRated(3), defaultThresholds).recommendation, recommendations[2])
  assert.equal(assess({ ...allRated(3), ratings: { ...allRated(3).ratings, closing: 2 } }, defaultThresholds).recommendation, recommendations[3])
  assert.equal(assess(allRated(5), { high: 100, recommended: 90, conditional: 80 }).recommendation, recommendations[0])
  assert.equal(assess({ ...allRated(5), override: recommendations[3] }, defaultThresholds).recommendation, recommendations[3])
  assert.equal(assess({ ...atBoundary, ratings: { ...atBoundary.ratings, closing: undefined }, override: recommendations[0] }, defaultThresholds).recommendation, undefined)
})

test('form validation permits Indonesian notes and local draft recovery permits incomplete evaluations', () => {
  const evaluation = { ...allRated(4), candidate: '  Mr Ahsan ', evaluator: 'Mr Hanif', topic: 'Scratch', notes: 'Penjelasan jelas dan mudah dipahami.' }
  assert.equal(evaluationSchema.parse(evaluation).candidate, 'Mr Ahsan')
  assert.equal(evaluationSchema.safeParse({ ...evaluation, ratings: { preparation: 5 } }).success, false)
  assert.equal(evaluationSchema.safeParse({ ...evaluation, date: '2026-02-29' }).success, false)
  assert.equal(thresholdSchema.safeParse({ high: 85, recommended: 85, conditional: 60 }).success, false)
  assert.equal(workspaceSchema.safeParse({ draft: blankEvaluation(), editingId: null, records: [], thresholds: defaultThresholds }).success, true)
})

test('Gemini endpoint validates notes and returns a mocked professional rewrite', async (t) => {
  const { createServer } = await import('node:http')
  const { geminiNotes } = await import('../server/gemini.ts')
  const realFetch = globalThis.fetch
  const mock = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.match(url, /gemini-3\.1-flash-lite:generateContent$/)
    assert.equal(options.headers['x-goog-api-key'], 'test-key')
    assert.equal(JSON.parse(options.body).contents[0].parts[0].text, 'opening bagus')
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'Pembukaan disampaikan dengan baik.' }] } }] })
  })
  for (const [key, notes, status] of [['test-key', ' ', 400], ['', 'opening bagus', 503], ['test-key', 'opening bagus', 200]]) {
    const server = createServer(geminiNotes(key))
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    try {
      const response = await realFetch('http://127.0.0.1:' + server.address().port, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes }),
      })
      assert.equal(response.status, status)
      if (status === 200) assert.deepEqual(await response.json(), { notes: 'Pembukaan disampaikan dengan baik.' })
    } finally {
      await new Promise((resolve) => server.close(resolve))
    }
  }
  assert.equal(mock.mock.callCount(), 1)
})
