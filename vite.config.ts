import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listens on all local IPs (0.0.0.0)
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5173,
    strictPort: true,
  },
  preview: {
    host: true, // Same for preview server
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 4173,
    strictPort: true,
  }
})

