import { COMPATIBLE_DONOR_GROUPS } from '../config/constants.js'
import { AppError } from '../middleware/errors.js'
import { BloodRequest } from '../models/BloodRequest.js'
import { Donor } from '../models/Donor.js'
import { publicDonor } from './donorService.js'

const daysSince = (dateValue) => {
  if (!dateValue) return 365
  const days = (Date.now() - new Date(dateValue).getTime()) / (1000 * 60 * 60 * 24)
  return Number.isFinite(days) && days >= 0 ? days : 365
}

export const isCompatible = (requestBloodGroup, donorBloodGroup) => COMPATIBLE_DONOR_GROUPS[requestBloodGroup]?.includes(donorBloodGroup) ?? false

export const calculateMatchScore = (request, donor) => {
  const exactBloodGroupScore = request.bloodGroup === donor.bloodGroup ? 45 : 35
  const distanceScore = Math.max(0, Math.round(30 - Math.min(Number(donor.distanceKm ?? 15), 30)))
  const recencyScore = Math.max(0, Math.round(15 - Math.min(daysSince(donor.lastDonationDate) / 30, 15)))
  const reliabilityScore = Math.min(10, Math.max(0, Number(donor.donationCount ?? 0) * 2))
  return Math.min(100, exactBloodGroupScore + distanceScore + recencyScore + reliabilityScore)
}

export const matchingService = {
  async getMatches(requestId) {
    const request = await BloodRequest.findById(requestId)
    if (!request) throw new AppError('Blood request not found', 404, 'REQUEST_NOT_FOUND')

    const donors = await Donor.findAll({ isAvailable: true })
    const matches = donors
      .filter((donor) => isCompatible(request.bloodGroup, donor.bloodGroup))
      .map((donor) => ({
        ...publicDonor(donor),
        matchScore: calculateMatchScore(request, donor),
        matchReason: request.bloodGroup === donor.bloodGroup ? 'Exact blood group match' : 'Compatible blood group',
      }))
      .sort((first, second) => second.matchScore - first.matchScore || first.distanceKm - second.distanceKm)

    return {
      requestId: request.id,
      bloodGroup: request.bloodGroup,
      totalMatches: matches.length,
      matches,
    }
  },
}
