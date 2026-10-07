import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, test } from 'node:test'
import { createJsonStore } from '../src/models/jsonStore.js'
import { errorHandler } from '../src/middleware/errors.js'
import { isCompatible } from '../src/services/matchingService.js'

const backend = fileURLToPath(new URL('../', import.meta.url))
let directory
let processHandle
let baseUrl
let hospitals
let donors
let fulfilledId
let cancelledId
let deletedId
let updatedDonorId
let updatedHospitalId
let adminToken
let hospitalAccount
const donorAccounts = new Map()
const testPassword = `Test-${randomBytes(16).toString('hex')}X7!`
const testEnvironment = { ...process.env, JWT_SECRET: randomBytes(48).toString('hex'), JWT_EXPIRES_IN: '1d', ADMIN_EMAIL: 'regression.admin@example.com', ADMIN_PASSWORD: testPassword }

const startBackend = async () => {
  processHandle = spawn(process.execPath, ['server.js'], {
    cwd: backend,
    env: { ...testEnvironment, PORT: '0', DATA_DIR: directory },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Test API startup timed out')), 10000)
    let output = ''
    processHandle.stdout.on('data', (chunk) => {
      output += chunk
      const port = output.match(/localhost:(\d+)/)?.[1]
      if (port) {
        baseUrl = `http://127.0.0.1:${port}`
        clearTimeout(timer)
        resolve()
      }
    })
    processHandle.on('error', () => { clearTimeout(timer); reject(new Error('Test API startup failed')) })
    processHandle.once('exit', () => { clearTimeout(timer); reject(new Error('Test API exited before startup')) })
  })
}

const stopBackend = async () => {
  if (!processHandle || processHandle.exitCode !== null) return
  const exited = once(processHandle, 'exit')
  processHandle.kill('SIGTERM')
  await exited
}

const api = async (endpoint, method = 'GET', body, expectedStatus = 200) => {
  let token
  if (method !== 'GET' && !endpoint.startsWith('/api/auth/')) {
    if (endpoint.endsWith('/accept')) token = donorAccounts.get(body?.donorId)?.token
    else if (endpoint.startsWith('/api/donors/') && method === 'PUT') token = donorAccounts.get(endpoint.split('/').pop())?.token ?? [...donorAccounts.values()][0]?.token
    else if (endpoint.startsWith('/api/requests') && method !== 'DELETE') token = hospitalAccount?.token
    else token = adminToken
  }
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const json = await response.json()
  assert.equal(response.status, expectedStatus, `${method} ${endpoint}: ${json.message ?? response.status}`)
  assert.equal(json.success, expectedStatus < 400)
  return json
}

const newRequest = (extra = {}) => ({
  bloodGroup: 'O-', unitsRequired: 2,
  hospital: hospitalAccount.user.name, hospitalId: hospitalAccount.user.hospitalId,
  location: hospitalAccount.user.location, urgency: 'CRITICAL',
  requiredBefore: new Date(Date.now() + 4 * 3600000).toISOString(),
  additionalNotes: 'Automated demo verification',
  ...extra,
})

const registerAccount = async (role, email, bloodGroup, name = 'Regression Account') => {
  await api('/api/auth/register', 'POST', { name, email, password: testPassword, phone: '9876543210', role, bloodGroup, location: 'Bengaluru' }, 201)
  const account = (await api('/api/auth/login', 'POST', { email, password: testPassword })).data
  if (role === 'DONOR') donorAccounts.set(account.user.donorId, account)
  return account
}

const ownDonor = (group) => [...donorAccounts.values()].find((account) => account.user.bloodGroup === group).user.donorId

