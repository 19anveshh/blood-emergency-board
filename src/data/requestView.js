const titleCase = (value = '') => value.charAt(0) + value.slice(1).toLowerCase()

const displayBloodGroup = (value = '') => value.replace(/-/g, '−')

const formatDate = (value, fallback = 'Not specified') => {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

const remainingTime = (value, status) => {
  if (status === 'FULFILLED') return 'Completed'
  if (status === 'CANCELLED') return 'Cancelled'
  const difference = new Date(value).getTime() - Date.now()
  if (!Number.isFinite(difference) || difference <= 0) return 'Due now'
  const hours = Math.floor(difference / 3_600_000)
  const minutes = Math.floor((difference % 3_600_000) / 60_000)
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`
}

export const toRequestView = (record) => {
  const status = record.status || 'ACTIVE'
  const urgency = record.urgency || 'NORMAL'
  return {
    ...record,
    id: record.id,
    bloodGroup: displayBloodGroup(record.bloodGroup),
    units: record.unitsRequired,
    hospital: record.hospital,
    location: record.location,
    distance: record.location,
    urgency: titleCase(urgency),
    status: titleCase(status),
    matchedDonors: record.matchedDonorIds?.length || 0,
    acceptedDonorIds: record.acceptedDonorIds || [],
    created: formatDate(record.createdAt),
    requiredBefore: formatDate(record.requiredBefore),
    timeRemaining: remainingTime(record.requiredBefore, status),
    notes: record.additionalNotes || record.notes || 'No additional notes were provided.',
  }
}

export const toDonorView = (donor, acceptedDonorIds = []) => ({
  ...donor,
  initials: donor.name?.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase(),
  distance: `${Number(donor.distanceKm ?? 0).toFixed(1)} km`,
  match: donor.matchScore,
  lastDonation: formatDate(donor.lastDonationDate, 'No previous donation'),
  availability: donor.isAvailable ? 'Available' : 'Unavailable',
  response: acceptedDonorIds.includes(donor.id) ? 'Accepted' : donor.isAvailable ? 'Awaiting response' : 'Not available',
  tone: donor.id?.endsWith('a') ? 'blue' : 'teal',
})

export const toApiBloodGroup = (value) => value.replace(/−/g, '-')
export const toApiUrgency = (value) => value.toUpperCase()
