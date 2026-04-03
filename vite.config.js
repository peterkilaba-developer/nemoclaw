import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Proxy NVIDIA API calls through the local Python NeMo Guardrails Sandbox
        // Uses VITE_PYTHON_PROXY_URL if set in .env to bridge local frontend to remote Codespace backend
        '/api/nvidia': {
          target: env.VITE_PYTHON_PROXY_URL || 'http://127.0.0.1:8080',
          changeOrigin: true,
          secure: false,
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
