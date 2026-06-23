import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Keep Firebase Hosting function rewrites available during local browser testing.
        '/api/runConflictCheck': {
          target: env.VITE_FUNCTIONS_BASE_URL || 'https://nemoc-law-ai.web.app',
          changeOrigin: true,
          secure: true,
        },
        '/api/getSignatureRequest': {
          target: env.VITE_FUNCTIONS_BASE_URL || 'https://nemoc-law-ai.web.app',
          changeOrigin: true,
          secure: true,
        },
        '/api/signSignatureRequest': {
          target: env.VITE_FUNCTIONS_BASE_URL || 'https://nemoc-law-ai.web.app',
          changeOrigin: true,
          secure: true,
        },
        // Proxy inference through the Firebase Function gateway so provider keys stay server-side.
        '/api/nvidia': {
          target: env.VITE_FUNCTIONS_BASE_URL || 'https://nemoc-law-ai.web.app',
          changeOrigin: true,
          secure: true,
        },
        // Proxy Hunter.io API calls
        '/api/hunter': {
          target: 'https://api.hunter.io',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/hunter/, ''),
        },
        // Proxy Apollo.io API calls
        '/api/apollo': {
          target: 'https://api.apollo.io',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/apollo/, ''),
        },
      },
    },
  }
})
