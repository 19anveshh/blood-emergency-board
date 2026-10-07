export const BLOOD_GROUPS = Object.freeze([
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
])

export const REQUEST_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  MATCHING: 'MATCHING',
  FULFILLED: 'FULFILLED',
  CANCELLED: 'CANCELLED',
})

export const URGENCY = Object.freeze({
  CRITICAL: 'CRITICAL',
  URGENT: 'URGENT',
  NORMAL: 'NORMAL',
})

export const DONOR_AVAILABILITY = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  UNAVAILABLE: 'UNAVAILABLE',
})

export const USER_ROLES = Object.freeze(['DONOR', 'HOSPITAL', 'ADMIN'])

// Basic red-cell donor compatibility for the prototype matching service.
export const COMPATIBLE_DONOR_GROUPS = Object.freeze({
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': BLOOD_GROUPS,
})
