import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { Portal } from './features/portal'
import { supabase } from './lib/supabase'
import { brand } from './lib/brand'

for (const key of ['blue', 'navy', 'ink', 'muted', 'light', 'border'] as const) {
  document.documentElement.style.setProperty('--brand-' + key, '#' + brand[key])
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>{supabase ? <Portal client={supabase} /> : <App />}</StrictMode>,
)
