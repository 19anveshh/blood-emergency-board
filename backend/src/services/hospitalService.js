import { AppError } from '../middleware/errors.js'
import { Hospital } from '../models/Hospital.js'

const normalizeData = (data) => {
  const normalized = { ...data }
  if (normalized.isVerified !== undefined && normalized.verified === undefined) normalized.verified = normalized.isVerified
  delete normalized.isVerified
  return normalized
}

export const hospitalService = {
  async list() {
    return Hospital.findAll()
  },

  async getById(id) {
    const hospital = await Hospital.findById(id)
    if (!hospital) throw new AppError('Hospital not found', 404, 'HOSPITAL_NOT_FOUND')
    return hospital
  },

  async create(data) {
    return Hospital.create(normalizeData(data))
  },

  async update(id, data) {
    const hospital = await Hospital.updateById(id, normalizeData(data))
    if (!hospital) throw new AppError('Hospital not found', 404, 'HOSPITAL_NOT_FOUND')
    return hospital
  },
}
