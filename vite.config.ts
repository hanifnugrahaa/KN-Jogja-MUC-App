import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import { geminiNotes } from './server/gemini.ts'

export default defineConfig(({ mode }) => {
  const polish = geminiNotes(loadEnv(mode, process.cwd(), 'GEMINI_API_KEY').GEMINI_API_KEY ?? '')
  return {
    plugins: [react(), tailwindcss(), {
      name: 'gemini-notes',
      configureServer(server) { server.middlewares.use('/api/polish-notes', polish) },
      configurePreviewServer(server) { server.middlewares.use('/api/polish-notes', polish) },
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
