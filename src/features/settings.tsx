import { zodResolver } from '@hookform/resolvers/zod'
import { SlidersHorizontal } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { defaultThresholds, recommendations, thresholdSchema } from '@/lib/evaluation'
import type { Thresholds } from '@/lib/evaluation'

const categories = [
  ['high', recommendations[0]],
  ['recommended', recommendations[1]],
  ['conditional', recommendations[2]],
] as const

export function Settings({ thresholds, onSave }: { thresholds: Thresholds; onSave: (next: Thresholds) => boolean }) {
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<Thresholds>({
    defaultValues: thresholds, resolver: zodResolver(thresholdSchema),
  })
  return (
    <Card className="workspace-card settings-card">
      <CardHeader className="section-heading">
        <span className="section-icon"><SlidersHorizontal /></span>
        <div>
          <CardTitle>Recommendation Thresholds</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={handleSubmit((next) => { if (onSave(next)) reset(next) })}>
          <div className="threshold-list">
            {categories.map(([key, label]) => (
              <div className="threshold-row" key={key}>
                <Label htmlFor={'threshold-' + key}>{label}</Label>
                <div>
                  <Input id={'threshold-' + key} type="number" min={1} max={100} step={1}
                    aria-invalid={!!errors[key]} aria-describedby={errors[key] ? 'threshold-error-' + key : undefined}
                    {...register(key, { valueAsNumber: true })} />
                  {errors[key] && <p id={'threshold-error-' + key} className="field-error">{errors[key]?.type === 'custom' ? errors[key]?.message : 'Enter a valid whole-number minimum.'}</p>}
                </div>
              </div>
            ))}
            <div className="threshold-row"><span className="font-medium">{recommendations[3]}</span><span className="helper-text">Below the conditional minimum</span></div>
          </div>

          <div className="settings-actions">
            <Button type="button" variant="outline" onClick={() => reset(defaultThresholds, { keepDefaultValues: true })}>Restore defaults</Button>
            <Button type="submit" disabled={!isDirty}>Save settings</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
