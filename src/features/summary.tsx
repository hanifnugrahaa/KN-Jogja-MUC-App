import { ChartNoAxesColumnIncreasing, ClipboardCheck, Clock3 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { assess, recommendations, rubric, totalWeight } from '@/lib/evaluation'
import type { Evaluation } from '@/lib/evaluation'

export function RecommendationBadge({ value }: { value: ReturnType<typeof assess>['recommendation'] }) {
  const tone = value === recommendations[0] ? 'positive' : value === recommendations[1] ? 'recommended'
    : value === recommendations[2] ? 'conditional' : value === recommendations[3] ? 'negative' : 'pending'
  return <Badge className={'recommendation-badge ' + tone}>{!value && <Clock3 size={13} />}{value ?? 'Pending assessment'}</Badge>
}

export function Summary({ result, notes, override, onOverride }: {
  result: ReturnType<typeof assess>; notes: string; override: Evaluation['override']; onOverride: (value: Evaluation['override']) => void
}) {
  const { score, assessed, recommendation, breakdown } = result
  return (
    <aside className="summary-column" aria-label="Evaluation summary">
      <Card className="workspace-card summary-card">
        <CardHeader className="section-heading">
          <span className="section-icon"><ChartNoAxesColumnIncreasing /></span>
          <CardTitle><h2>Evaluation Summary</h2></CardTitle>
        </CardHeader>
        <CardContent className="summary-content">
          <div className="score-panel">
            <div className="score-label">Final Score</div>
            <div className="score-value" aria-live="polite"><strong>{score}</strong><span>/ {totalWeight}</span></div>
            <Progress value={score} aria-label="Weighted score" className="score-progress" />
            <div className="criteria-status">{assessed} of {rubric.length} criteria assessed</div>
          </div>

          <section className="summary-section">
            <h3>Assessment Breakdown</h3>
            <dl className="breakdown">
              {breakdown.map(({ label, id, weight, weighted }) => (
                <div key={id}><dt>{label}</dt><dd>{weighted ?? '—'} <span>/ {weight}</span></dd></div>
              ))}
            </dl>
          </section>

          <section className="summary-section recommendation">
            <h3><ClipboardCheck size={16} /> Recommendation</h3>
            <RecommendationBadge value={recommendation} />
            {recommendation ? (
              <div className="override-field">
                <Label htmlFor="recommendation-override">Recommendation override</Label>
                <Select value={override} onValueChange={onOverride}>
                  <SelectTrigger id="recommendation-override"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="automatic">Automatic recommendation</SelectItem>
                    {recommendations.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : <p>Rate all eight criteria to generate a recommendation.</p>}
          </section>
          {notes.trim() && (
            <section className="summary-section summary-notes">
              <h3><a href="#evaluation-notes" onClick={(event) => {
                event.preventDefault()
                document.getElementById('evaluation-notes')?.focus()
              }}>Supervisor Notes</a></h3>
              <p>{notes}</p>
            </section>
          )}
        </CardContent>
      </Card>
    </aside>
  )
}