before(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'bloodboard-api-test-'))
  const seed = spawnSync(process.execPath, ['src/seed.js'], { cwd: backend, env: { ...testEnvironment, DATA_DIR: directory }, encoding: 'utf8' })
  assert.equal(seed.status, 0, 'Demo seed should succeed')
  const admin = spawnSync(process.execPath, ['src/seedAdmin.js'], { cwd: backend, env: { ...testEnvironment, DATA_DIR: directory }, encoding: 'utf8' })
  assert.equal(admin.status, 0, 'Admin setup should succeed')
  await startBackend()
  adminToken = (await api('/api/auth/login', 'POST', { email: testEnvironment.ADMIN_EMAIL, password: testPassword })).data.token
  hospitalAccount = await registerAccount('HOSPITAL', 'regression.hospital@example.com', undefined, 'Regression Hospital')
  await registerAccount('DONOR', 'regression.o@example.com', 'O-')
  await registerAccount('DONOR', 'regression.a@example.com', 'A+')
  await registerAccount('DONOR', 'regression.b@example.com', 'B+')
})

after(async () => {
  await stopBackend()
  if (directory) await rm(directory, { recursive: true, force: true })
})

test('file store serializes concurrent writes, survives reload, and preserves corrupt files', async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'bloodboard-store-test-'))
  try {
    const store = createJsonStore(temporary)
    await store.initialize()
    await Promise.all(Array.from({ length: 30 }, (_, index) => store.mutate('donors', (records) => {
      records.push({ id: String(index), name: 'Demo' })
      return index
    })))
    assert.equal((await store.read('donors')).length, 30)
    const reloaded = createJsonStore(temporary)
    await reloaded.initialize()
    assert.equal((await reloaded.read('donors')).length, 30)
    assert.equal((await readdir(temporary)).some((name) => name.endsWith('.tmp')), false)

    await assert.rejects(store.mutate('donors', () => { throw new Error('Deliberate failed update') }))
    await store.mutate('donors', (records) => records.push({ id: 'next' }))
    assert.equal((await store.read('donors')).length, 31)

    await writeFile(path.join(temporary, 'donors.json'), '{broken JSON')
    await assert.rejects(store.mutate('donors', (records) => records.push({ id: 'wrong' })), { code: 'STORAGE_ERROR' })
    assert.equal(await readFile(path.join(temporary, 'donors.json'), 'utf8'), '{broken JSON')
    await assert.rejects(createJsonStore(temporary).initialize(), { code: 'STORAGE_ERROR' })
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
})

test('health, seeded lists, individual records, and filters return real data', async () => {
  const health = (await api('/api/health')).data
  assert.equal(health.status, 'ok')
  assert.equal(health.database.type, 'json-file')
  assert.equal(health.database.state, 'connected')
  hospitals = (await api('/api/hospitals')).data
  donors = (await api('/api/donors')).data
  const requests = (await api('/api/requests')).data
  assert.equal(hospitals.filter((record) => record.isDemo).length, 5)
  assert.equal(donors.filter((record) => record.isDemo).length, 15)
  assert.equal(requests.length, 8)
  assert.ok(requests.every((request) => request.isDemo && request.id && request.notes === request.additionalNotes))
  assert.equal((await api(`/api/hospitals/${hospitals[0].id}`)).data.name, hospitals[0].name)
  assert.equal((await api(`/api/donors/${donors[0].id}`)).data.name, donors[0].name)
  assert.equal((await api(`/api/requests/${requests[0].id}`)).data.id, requests[0].id)
  const filtered = (await api('/api/requests?status=ACTIVE&bloodGroup=A%2B')).data
  assert.ok(filtered.length > 0 && filtered.every((request) => request.status === 'ACTIVE' && request.bloodGroup === 'A+'))
  assert.ok((await api('/api/donors?availability=UNAVAILABLE')).data.every((donor) => !donor.isAvailable))
})

