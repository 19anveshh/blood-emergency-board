import { env } from '../config/env.js'
import { jsonStore } from '../models/jsonStore.js'
import { sendSuccess } from '../middleware/response.js'

export const getHealth = (req, res) => {
  sendSuccess(res, {
    status: 'ok',
    service: 'blood-emergency-board-api',
    environment: env.nodeEnv,
    database: jsonStore.status(),
    timestamp: new Date().toISOString(),
  })
}
