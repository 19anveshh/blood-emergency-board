import { validateStoredRecord } from '../middleware/validate.js'
import { createRepository } from './jsonRepository.js'

export const Donor = createRepository('donors', {
  defaults: { isAvailable: true, lastDonationDate: null, distanceKm: 0, donationCount: 0 },
  validate: (record) => validateStoredRecord('donor', record),
  serialize: (record) => ({ ...record, availability: record.isAvailable ? 'AVAILABLE' : 'UNAVAILABLE' }),
})
