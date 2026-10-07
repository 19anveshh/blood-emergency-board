import { BLOOD_GROUPS, DONOR_AVAILABILITY, REQUEST_STATUS, URGENCY } from '../config/constants.js'
import { AppError } from './errors.js'

const validationError = (details) => new AppError('Validation failed', 400, 'VALIDATION_ERROR', details)

// Validate calendar dates as well as timestamps, so dates such as Feb 30 are rejected.
const isIsoDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return false
  const date = new Date(value)
  const calendarDate = new Date(`${value.slice(0, 10)}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime())
    && !Number.isNaN(calendarDate.getTime())
    && calendarDate.toISOString().slice(0, 10) === value.slice(0, 10)
}

const normalizeField = (value, rule, field) => {
  if (value === null && rule.nullable) return null

  switch (rule.type) {
    case 'string': {
      if (typeof value !== 'string' || (!rule.allowEmpty && !value.trim())) {
        throw new Error(`${field} must be a ${rule.allowEmpty ? '' : 'non-empty '}string`)
      }
      const normalized = value.trim()
      if (normalized.length > (rule.maxLength ?? 500)) throw new Error(`${field} is too long`)
      return normalized
    }
    case 'email': {
      if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        throw new Error(`${field} must be a valid email address`)
      }
      return value.trim().toLowerCase()
    }
    case 'enum': {
      const normalized = typeof value === 'string' ? value.trim().toUpperCase() : value
      if (!rule.values.includes(normalized)) throw new Error(`${field} must be one of: ${rule.values.join(', ')}`)
      return normalized
    }
    case 'integer':
    case 'number': {
      const valid = typeof value === 'number' && Number.isFinite(value)
        && (rule.type !== 'integer' || Number.isSafeInteger(value)) && value >= rule.min
      if (!valid) throw new Error(`${field} must be a ${rule.min > 0 ? 'positive' : 'non-negative'} ${rule.type}`)
      return value
    }
    case 'boolean':
      if (typeof value !== 'boolean') throw new Error(`${field} must be a boolean`)
      return value
    case 'date':
      if (!isIsoDate(value)) throw new Error(`${field} must be a valid ISO 8601 date or timestamp`)
      return new Date(value).toISOString()
    default:
      throw new Error(`Unknown validation rule for ${field}`)
  }
}

const validateFields = (input, schema, partial = false) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw validationError(['Request body must be a JSON object'])
  }

  const fields = Object.keys(input)
  const details = []
  const normalized = {}
  const unknownFields = fields.filter((field) => !Object.hasOwn(schema, field))
  if (unknownFields.length) details.push(`Unsupported fields: ${unknownFields.join(', ')}`)
  if (partial && !fields.length) details.push('At least one field is required for an update')

  for (const [field, rule] of Object.entries(schema)) {
    if (!Object.hasOwn(input, field)) {
      if (!partial && rule.required) details.push(`${field} is required`)
      continue
    }
    try {
      normalized[field] = normalizeField(input[field], rule, field)
    } catch (error) {
      details.push(error.message)
    }
  }

  if (details.length) throw validationError(details)
  return normalized
}

const bodyValidator = (schema, { partial = false, normalize = (body) => body } = {}) => (req, _res, next) => {
  try {
    req.body = normalize(validateFields(req.body ?? {}, schema, partial))
    next()
  } catch (error) {
    next(error)
  }
}

const requestSchema = {
  bloodGroup: { type: 'enum', values: BLOOD_GROUPS, required: true },
  unitsRequired: { type: 'integer', min: 1, required: true },
  hospital: { type: 'string', required: true, maxLength: 160 },
  hospitalId: { type: 'string', nullable: true },
  location: { type: 'string', required: true },
  urgency: { type: 'enum', values: Object.values(URGENCY), required: true },
  requiredBefore: { type: 'date', required: true },
  additionalNotes: { type: 'string', allowEmpty: true, maxLength: 2000 },
  notes: { type: 'string', allowEmpty: true, maxLength: 2000 },
  status: { type: 'enum', values: Object.values(REQUEST_STATUS) },
}

const donorSchema = {
  name: { type: 'string', required: true, maxLength: 120 },
  bloodGroup: { type: 'enum', values: BLOOD_GROUPS, required: true },
  location: { type: 'string', required: true },
  city: { type: 'string' },
  address: { type: 'string' },
  email: { type: 'email', required: true },
  phone: { type: 'string' },
  distanceKm: { type: 'number', min: 0 },
  availability: { type: 'enum', values: Object.values(DONOR_AVAILABILITY) },
  isAvailable: { type: 'boolean' },
  lastDonationDate: { type: 'date', nullable: true },
  donationCount: { type: 'integer', min: 0 },
}

const hospitalSchema = {
  name: { type: 'string', required: true, maxLength: 160 },
  location: { type: 'string', required: true },
  address: { type: 'string' },
  city: { type: 'string' },
  email: { type: 'email' },
  phone: { type: 'string' },
  verified: { type: 'boolean' },
  isVerified: { type: 'boolean' },
}

const normalizeAvailability = (body) => {
  if (body.availability === undefined && body.isAvailable === undefined) return body

  const availability = body.availability ?? (body.isAvailable ? DONOR_AVAILABILITY.AVAILABLE : DONOR_AVAILABILITY.UNAVAILABLE)
  const isAvailable = availability === DONOR_AVAILABILITY.AVAILABLE
  if (body.isAvailable !== undefined && body.isAvailable !== isAvailable) {
    throw validationError(['availability and isAvailable must agree'])
  }

  return { ...body, availability, isAvailable }
}

// Lifecycle state and internal IDs/timestamps are owned by the services, not body input.
export const validateRequestCreate = bodyValidator(requestSchema)
export const validateRequestUpdate = bodyValidator(requestSchema, { partial: true })
export const validateDonorCreate = bodyValidator(donorSchema, { normalize: normalizeAvailability })
export const validateDonorUpdate = bodyValidator(donorSchema, { partial: true, normalize: normalizeAvailability })
export const validateHospitalCreate = bodyValidator(hospitalSchema)
export const validateHospitalUpdate = bodyValidator(hospitalSchema, { partial: true })
export const validateAcceptAction = bodyValidator({ donorId: { type: 'string', required: true } })

// Reuse the API rules for full persisted records, including seed data and updates.
export const validateStoredRecord = (type, record) => {
  const schema = { request: requestSchema, donor: donorSchema, hospital: hospitalSchema }[type]
  const fields = Object.fromEntries(Object.keys(schema)
    .filter((field) => Object.hasOwn(record, field))
    .map((field) => [field, record[field]]))
  Object.assign(record, validateFields(fields, schema))
}

export const validateRequestQuery = (req, _res, next) => {
  try {
    req.validatedQuery = validateFields(req.query, {
      status: { type: 'enum', values: Object.values(REQUEST_STATUS) },
      bloodGroup: { type: 'enum', values: BLOOD_GROUPS },
      urgency: { type: 'enum', values: Object.values(URGENCY) },
    })
    next()
  } catch (error) {
    next(error)
  }
}

export const validateDonorQuery = (req, _res, next) => {
  try {
    req.validatedQuery = validateFields(req.query, {
      bloodGroup: { type: 'enum', values: BLOOD_GROUPS },
      availability: { type: 'enum', values: Object.values(DONOR_AVAILABILITY) },
    })
    next()
  } catch (error) {
    next(error)
  }
}
