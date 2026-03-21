import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listens on all local IPs (0.0.0.0)
  },
  preview: {
    host: true, // Same for preview server
  }
})

