export const bloodGroups = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−']

export const currentUser = {
  name: 'Maya Deshmukh',
  role: 'Hospital coordinator',
  initials: 'MD',
  organization: 'CityCare Medical Center',
}

export const emergencyRequests = [
  {
    id: 'BER-24081',
    bloodGroup: 'O−',
    units: 3,
    hospital: 'CityCare Medical Center',
    location: 'Koramangala, Bengaluru',
    distance: '2.4 km',
    urgency: 'Critical',
    timeRemaining: '01h 42m',
    status: 'Active',
    matchedDonors: 8,
    created: 'Today, 09:18 AM',
    requiredBefore: 'Today, 12:00 PM',
    notes: 'Trauma surgery scheduled. O-negative donors preferred for immediate cross-match.',
    timeline: [
      ['09:18 AM', 'Request created by Maya Deshmukh'],
      ['09:23 AM', 'Emergency alert sent to 18 matching donors'],
      ['09:31 AM', '3 donors have responded'],
    ],
  },
  {
    id: 'BER-24079',
    bloodGroup: 'B+',
    units: 2,
    hospital: 'St. Martha’s Hospital',
    location: 'Vasanth Nagar, Bengaluru',
    distance: '5.8 km',
    urgency: 'Urgent',
    timeRemaining: '04h 18m',
    status: 'Active',
    matchedDonors: 12,
    created: 'Today, 07:42 AM',
    requiredBefore: 'Today, 02:30 PM',
    notes: 'Needed for an oncology patient undergoing a planned procedure.',
    timeline: [
      ['07:42 AM', 'Request created by Anil Joseph'],
      ['07:45 AM', 'Emergency alert sent to 24 matching donors'],
    ],
  },
  {
    id: 'BER-24076',
    bloodGroup: 'A+',
    units: 4,
    hospital: 'Narayana Health City',
    location: 'Bommasandra, Bengaluru',
    distance: '12.1 km',
    urgency: 'Urgent',
    timeRemaining: '06h 55m',
    status: 'Active',
    matchedDonors: 21,
    created: 'Today, 06:14 AM',
    requiredBefore: 'Today, 05:00 PM',
    notes: 'Four units needed for a cardiac care patient. Any eligible A+ donor can respond.',
    timeline: [
      ['06:14 AM', 'Request created by Priya Nair'],
      ['06:19 AM', 'Emergency alert sent to 36 matching donors'],
      ['07:05 AM', '6 donors have responded'],
    ],
  },
  {
    id: 'BER-24071',
    bloodGroup: 'AB+',
    units: 1,
    hospital: 'Manipal Hospital',
    location: 'Old Airport Road, Bengaluru',
    distance: '8.6 km',
    urgency: 'Normal',
    timeRemaining: '18h 22m',
    status: 'Active',
    matchedDonors: 7,
    created: 'Yesterday, 04:50 PM',
    requiredBefore: 'Tomorrow, 01:00 PM',
    notes: 'Routine scheduled transfusion. A single compatible donor is required.',
    timeline: [['Yesterday, 04:50 PM', 'Request created by Dr. Nikhil Rao']],
  },
  {
    id: 'BER-24062',
    bloodGroup: 'O+',
    units: 2,
    hospital: 'People’s General Hospital',
    location: 'Indiranagar, Bengaluru',
    distance: '3.9 km',
    urgency: 'Critical',
    timeRemaining: 'Fulfilled',
    status: 'Fulfilled',
    matchedDonors: 14,
    created: 'Yesterday, 10:12 AM',
    requiredBefore: 'Yesterday, 03:00 PM',
    notes: 'Fulfilled through the emergency donor network.',
    timeline: [
      ['10:12 AM', 'Request created'],
      ['11:08 AM', '2 donors confirmed'],
      ['01:42 PM', 'Request marked fulfilled'],
    ],
  },
]

export const donors = [
  { id: 'D-1001', name: 'Arjun Menon', initials: 'AM', bloodGroup: 'O−', distance: '2.4 km', availability: 'Available', match: 95, lastDonation: '12 Jan 2024', response: 'Awaiting response', tone: 'green' },
  { id: 'D-1002', name: 'Sara Thomas', initials: 'ST', bloodGroup: 'O−', distance: '4.1 km', availability: 'Available', match: 91, lastDonation: '28 Nov 2023', response: 'Accepted', tone: 'blue' },
  { id: 'D-1003', name: 'Rohan Kapoor', initials: 'RK', bloodGroup: 'O−', distance: '5.8 km', availability: 'Available', match: 87, lastDonation: '05 Dec 2023', response: 'Awaiting response', tone: 'green' },
  { id: 'D-1004', name: 'Meera Iyer', initials: 'MI', bloodGroup: 'O−', distance: '8.2 km', availability: 'Unavailable', match: 82, lastDonation: '16 Oct 2023', response: 'Not available', tone: 'gray' },
]

export const donations = [
  { date: '12 Jan 2024', hospital: 'CityCare Medical Center', type: 'Emergency donation', units: '1 unit', status: 'Completed' },
  { date: '18 Sep 2023', hospital: 'St. Martha’s Hospital', type: 'Whole blood', units: '1 unit', status: 'Completed' },
  { date: '05 May 2023', hospital: 'Narayana Health City', type: 'Emergency donation', units: '1 unit', status: 'Completed' },
]

export const demandData = [
  { group: 'O+', value: 82, requests: 42, color: 'teal' },
  { group: 'A+', value: 64, requests: 31, color: 'blue' },
  { group: 'B+', value: 51, requests: 25, color: 'purple' },
  { group: 'O−', value: 38, requests: 18, color: 'coral' },
  { group: 'AB+', value: 29, requests: 14, color: 'gold' },
]

export const hospitals = [
  { name: 'CityCare Medical Center', city: 'Bengaluru', requests: 18, status: 'Verified' },
  { name: 'St. Martha’s Hospital', city: 'Bengaluru', requests: 12, status: 'Verified' },
  { name: 'Narayana Health City', city: 'Bengaluru', requests: 9, status: 'Verified' },
]
