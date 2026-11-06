import express, { Application } from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import cors from 'cors'
import compression from 'compression'
import 'express-async-errors'
import { env } from './config/env'
import { errorHandler } from './middleware/errorHandler'
import { httpLogger } from './middleware/logger'
import { systemRouter } from './modules/system'
import { agentRouter } from './modules/agent'
// ============================================
// Add your domain module imports here
// ============================================
// Example: Product Module
// import { productRouter } from './modules/product.js'

export const createApp = (
  { serveFrontend = true }: { serveFrontend?: boolean } = {}
): Application => {
  const app = express()

  // HTTP request logging
  app.use(httpLogger)

  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN,
      credentials: env.CORS_ORIGIN !== '*',
    })
  )

  // Body parsing and compression. The cap protects the server from
  // accidentally-large payloads during demos (image pastes can balloon fast).
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));
  // Skip compression for the agent SSE stream so tokens arrive in real time.
  app.use(
    compression({
      filter: (req) => !req.originalUrl.includes('/api/agent/chat'),
    })
  )

  // API routes - System & Health
  app.use(env.API_PREFIX, systemRouter)

  // ============================================
  // Add your domain module routes here
  // ============================================
  // AI Agent module (chat streaming + file parsing)
  app.use(`${env.API_PREFIX}/agent`, agentRouter)
  // Example: Product Module
  // app.use(`${env.API_PREFIX}/products`, productRouter)

  // Serve the built frontend in production (single-port deployment).
  if (serveFrontend) {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const webDist = path.resolve(process.env.WEB_DIST || path.join(__dirname, '..', '..', 'frontend', 'dist'))
    if (fs.existsSync(webDist)) {
      app.use(express.static(webDist))
      app.get(/^(?!\/api).*/, (_req, res) => {
        res.sendFile(path.join(webDist, 'index.html'))
      })
    }
  }

  // Error handling
  app.use(errorHandler)

  return app
}
