import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-static-files',
      closeBundle() {
        const srcDir = path.resolve(__dirname, '../public')
        const destDir = path.resolve(__dirname, 'dist')
        const files = ['terms.html', 'privacy.html', '404.html', 'site.webmanifest', 'CNAME', 'favicon.svg', 'favicon-32.png', 'favicon-180.png', 'apple-touch-icon.png', 'og-image.jpg']
        files.forEach(file => {
          const src = path.join(srcDir, file)
          const dest = path.join(destDir, file)
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest)
          }
        })
      }
    }
  ],
  server: {
    port: 5173,
    host: '127.0.0.1',
    proxy: {
      '/api': 'http://127.0.0.1:4173',
      '/ws': {
        target: 'ws://127.0.0.1:4173',
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
