import { Donor } from '../models/Donor.js'
import { AppError } from '../middleware/errors.js'
import { User } from '../models/User.js'

export const publicDonor = (record) => Object.fromEntries([
  'id', 'name', 'bloodGroup', 'location', 'city', 'isAvailable', 'availability',
  'distanceKm', 'donationCount', 'lastDonationDate', 'createdAt', 'updatedAt', 'isDemo',
].filter((field) => record[field] !== undefined).map((field) => [field, record[field]]))

const normalizeData = (data) => {
  const normalized = { ...data }
  if (normalized.availability !== undefined && normalized.isAvailable === undefined) normalized.isAvailable = normalized.availability === 'AVAILABLE'
  delete normalized.availability
  return normalized
}

export const donorService = {
  async list(filters = {}) {
    const query = { ...filters }
    if (query.availability) {
      query.isAvailable = query.availability === 'AVAILABLE'
      delete query.availability
    }
    return Donor.findAll(query)
  },

  async getById(id) {
    const donor = await Donor.findById(id)
    if (!donor) throw new AppError('Donor not found', 404, 'DONOR_NOT_FOUND')
    return donor
  },

  async create(data) {
    return Donor.create(normalizeData(data))
  },

  async update(id, data, user) {
    const existing = await this.getById(id)
    if (!user || user.role !== 'DONOR' || user.donorId !== id || existing.userId !== user.id) throw new AppError('You can only modify your own donor profile', 403, 'FORBIDDEN')
    const normalized = normalizeData(data)
    const donor = await Donor.updateById(id, normalized)
    if (!donor) throw new AppError('Donor not found', 404, 'DONOR_NOT_FOUND')
    const accountFields = Object.fromEntries(['name', 'email', 'phone', 'bloodGroup', 'location', 'isAvailable']
      .filter((field) => normalized[field] !== undefined).map((field) => [field, normalized[field]]))
    if (Object.keys(accountFields).length) {
      try {
        await User.updateById(user.id, accountFields)
      } catch (error) {
        const { availability, ...previous } = existing
        await Donor.updateById(id, previous)
        throw error
      }
    }
    return donor
  },
}
