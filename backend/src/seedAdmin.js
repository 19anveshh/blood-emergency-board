import bcrypt from 'bcryptjs'
import { env } from './config/env.js'
import { jsonStore } from './models/jsonStore.js'
import { User } from './models/User.js'
import { isStrongPassword, isValidEmail } from './middleware/authValidation.js'

try {
  if (!isValidEmail(env.adminEmail) || !isStrongPassword(env.adminPassword) || env.adminPassword.startsWith('replace_')) {
    throw new Error('Private admin configuration is required')
  }
  await jsonStore.initialize()
  const email = env.adminEmail.trim().toLowerCase()
  const existing = await User.findByEmailWithPassword(email)
  if (existing && existing.role !== 'ADMIN') throw new Error('Cannot promote an existing ordinary account')
  const password = await bcrypt.hash(env.adminPassword, 12)
  if (existing) await User.updateById(existing.id, { password })
  else await User.create({ name: 'Demo Administrator', email, password, phone: '0000000000', role: 'ADMIN', location: 'Local demo' })
  console.log('Admin account is ready. Credentials are read only from the private environment and are not printed.')
} catch {
  console.error('Admin setup failed. Check private ADMIN_EMAIL/ADMIN_PASSWORD settings, existing account role, and storage permissions.')
  process.exitCode = 1
}
