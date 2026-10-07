import { validateStoredRecord } from '../middleware/validate.js'
import { createRepository } from './jsonRepository.js'

export const BloodRequest = createRepository('bloodRequests', {
  defaults: { status: 'ACTIVE', additionalNotes: '', matchedDonorIds: [], acceptedDonorIds: [], fulfilledAt: null },
  validate: (record) => validateStoredRecord('request', record),
  serialize: (record) => ({ ...record, notes: record.additionalNotes }),
})
