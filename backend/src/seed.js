import './config/env.js'
import { REQUEST_STATUS, URGENCY } from './config/constants.js'
import { BloodRequest } from './models/BloodRequest.js'
import { Donor } from './models/Donor.js'
import { Hospital } from './models/Hospital.js'
import { jsonStore } from './models/jsonStore.js'

const hoursFromNow = (hours) => new Date(Date.now() + hours * 60 * 60 * 1000)
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000)

const demoHospitals = [
  { name: 'City Care Hospital', email: 'demo.citycare@bloodboard.example', phone: '+91 80 4000 1001', location: 'Koramangala, Bengaluru', address: '12th Main Road, Koramangala, Bengaluru', verified: true },
  { name: 'Apollo Emergency Center', email: 'demo.apollo@bloodboard.example', phone: '+91 80 4000 1002', location: 'Jayanagar, Bengaluru', address: '24th Cross, Jayanagar, Bengaluru', verified: true },
  { name: 'Sunrise Medical Center', email: 'demo.sunrise@bloodboard.example', phone: '+91 80 4000 1003', location: 'Indiranagar, Bengaluru', address: '100 Feet Road, Indiranagar, Bengaluru', verified: true },
  { name: 'Narayana Health City', email: 'demo.narayana@bloodboard.example', phone: '+91 80 4000 1004', location: 'Bommasandra, Bengaluru', address: 'Hosur Road, Bommasandra, Bengaluru', verified: true },
  { name: 'St. Martha’s Hospital', email: 'demo.stmarthas@bloodboard.example', phone: '+91 80 4000 1005', location: 'Vasanth Nagar, Bengaluru', address: 'Nrupathunga Road, Vasanth Nagar, Bengaluru', verified: true },
]

const demoDonors = [
  ['Arjun Menon', 'arjun.demo@bloodboard.example', 'O-', 'Koramangala, Bengaluru', true, 2.4, 4, 45],
  ['Sara Thomas', 'sara.demo@bloodboard.example', 'O-', 'HSR Layout, Bengaluru', true, 4.1, 6, 90],
  ['Rohan Kapoor', 'rohan.demo@bloodboard.example', 'O-', 'Indiranagar, Bengaluru', true, 5.8, 2, 72],
  ['Meera Iyer', 'meera.demo@bloodboard.example', 'A+', 'Vasanth Nagar, Bengaluru', false, 6.6, 3, 120],
  ['Kabir Shah', 'kabir.demo@bloodboard.example', 'B+', 'Jayanagar, Bengaluru', true, 3.7, 5, 24],
  ['Nisha Rao', 'nisha.demo@bloodboard.example', 'A+', 'Whitefield, Bengaluru', true, 11.2, 1, 200],
  ['Dev Malhotra', 'dev.demo@bloodboard.example', 'AB+', 'MG Road, Bengaluru', true, 7.9, 3, 18],
  ['Priyanka Das', 'priyanka.demo@bloodboard.example', 'O+', 'BTM Layout, Bengaluru', false, 8.5, 7, 250],
  ['Vikram Singh', 'vikram.demo@bloodboard.example', 'A-', 'Malleshwaram, Bengaluru', true, 9.4, 2, 60],
  ['Aisha Khan', 'aisha.demo@bloodboard.example', 'B-', 'Richmond Town, Bengaluru', true, 4.9, 3, 33],
  ['Neel Joshi', 'neel.demo@bloodboard.example', 'AB-', 'Rajajinagar, Bengaluru', false, 10.3, 1, 180],
  ['Tara George', 'tara.demo@bloodboard.example', 'O+', 'JP Nagar, Bengaluru', true, 6.1, 4, 48],
  ['Aditya Nair', 'aditya.demo@bloodboard.example', 'B+', 'Electronic City, Bengaluru', true, 13.5, 2, 95],
  ['Ishita Bose', 'ishita.demo@bloodboard.example', 'A+', 'Kalyan Nagar, Bengaluru', true, 12.7, 5, 36],
  ['Manav Patel', 'manav.demo@bloodboard.example', 'O-', 'Basavanagudi, Bengaluru', false, 5.2, 3, 150],
].map(([name, email, bloodGroup, location, isAvailable, distanceKm, donationCount, daysSinceDonation], index) => ({
  name,
  email,
  phone: '+91 98765 2' + String(index + 1).padStart(4, '0'),
  bloodGroup,
  location,
  isAvailable,
  distanceKm,
  donationCount,
  lastDonationDate: daysAgo(daysSinceDonation).toISOString(),
}))

