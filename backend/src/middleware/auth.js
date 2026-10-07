import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { tokenOptions } from '../config/auth.js'
import { User } from '../models/User.js'
import { AppError, asyncHandler } from './errors.js'

export const authenticate = asyncHandler(async (req, _res, next) => {
  const match = req.get('Authorization')?.match(/^Bearer ([^\s]+)$/i)
  if (!match) throw new AppError('A valid Bearer token is required', 401, 'UNAUTHENTICATED')

  let payload
  try {
    payload = jwt.verify(match[1], env.jwtSecret, { algorithms: ['HS256'], issuer: tokenOptions.issuer, audience: tokenOptions.audience })
    if (!payload || typeof payload !== 'object' || typeof payload.userId !== 'string' || !/^[a-f0-9]{24}$/.test(payload.userId) || !['DONOR', 'HOSPITAL', 'ADMIN'].includes(payload.role) || typeof payload.exp !== 'number') throw new Error('Invalid payload')
  } catch {
    throw new AppError('Token is invalid or expired', 401, 'INVALID_TOKEN')
  }
  const user = await User.findById(payload.userId)
  if (!user || user.role !== payload.role) throw new AppError('Authentication is no longer valid', 401, 'INVALID_TOKEN')
  req.user = user
  next()
})

export const authorizeRoles = (...roles) => (req, _res, next) => {
  if (!req.user) return next(new AppError('Authentication is required', 401, 'UNAUTHENTICATED'))
  if (!roles.includes(req.user.role)) return next(new AppError('You do not have permission for this operation', 403, 'FORBIDDEN'))
  next()
}
