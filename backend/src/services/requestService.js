import { REQUEST_STATUS } from '../config/constants.js'
import { AppError } from '../middleware/errors.js'
import { BloodRequest } from '../models/BloodRequest.js'
import { Donor } from '../models/Donor.js'
import { Hospital } from '../models/Hospital.js'
import { isCompatible } from './matchingService.js'

const findRequestOrThrow = async (id) => {
  const request = await BloodRequest.findById(id)
  if (!request) throw new AppError('Blood request not found', 404, 'REQUEST_NOT_FOUND')
  return request
}

const assertOpen = (request) => {
  if (![REQUEST_STATUS.ACTIVE, REQUEST_STATUS.MATCHING].includes(request.status)) {
    throw new AppError(`A ${request.status.toLowerCase()} request cannot be changed`, 409, 'INVALID_REQUEST_STATE')
  }
}

const assertOwner = (request, user) => {
  if (!user || user.role !== 'HOSPITAL' || !user.hospitalId || request.hospitalId !== user.hospitalId) {
    throw new AppError('You can only modify requests belonging to your hospital', 403, 'FORBIDDEN')
  }
}

const ownedHospital = async (data, user) => {
  if (!user?.hospitalId) throw new AppError('A linked hospital account is required', 403, 'FORBIDDEN')
  const hospital = await Hospital.findById(user.hospitalId)
  if (!hospital || hospital.userId !== user.id) throw new AppError('Hospital ownership is not valid', 403, 'FORBIDDEN')
  if ((data.hospitalId && data.hospitalId !== hospital.id) || (data.hospital && data.hospital.toLowerCase() !== hospital.name.toLowerCase())) {
    throw new AppError('You cannot create or transfer a request to another hospital', 403, 'FORBIDDEN')
  }
  return hospital
}

const normalizeRequestData = (data) => {
  const normalized = { ...data }
  if (normalized.notes !== undefined && normalized.additionalNotes === undefined) normalized.additionalNotes = normalized.notes
  delete normalized.notes
  return normalized
}

const updateRequest = async (id, change, user) => {
  const request = await BloodRequest.updateById(id, async (current) => {
    if (user) assertOwner(current, user)
    assertOpen(current)
    return change(current)
  })
  if (!request) throw new AppError('Blood request not found', 404, 'REQUEST_NOT_FOUND')
  return request
}

export const requestService = {
  async list(filters = {}) {
    return BloodRequest.findAll(filters)
  },

  async getById(id) {
    return findRequestOrThrow(id)
  },

  async create(data, user) {
    const normalized = normalizeRequestData(data)
    const hospital = await ownedHospital(normalized, user)
    return BloodRequest.create({
      ...normalized,
      hospital: hospital?.name ?? normalized.hospital,
      hospitalId: hospital?.id ?? null,
      status: REQUEST_STATUS.ACTIVE,
    })
  },

  async update(id, data, user) {
    return updateRequest(id, async (request) => {
      assertOwner(request, user)
      const updates = normalizeRequestData(data)
      if (Object.hasOwn(data, 'hospital') || Object.hasOwn(data, 'hospitalId')) {
        const hospital = await ownedHospital(data, user)
        updates.hospital = hospital?.name ?? data.hospital ?? request.hospital
        updates.hospitalId = hospital?.id ?? null
      }
      if (data.bloodGroup && data.bloodGroup !== request.bloodGroup) {
        const donors = await Donor.findAll()
        const incompatible = donors.some((donor) => request.acceptedDonorIds.includes(donor.id) && !isCompatible(data.bloodGroup, donor.bloodGroup))
        if (incompatible) throw new AppError('New blood group is incompatible with an accepted donor', 409, 'ACCEPTED_DONOR_CONFLICT')
        updates.matchedDonorIds = [...request.acceptedDonorIds]
      }
      if (data.status === REQUEST_STATUS.FULFILLED) updates.fulfilledAt = new Date().toISOString()
      if (data.status === REQUEST_STATUS.CANCELLED) updates.fulfilledAt = null
      return updates
    }, user)
  },

  async remove(id) {
    const deleted = await BloodRequest.deleteById(id)
    if (!deleted) throw new AppError('Blood request not found', 404, 'REQUEST_NOT_FOUND')
    return deleted
  },

  async accept(id, donorId, user) {
    // Preserve request-first missing-record errors.
    await findRequestOrThrow(id)
    const donor = await Donor.findById(donorId)
    if (!donor) throw new AppError('Donor not found', 404, 'DONOR_NOT_FOUND')
    if (!user || user.donorId !== donor.id || donor.userId !== user.id) throw new AppError('You can only accept a request as yourself', 403, 'FORBIDDEN')
    const request = await updateRequest(id, (current) => {
      if (!donor.isAvailable) throw new AppError('Only an available donor can accept a request', 400, 'DONOR_UNAVAILABLE')
      if (!isCompatible(current.bloodGroup, donor.bloodGroup)) throw new AppError('Donor blood group is not compatible with this request', 400, 'DONOR_INCOMPATIBLE')
      return {
        status: REQUEST_STATUS.MATCHING,
        acceptedDonorIds: [...new Set([...current.acceptedDonorIds, donor.id])],
        matchedDonorIds: [...new Set([...current.matchedDonorIds, donor.id])],
      }
    })
    return { request, donor }
  },

  async fulfill(id, user) {
    return updateRequest(id, (request) => {
      assertOwner(request, user)
      return { status: REQUEST_STATUS.FULFILLED, fulfilledAt: new Date().toISOString() }
    }, user)
  },

  async cancel(id, user) {
    return updateRequest(id, (request) => {
      assertOwner(request, user)
      return { status: REQUEST_STATUS.CANCELLED, fulfilledAt: null }
    }, user)
  },
}
