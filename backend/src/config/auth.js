import jwt from 'jsonwebtoken'
import { env } from './env.js'

export const tokenOptions = { algorithm: 'HS256', issuer: 'blood-emergency-board', audience: 'bloodboard-api' }

export const validateAuthConfiguration = () => {
  if (typeof env.jwtSecret !== 'string' || Buffer.byteLength(env.jwtSecret) < 32 || env.jwtSecret.startsWith('replace_')) {
    throw new Error('JWT_SECRET must be configured privately with at least 32 random characters')
  }
  // Check expiration syntax without logging the generated token or secret.
  jwt.sign({ userId: 'configuration-check', role: 'DONOR' }, env.jwtSecret, { ...tokenOptions, expiresIn: env.jwtExpiresIn })
}
