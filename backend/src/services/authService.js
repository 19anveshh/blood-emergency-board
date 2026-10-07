import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { tokenOptions } from '../config/auth.js'
import { AppError } from '../middleware/errors.js'
import { User, safeUser } from '../models/User.js'
import { Donor } from '../models/Donor.js'
import { Hospital } from '../models/Hospital.js'

let registrationQueue = Promise.resolve()

export const authService = {
  register(data) {
    // Serialize the account/profile linking flow for the single-process demo.
    const registration = registrationQueue.then(async () => {
      if (await User.findByEmailWithPassword(data.email)) throw new AppError('Email is already registered', 409, 'DUPLICATE_EMAIL')
      const password = await bcrypt.hash(data.password, 12)
      const user = await User.create({ ...data, password, isAvailable: data.isAvailable ?? true })
      const model = data.role === 'DONOR' ? Donor : Hospital
      let profile
      try {
        profile = await model.create({
          name: data.name, email: data.email, phone: data.phone, location: data.location,
          userId: user.id,
          ...(data.role === 'DONOR' ? { bloodGroup: data.bloodGroup, isAvailable: user.isAvailable } : { verified: false }),
        })
        const linked = await User.updateById(user.id, data.role === 'DONOR' ? { donorId: profile.id } : { hospitalId: profile.id })
        return { user: linked }
      } catch (error) {
        // Do not leave usable accounts/orphan profiles after a failed registration.
        if (profile) await model.deleteById(profile.id)
        await User.deleteById(user.id)
        throw error
      }
    })
    registrationQueue = registration.catch(() => {})
    return registration
  },

  async login(email, password) {
    const user = await User.findByEmailWithPassword(email)
    const valid = user && await bcrypt.compare(password, user.password)
    const linked = user && (user.role === 'ADMIN' || (user.role === 'DONOR' ? user.donorId : user.hospitalId))
    if (!valid || !linked) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS')
    const token = jwt.sign({ userId: user.id, role: user.role }, env.jwtSecret, { ...tokenOptions, expiresIn: env.jwtExpiresIn })
    return { user: safeUser(user), token }
  },
}
