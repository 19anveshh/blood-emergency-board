import { validateStoredRecord } from '../middleware/validate.js'
import { createRepository } from './jsonRepository.js'

export const Hospital = createRepository('hospitals', {
  defaults: { verified: false },
  validate: (record) => validateStoredRecord('hospital', record),
  serialize: (record) => ({ ...record, isVerified: record.verified }),
})
