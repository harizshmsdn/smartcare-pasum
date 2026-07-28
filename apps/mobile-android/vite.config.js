import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // basicSsl()
  ],
  server: {
    allowedHosts: true,
    host: true, // Listen on all local IP addresses (0.0.0.0)
    port: 5173,
    proxy: {
      '/auth': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true
      },
      '/rest': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true
      },
      '/storage': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true
      },
      '/realtime': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
        ws: true
      },
      '/graphql': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true
      },
      '/functions': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true
      }
    }
  }
})
