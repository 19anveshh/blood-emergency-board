import app from './src/app.js'
import { env } from './src/config/env.js'
import { jsonStore } from './src/models/jsonStore.js'
import { validateAuthConfiguration } from './src/config/auth.js'

let server

try {
  validateAuthConfiguration()
  await jsonStore.initialize()
  server = app.listen(env.port, () => {
    console.log(`Blood Emergency Board API listening on http://localhost:${server.address().port} (local JSON persistence)`)
  })
  server.on('error', () => {
    console.error('Unable to start API. Check the configured port and local permissions.')
    process.exitCode = 1
  })
} catch {
  console.error('Unable to start API. Check private JWT configuration, local data files, and permissions.')
  process.exitCode = 1
}

const shutdown = (signal) => {
  console.log(`${signal} received. Shutting down API server.`)
  if (server) server.close(() => process.exit(0))
  else process.exit(0)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
