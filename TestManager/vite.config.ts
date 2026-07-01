import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 6180,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
