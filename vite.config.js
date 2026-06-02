import { createServer as createHttpServer } from 'node:http'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

const HTTP_SIDECAR_PORT = 5174
const httpOnly = process.env.VITE_HTTP_ONLY === '1'

/** Plain HTTP on a second port so Cursor's built-in browser avoids self-signed cert errors. */
function httpSidecarPlugin(port = HTTP_SIDECAR_PORT) {
  return {
    name: 'http-sidecar',
    configureServer(server) {
      return () => {
        if (!server.config.server.https) return

        const host = server.config.server.host === true ? '0.0.0.0' : '127.0.0.1'
        createHttpServer((req, res) => {
          server.middlewares.handle(req, res, () => {
            if (!res.writableEnded) {
              res.statusCode = 404
              res.end()
            }
          })
        }).listen(port, host, () => {
          const local = `http://localhost:${port}/`
          server.config.logger.info(`  ➜  Cursor (no TLS): ${local}`)
        })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ...(httpOnly ? [] : [basicSsl(), httpSidecarPlugin()]),
  ],
  server: {
    host: true,
  },
})
