import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 6190,
    strictPort: true,
    allowedHosts: ['projects.local', 'localhost'],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
