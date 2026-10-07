import { USER_ROLES, BLOOD_GROUPS } from '../config/constants.js'
import { AppError } from '../middleware/errors.js'
import { createRepository } from './jsonRepository.js'
import { jsonStore } from './jsonStore.js'

// Explicit whitelist: password hashes cannot escape via normal repository responses.
export const safeUser = (record) => Object.fromEntries([
  'id', 'name', 'email', 'phone', 'role', 'bloodGroup', 'location', 'isAvailable',
  'donorId', 'hospitalId', 'createdAt', 'updatedAt',
].filter((field) => record[field] !== undefined).map((field) => [field, record[field]]))

const validateUser = (record) => {
  const valid = typeof record.name === 'string' && record.name.trim().length >= 2
    && typeof record.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)
    && typeof record.phone === 'string' && USER_ROLES.includes(record.role)
    && typeof record.password === 'string' && /^\$2[aby]\$12\$[./A-Za-z0-9]{53}$/.test(record.password)
    && typeof record.isAvailable === 'boolean'
    && (record.role !== 'DONOR' || BLOOD_GROUPS.includes(record.bloodGroup))
  if (!valid) throw new AppError('User validation failed', 400, 'VALIDATION_ERROR')
  record.email = record.email.trim().toLowerCase()
}

export const User = {
  ...createRepository('users', {
    defaults: { isAvailable: true, donorId: null, hospitalId: null },
    validate: validateUser,
    serialize: safeUser,
  }),

  // Used only for password verification and duplicate detection inside the auth service.
  async findByEmailWithPassword(email) {
    return (await jsonStore.read('users')).find((user) => user.email === email.trim().toLowerCase()) ?? null
  },
}