test('request CRUD, compatible matching, acceptance, fulfillment, and cancellation', async () => {
  const created = (await api('/api/requests', 'POST', newRequest({ notes: 'Legacy note', additionalNotes: undefined }), 201)).data
  fulfilledId = created.id
  assert.equal(created.status, 'ACTIVE')
  assert.equal(created.additionalNotes, 'Legacy note')
  const updated = (await api(`/api/requests/${created.id}`, 'PUT', { unitsRequired: 3 })).data
  assert.equal(updated.unitsRequired, 3)
  assert.equal(updated.bloodGroup, created.bloodGroup)
  assert.equal(updated.urgency, created.urgency)
  const matched = (await api(`/api/requests/${created.id}/matches`)).data
  assert.ok(matched.totalMatches > 0)
  assert.ok(matched.matches.every((donor) => donor.isAvailable && isCompatible('O-', donor.bloodGroup)))
  assert.ok(matched.matches.every((donor, index) => !index || matched.matches[index - 1].matchScore >= donor.matchScore))
  await api(`/api/donors/${ownDonor('O-')}`, 'PUT', { isAvailable: false })
  await api(`/api/requests/${created.id}/accept`, 'POST', { donorId: ownDonor('O-') }, 400)
  await api(`/api/donors/${ownDonor('O-')}`, 'PUT', { isAvailable: true })
  await api(`/api/requests/${created.id}/accept`, 'POST', { donorId: ownDonor('B+') }, 400)
  const accepted = (await api(`/api/requests/${created.id}/accept`, 'POST', { donorId: ownDonor('O-') })).data
  assert.equal(accepted.request.status, 'MATCHING')
  await api(`/api/requests/${created.id}/accept`, 'POST', { donorId: ownDonor('O-') })
  assert.equal((await api(`/api/requests/${created.id}`)).data.acceptedDonorIds.length, 1)
  const fulfilled = (await api(`/api/requests/${created.id}/fulfill`, 'POST')).data
  assert.equal(fulfilled.status, 'FULFILLED')
  assert.ok(fulfilled.fulfilledAt)
  await api(`/api/requests/${created.id}/cancel`, 'POST', undefined, 409)
  await api(`/api/requests/${created.id}`, 'PUT', { status: 'ACTIVE' }, 409)

  cancelledId = (await api('/api/requests', 'POST', newRequest(), 201)).data.id
  assert.equal((await api(`/api/requests/${cancelledId}/cancel`, 'POST')).data.status, 'CANCELLED')
  await api(`/api/requests/${cancelledId}/fulfill`, 'POST', undefined, 409)
  deletedId = (await api('/api/requests', 'POST', newRequest(), 201)).data.id
  await api(`/api/requests/${deletedId}`, 'DELETE')
  await api(`/api/requests/${deletedId}`, 'GET', undefined, 404)
})

test('donor/hospital CRUD, aliases, duplicate emails, and availability affect matches', async () => {
  const donorBody = { name: 'Test Donor', email: 'test.donor@example.com', bloodGroup: 'O-', location: 'Bengaluru', distanceKm: 1.2 }
  const account = await registerAccount('DONOR', donorBody.email, 'O-', donorBody.name)
  const donor = (await api(`/api/donors/${account.user.donorId}`)).data
  updatedDonorId = donor.id
  await api('/api/donors', 'POST', { ...donorBody, email: 'TEST.DONOR@EXAMPLE.COM' }, 409)
  await api(`/api/donors/${donor.id}`, 'PUT', { availability: 'UNAVAILABLE', phone: '+91 98765 30000' })
  assert.equal((await api(`/api/donors/${donor.id}`)).data.isAvailable, false)
  const active = (await api('/api/requests?status=ACTIVE')).data[0]
  assert.ok((await api(`/api/requests/${active.id}/matches`)).data.matches.every((match) => match.id !== donor.id))

  const hospitalBody = { name: 'Test Hospital', email: 'test.hospital@example.com', location: 'Bengaluru' }
  const hospital = (await api('/api/hospitals', 'POST', hospitalBody, 201)).data
  updatedHospitalId = hospital.id
  await api('/api/hospitals', 'POST', hospitalBody, 409)
  const updated = (await api(`/api/hospitals/${hospital.id}`, 'PUT', { isVerified: true, address: 'Demo address' })).data
  assert.equal(updated.verified, true)
  assert.equal(updated.isVerified, true)
})

