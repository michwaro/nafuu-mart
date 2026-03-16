import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Handle SPA routing - serve index.html for all non-API routes
    middlewareMode: false,
    // Proxy API requests to backend server
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/sitemap': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/robots.txt': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/src/fallbackProducts.js')) {
            return 'catalog-fallback'
          }

          if (!id.includes('node_modules')) return

          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
            return 'react-core'
          }

          if (id.includes('/@clerk/')) {
            return 'clerk'
          }

          if (id.includes('/@supabase/')) {
            return 'supabase'
          }

          if (
            id.includes('/xlsx/') ||
            id.includes('/cfb/') ||
            id.includes('/codepage/') ||
            id.includes('/ssf/') ||
            id.includes('/wmf/')
          ) {
            return 'xlsx'
          }

          if (
            id.includes('/react-helmet-async/') ||
            id.includes('/react-fast-compare/') ||
            id.includes('/shallowequal/') ||
            id.includes('/invariant/')
          ) {
            return 'seo'
          }
        },
      },
    },
  },
})
