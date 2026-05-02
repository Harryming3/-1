import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api/filebrowser': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/kkfileview': {
        target: 'http://localhost:8012',
        changeOrigin: true
      }
    }
  }
})
