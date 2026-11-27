import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import { geminiNotes } from './server/gemini.ts'
import { localReportSignature } from './server/report-signature.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['GEMINI_API_KEY', 'MUC_SIGNATURE_PATH', 'VITE_SUPABASE_'])
  const polish = geminiNotes(env.GEMINI_API_KEY ?? '')
  const signature = localReportSignature(env.MUC_SIGNATURE_PATH ?? '', env.VITE_SUPABASE_URL ?? '', env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '')
  return {
    plugins: [react(), tailwindcss(), {
      name: 'gemini-notes',
      configureServer(server) { server.middlewares.use('/api/polish-notes', polish) },
      configurePreviewServer(server) { server.middlewares.use('/api/polish-notes', polish) },
    }, {
      name: 'local-report-signature',
      configureServer(server) { server.middlewares.use('/api/local-report-signature', signature) },
    }],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: { groups: [{ name: 'react', test: /[\\/]node_modules[\\/]react(?:-dom)?[\\/]/ }] },
        },
      },
    },
  }
})