test('invalid fields, malformed JSON, missing records, and 404 routes return consistent errors', async () => {
  for (const bad of [{ bloodGroup: 'X' }, { unitsRequired: 0 }, { unitsRequired: -1 }, { unitsRequired: 1.5 }, { urgency: 'LOW' }, { requiredBefore: '2026-02-30' }, { hospital: '' }, { location: null }, { status: 'UNKNOWN' }]) {
    assert.equal((await api('/api/requests', 'POST', newRequest(bad), 400)).code, 'VALIDATION_ERROR')
  }
  await api('/api/requests', 'POST', {}, 400)
  await api('/api/donors', 'POST', { name: 'No email', bloodGroup: 'A+', location: 'Demo' }, 400)
  await api('/api/hospitals', 'POST', { name: 'Bad email', location: 'Demo', email: 'invalid' }, 400)
  await api(`/api/donors/${donors[0].id}`, 'PUT', { name: 42 }, 400)
  await api(`/api/requests/${fulfilledId}`, 'PUT', {}, 400)
  await api('/api/requests?status=invalid', 'GET', undefined, 400)
  await api('/api/requests/not-found', 'GET', undefined, 404)
  await api('/api/donors/not-found', 'GET', undefined, 404)
  await api('/api/hospitals/not-found', 'GET', undefined, 404)
  await api('/api/unknown', 'GET', undefined, 404)
  const response = await fetch(`${baseUrl}/api/requests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad json' })
  assert.equal(response.status, 400)
  assert.equal((await response.json()).code, 'INVALID_JSON')
})

test('concurrent creates and acceptances do not lose writes; duplicate checks are serialized', async () => {
  const body = { name: 'Concurrent Demo', email: 'concurrent@example.com', bloodGroup: 'O-', location: 'Bengaluru' }
  const responses = await Promise.all([1, 2].map(() => fetch(`${baseUrl}/api/donors`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` }, body: JSON.stringify(body) })))
  assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409])
  const request = (await api('/api/requests', 'POST', newRequest({ bloodGroup: 'A+' }), 201)).data
  const compatible = [{ id: ownDonor('A+') }, { id: ownDonor('O-') }]
  await Promise.all(compatible.map((donor) => api(`/api/requests/${request.id}/accept`, 'POST', { donorId: donor.id })))
  assert.equal((await api(`/api/requests/${request.id}`)).data.acceptedDonorIds.length, 2)
  await api(`/api/requests/${request.id}`, 'PUT', { bloodGroup: 'O-' }, 409)
})

test('fulfilled/cancelled/updated records and deletion persist after a real backend restart', async () => {
  await stopBackend()
  await startBackend()
  const fulfilled = (await api(`/api/requests/${fulfilledId}`)).data
  assert.equal(fulfilled.status, 'FULFILLED')
  assert.equal(fulfilled.unitsRequired, 3)
  assert.ok(fulfilled.fulfilledAt && fulfilled.acceptedDonorIds.length)
  assert.equal((await api(`/api/requests/${cancelledId}`)).data.status, 'CANCELLED')
  assert.equal((await api(`/api/donors/${updatedDonorId}`)).data.isAvailable, false)
  assert.equal((await api(`/api/hospitals/${updatedHospitalId}`)).data.address, 'Demo address')
  await api(`/api/requests/${deletedId}`, 'GET', undefined, 404)
})

test('internal failures omit private values in both response bodies and logs', () => {
  const marker = 'PRIVATE_TEST_VALUE'
  let response
  const logs = []
  const originalLog = console.error
  console.error = (...args) => logs.push(args.join(' '))
  try {
    errorHandler(new Error(marker), {}, { status(code) { assert.equal(code, 500); return this }, json(body) { response = body } }, () => {})
  } finally {
    console.error = originalLog
  }
  assert.equal(JSON.stringify({ logs, response }).includes(marker), false)
  assert.equal(response.message, 'Something went wrong')
})
