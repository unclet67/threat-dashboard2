import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function kbWritePlugin() {
  return {
    name: 'kb-write',
    configureServer(server) {
      server.middlewares.use('/api/kb/write', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', async () => {
          try {
            const { path: relPath, data } = JSON.parse(body)
            const fs = await import('fs/promises')
            const nodePath = await import('path')
            const fullPath = nodePath.resolve('./src/data', relPath)
            if (!fullPath.startsWith(nodePath.resolve('./src/data'))) {
              res.statusCode = 403; res.end(JSON.stringify({ error: 'Forbidden' })); return
            }
            await fs.mkdir(nodePath.dirname(fullPath), { recursive: true })
            await fs.writeFile(fullPath, JSON.stringify(data, null, 2))
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true }))
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), kbWritePlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  },
})
