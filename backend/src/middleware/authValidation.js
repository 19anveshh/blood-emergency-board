import { BLOOD_GROUPS } from '../config/constants.js'
import { AppError } from './errors.js'

export const isValidEmail = (value) => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

export const isStrongPassword = (value) => typeof value === 'string'
  && value.length >= 8 && Buffer.byteLength(value, 'utf8') <= 72
  && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^a-zA-Z0-9]/.test(value)

const validateObject = (input, allowed) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return ['Body must be a JSON object']
  return Object.keys(input).some((key) => !allowed.includes(key)) ? ['Unsupported authentication fields'] : []
}

export const validateRegister = (req, _res, next) => {
  const body = req.body
  const details = validateObject(body, ['name', 'email', 'password', 'phone', 'role', 'bloodGroup', 'location', 'isAvailable'])
  if (details.length) return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', details))
  if (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 120 || /[\u0000-\u001f]/.test(body.name)) details.push('name must contain 2–120 printable characters')
  if (!isValidEmail(body.email)) details.push('email must be valid')
  if (!isStrongPassword(body.password)) details.push('password must contain uppercase, lowercase, a number, and a symbol; minimum 8 characters and maximum 72 UTF-8 bytes')
  if (typeof body.phone !== 'string' || !/^\+?[\d ()-]{7,25}$/.test(body.phone) || body.phone.replace(/\D/g, '').length < 7 || body.phone.replace(/\D/g, '').length > 15) details.push('phone must contain 7–15 digits')
  if (!['DONOR', 'HOSPITAL'].includes(body.role)) details.push('role must be DONOR or HOSPITAL; ADMIN accounts are created privately')
  if (body.role === 'DONOR' && !BLOOD_GROUPS.includes(body.bloodGroup)) details.push('a valid bloodGroup is required for DONOR')
  if (body.bloodGroup !== undefined && !BLOOD_GROUPS.includes(body.bloodGroup)) details.push('bloodGroup is invalid')
  if (typeof body.location !== 'string' || !body.location.trim() || body.location.trim().length > 500) details.push('location is required and must be at most 500 characters')
  if (body.isAvailable !== undefined && typeof body.isAvailable !== 'boolean') details.push('isAvailable must be a boolean')
  if (details.length) return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', details))
  req.body = { ...body, name: body.name.trim(), email: body.email.trim().toLowerCase(), phone: body.phone.trim(), location: body.location.trim() }
  next()
}

export const validateLogin = (req, _res, next) => {
  const body = req.body
  const details = validateObject(body, ['email', 'password'])
  if (!details.length) {
    if (!isValidEmail(body.email)) details.push('email must be valid')
    if (typeof body.password !== 'string' || !body.password || Buffer.byteLength(body.password, 'utf8') > 72) details.push('password is required and must be at most 72 UTF-8 bytes')
  }
  if (details.length) return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', details))
  req.body = { email: body.email.trim().toLowerCase(), password: body.password }
  next()
}
