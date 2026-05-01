import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// During local dev (`npm run dev`), proxy /api/* to the deployed production
// Vercel functions at app.yieldo.xyz. Avoids needing `vercel dev` running on
// :3001 alongside Vite. Set VITE_API_PROXY in `.env.local` to override (e.g.
// "http://localhost:3001" if you ARE running vercel dev locally).
const API_PROXY = process.env.VITE_API_PROXY || 'https://app.yieldo.xyz'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: API_PROXY,
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
