import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) return 'charts'
            if (id.includes('framer-motion')) return 'motion'
            if (id.includes('lucide-react')) return 'icons'
            if (id.includes('react-router') || id.includes('react-dom') || id.includes('react/')) return 'react'
            if (id.includes('axios')) return 'http'
            return 'vendor'
          }
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})
