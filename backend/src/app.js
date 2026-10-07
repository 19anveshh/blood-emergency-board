import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import healthRoutes from './routes/healthRoutes.js'
import requestRoutes from './routes/requestRoutes.js'
import donorRoutes from './routes/donorRoutes.js'
import hospitalRoutes from './routes/hospitalRoutes.js'
import authRoutes from './routes/authRoutes.js'
import { AppError, errorHandler, notFoundHandler } from './middleware/errors.js'

const app = express()

const allowedOrigins = env.corsOrigin.split(',').map((origin) => origin.trim()).filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    return callback(new AppError('Origin is not allowed by CORS', 403, 'CORS_ERROR'))
  },
}))

app.use(express.json({ limit: '1mb' }))

app.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Blood Emergency Board API',
      health: '/api/health',
    },
  })
})

app.use('/api/health', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/requests', requestRoutes)
app.use('/api/donors', donorRoutes)
app.use('/api/hospitals', hospitalRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
