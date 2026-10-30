import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// During development the browser talks to the Vite server, which forwards /api requests to the
// FastAPI backend. The browser therefore sees one origin, so the backend needs no CORS settings.
const backendUrl = process.env.VITE_DEV_BACKEND_URL ?? 'http://127.0.0.1:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': backendUrl },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
