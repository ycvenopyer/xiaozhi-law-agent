import express from 'express'
import { createApp } from '../../backend/src/app'

const app = express()

// Normalize adapters that strip the function's /api route prefix.
app.use((req, _res, next) => {
  const pathname = req.url.split('?')[0]
  if (pathname !== '/api' && !pathname.startsWith('/api/')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`
  }
  req.originalUrl = req.url
  next()
})

app.use(createApp({ serveFrontend: false }))

export default app