const buildRequests = (hospitals) => {
  const [cityCare, apollo, sunrise, narayana, martha] = hospitals
  return [
    { bloodGroup: 'O-', unitsRequired: 3, hospital: cityCare.name, hospitalId: cityCare.id, location: cityCare.location, urgency: URGENCY.CRITICAL, requiredBefore: hoursFromNow(2).toISOString(), status: REQUEST_STATUS.ACTIVE, additionalNotes: 'Trauma surgery scheduled. O-negative donors preferred for immediate cross-match.' },
    { bloodGroup: 'B+', unitsRequired: 2, hospital: apollo.name, hospitalId: apollo.id, location: apollo.location, urgency: URGENCY.URGENT, requiredBefore: hoursFromNow(5).toISOString(), status: REQUEST_STATUS.MATCHING, additionalNotes: 'Two units needed for an oncology patient undergoing a planned procedure.' },
    { bloodGroup: 'A+', unitsRequired: 4, hospital: sunrise.name, hospitalId: sunrise.id, location: sunrise.location, urgency: URGENCY.URGENT, requiredBefore: hoursFromNow(8).toISOString(), status: REQUEST_STATUS.ACTIVE, additionalNotes: 'Four units needed for a cardiac care patient.' },
    { bloodGroup: 'AB+', unitsRequired: 1, hospital: cityCare.name, hospitalId: cityCare.id, location: cityCare.location, urgency: URGENCY.NORMAL, requiredBefore: hoursFromNow(24).toISOString(), status: REQUEST_STATUS.ACTIVE, additionalNotes: 'Routine scheduled transfusion. A single compatible donor is required.' },
    { bloodGroup: 'O+', unitsRequired: 2, hospital: martha.name, hospitalId: martha.id, location: martha.location, urgency: URGENCY.CRITICAL, requiredBefore: hoursFromNow(-4).toISOString(), status: REQUEST_STATUS.FULFILLED, fulfilledAt: new Date().toISOString(), additionalNotes: 'Fulfilled through the emergency donor network.' },
    { bloodGroup: 'A-', unitsRequired: 2, hospital: narayana.name, hospitalId: narayana.id, location: narayana.location, urgency: URGENCY.NORMAL, requiredBefore: hoursFromNow(32).toISOString(), status: REQUEST_STATUS.ACTIVE, additionalNotes: 'Planned surgical procedure later today.' },
    { bloodGroup: 'B-', unitsRequired: 1, hospital: apollo.name, hospitalId: apollo.id, location: apollo.location, urgency: URGENCY.CRITICAL, requiredBefore: hoursFromNow(3).toISOString(), status: REQUEST_STATUS.MATCHING, additionalNotes: 'Emergency care unit requires one compatible donor.' },
    { bloodGroup: 'AB-', unitsRequired: 2, hospital: sunrise.name, hospitalId: sunrise.id, location: sunrise.location, urgency: URGENCY.NORMAL, requiredBefore: hoursFromNow(48).toISOString(), status: REQUEST_STATUS.CANCELLED, additionalNotes: 'Request cancelled after an internal stock update.' },
  ]
}

const seed = async () => {
  await jsonStore.initialize()
  const now = new Date().toISOString()
  const demoRecord = (record, index, offset) => ({
    ...record,
    id: (offset + index).toString(16).padStart(24, '0'),
    isDemo: true,
    createdAt: now,
    updatedAt: now,
  })
  const hospitals = demoHospitals.map((record, index) => demoRecord(record, index, 1001))
  const donors = demoDonors.map((record, index) => demoRecord(record, index, 2001))
  const requests = buildRequests(hospitals).map((record, index) => demoRecord({ matchedDonorIds: [], acceptedDonorIds: [], fulfilledAt: null, ...record }, index, 3001))
  // Reset demo records only; preserve accounts, linked profiles, and user-created requests.
  const keepRealRecords = async (model, demo) => model.replaceAll([
    ...(await model.findAll()).filter((record) => !record.isDemo),
    ...demo,
  ])
  await keepRealRecords(Hospital, hospitals)
  await keepRealRecords(Donor, donors)
  await keepRealRecords(BloodRequest, requests)

  console.log('Demo JSON seed complete')
  console.log(`Hospitals: ${hospitals.length}`)
  console.log(`Donors: ${donors.length}`)
  console.log(`Blood requests: ${requests.length}`)
  console.log('Storage: local JSON files')
}

try {
  await seed()
} catch {
  console.error('Seed failed. Check local file permissions, JSON format, and demo field validation.')
  process.exitCode = 1
}
