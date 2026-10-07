import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { after, before, test } from 'node:test'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const backend = fileURLToPath(new URL('../', import.meta.url))
const password = `Test-${randomBytes(16).toString('hex')}X7!`
const secret = randomBytes(48).toString('base64url')
const environment = { ...process.env, JWT_SECRET: secret, JWT_EXPIRES_IN: '1d', ADMIN_EMAIL: 'auth.admin@example.com', ADMIN_PASSWORD: password }
const options = { algorithm: 'HS256', issuer: 'blood-emergency-board', audience: 'bloodboard-api' }
let directory
let child
let baseUrl
let logs = ''
let donor
let hospital
let otherDonor
let otherHospital
let donorToken
let hospitalToken
let otherHospitalToken
let adminToken
let ownedRequest
let otherRequest

const start = async () => {
  child = spawn(process.execPath, ['server.js'], { cwd: backend, env: { ...environment, PORT: '0', DATA_DIR: directory }, stdio: ['ignore', 'pipe', 'pipe'] })
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Auth test startup timed out')), 10000)
    child.stdout.on('data', (chunk) => {
      logs += chunk
      const port = chunk.toString().match(/localhost:(\d+)/)?.[1]
      if (port) { baseUrl = `http://127.0.0.1:${port}`; clearTimeout(timer); resolve() }
    })
    child.stderr.on('data', (chunk) => { logs += chunk })
    child.once('error', () => { clearTimeout(timer); reject(new Error('Auth test startup failed')) })
    child.once('exit', () => { clearTimeout(timer); reject(new Error('Auth test server exited before startup')) })
  })
}

const stop = async () => {
  if (!child || child.exitCode !== null) return
  const exited = once(child, 'exit')
  child.kill('SIGTERM')
  await exited
}

const assertSafe = (body) => {
  const encoded = JSON.stringify(body)
  assert.equal(encoded.includes(password), false, 'API response must not expose the test password')
  assert.equal(encoded.includes(secret), false, 'API response must not expose the JWT secret')
  assert.equal(/\$2[aby]\$\d\d\$/.test(encoded), false, 'API response must not expose any bcrypt hash')
  const check = (value) => {
    if (!value || typeof value !== 'object') return
    assert.equal(Object.hasOwn(value, 'password'), false, 'Password fields must be omitted')
    assert.equal(Object.hasOwn(value, 'passwordHash'), false, 'Password hash fields must be omitted')
    for (const nested of Object.values(value)) check(nested)
  }
  check(body)
}

const api = async (endpoint, method = 'GET', body, expected = 200, token) => {
  const res = await fetch(baseUrl + endpoint, {
    method,
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  assertSafe(json)
  assert.equal(res.status, expected, `${method} ${endpoint}: ${json.message ?? 'unexpected response'}`)
  assert.equal(json.success, expected < 400)
  return json
}

const registration = (role, email, extra = {}) => ({ name: role === 'DONOR' ? 'John Demo' : 'Demo Hospital Account', email, password, phone: '9876543210', role, location: 'Hyderabad', ...(role === 'DONOR' ? { bloodGroup: 'O+' } : {}), ...extra })
const requestBody = (user = hospital) => ({ bloodGroup: 'O+', unitsRequired: 2, hospital: user.name, hospitalId: user.hospitalId, location: user.location, urgency: 'CRITICAL', requiredBefore: new Date(Date.now() + 7200000).toISOString(), additionalNotes: 'Authentication workflow test' })
const readUsers = async () => JSON.parse(await readFile(path.join(directory, 'users.json'), 'utf8'))

before(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'bloodboard-auth-test-'))
  for (const script of ['src/seed.js', 'src/seedAdmin.js']) {
    const result = spawnSync(process.execPath, [script], { cwd: backend, env: { ...environment, DATA_DIR: directory }, encoding: 'utf8' })
    assert.equal(result.status, 0, `${script} should succeed`)
    logs += result.stdout + result.stderr
  }
  await start()
})

after(async () => {
  await stop()
  if (directory) await rm(directory, { recursive: true, force: true })
})

test('public health and emergency board remain accessible with JSON storage', async () => {
  const health = (await api('/api/health')).data
  assert.equal(health.database.type, 'json-file')
  assert.equal(health.database.state, 'connected')
  assert.equal((await api('/api/requests')).data.length, 8)
})

test('register donor returns HTTP 201 and links a private user to its donor profile', async () => {
  donor = (await api('/api/auth/register', 'POST', registration('DONOR', 'john.demo@example.com'), 201)).data.user
  assert.equal(donor.role, 'DONOR')
  assert.ok(donor.donorId)
  const records = JSON.parse(await readFile(path.join(directory, 'donors.json'), 'utf8'))
  assert.equal(records.find((profile) => profile.id === donor.donorId).userId, donor.id)
  otherDonor = (await api('/api/auth/register', 'POST', registration('DONOR', 'other.donor@example.com', { bloodGroup: 'A+' }), 201)).data.user
})

test('register hospital returns HTTP 201 with a linked hospital reference', async () => {
  hospital = (await api('/api/auth/register', 'POST', registration('HOSPITAL', 'hospital.demo@example.com'), 201)).data.user
  assert.equal(hospital.role, 'HOSPITAL')
  assert.ok(hospital.hospitalId)
  const records = JSON.parse(await readFile(path.join(directory, 'hospitals.json'), 'utf8'))
  assert.equal(records.find((profile) => profile.id === hospital.hospitalId).userId, hospital.id)
  otherHospital = (await api('/api/auth/register', 'POST', registration('HOSPITAL', 'other.hospital@example.com', { name: 'Other Hospital' }), 201)).data.user
})

test('registration validates identity, password limits, role, blood group, and rejects privilege injection', async () => {
  for (const invalid of [
    { name: '' }, { email: 'invalid' }, { password: 'weak' }, { password: 'A1!' + 'x'.repeat(70) },
    { password: 'A1!' + 'é'.repeat(36) }, { phone: 'abc' }, { role: 'ADMIN' }, { role: 'OTHER' },
    { bloodGroup: 'X' }, { bloodGroup: undefined }, { location: '' }, { isAvailable: 'yes' },
    { donorId: donor.donorId }, { userId: donor.id },
  ]) await api('/api/auth/register', 'POST', registration('DONOR', 'invalid.account@example.com', invalid), 400)
  await api('/api/auth/register', 'POST', [], 400)
  await api('/api/auth/login', 'POST', { email: 'invalid', password }, 400)
})

test('duplicate email is case-insensitive and concurrent registrations create one account/profile', async () => {
  await api('/api/auth/register', 'POST', registration('DONOR', 'JOHN.DEMO@EXAMPLE.COM'), 409)
  const body = registration('DONOR', 'concurrent.auth@example.com')
  const responses = await Promise.all([1, 2].map(() => fetch(`${baseUrl}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })))
  assert.deepEqual(responses.map((res) => res.status).sort(), [201, 409])
  for (const response of responses) assertSafe(await response.json())
  assert.equal((await readUsers()).filter((user) => user.email === body.email).length, 1)
  const profiles = JSON.parse(await readFile(path.join(directory, 'donors.json'), 'utf8'))
  assert.equal(profiles.filter((profile) => profile.email === body.email).length, 1)
})

test('donor and hospital login return HTTP 200 with verifiable expiring JWTs', async () => {
  const donorLogin = (await api('/api/auth/login', 'POST', { email: donor.email, password })).data
  const hospitalLogin = (await api('/api/auth/login', 'POST', { email: hospital.email, password })).data
  donorToken = donorLogin.token
  hospitalToken = hospitalLogin.token
  otherHospitalToken = (await api('/api/auth/login', 'POST', { email: otherHospital.email, password })).data.token
  for (const [token, user] of [[donorToken, donor], [hospitalToken, hospital]]) {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'], issuer: options.issuer, audience: options.audience })
    assert.equal(payload.userId, user.id)
    assert.equal(payload.role, user.role)
    assert.equal(payload.exp - payload.iat, 86400)
    assert.equal(Object.hasOwn(payload, 'password'), false)
  }
})

test('wrong-password and nonexistent-user logins both return HTTP 401 with generic messages', async () => {
  const first = await api('/api/auth/login', 'POST', { email: donor.email, password: 'WrongPassword123!' }, 401)
  const second = await api('/api/auth/login', 'POST', { email: 'missing@example.com', password }, 401)
  assert.equal(first.message, second.message)
  assert.equal(first.code, second.code)
})

test('missing and malformed Bearer tokens are rejected with HTTP 401', async () => {
  await api('/api/auth/me', 'GET', undefined, 401)
  await api('/api/requests', 'POST', requestBody(), 401)
  await api(`/api/donors/${donor.donorId}`, 'PUT', { location: 'Demo' }, 401)
  await api('/api/auth/me', 'GET', undefined, 401, 'invalid-token')
  const response = await fetch(`${baseUrl}/api/auth/me`, { headers: { Authorization: `Basic ${donorToken}` } })
  assert.equal(response.status, 401)
})

test('expired, tampered, wrong-key/algorithm, role-mismatch, and missing-user JWTs are rejected', async () => {
  const payload = { userId: donor.id, role: donor.role }
  const tokens = [
    jwt.sign(payload, secret, { ...options, expiresIn: -1 }),
    jwt.sign(payload, randomBytes(32).toString('hex'), { ...options, expiresIn: '1d' }),
    jwt.sign(payload, secret, { ...options, algorithm: 'HS384', expiresIn: '1d' }),
    jwt.sign({ userId: donor.id, role: 'ADMIN' }, secret, { ...options, expiresIn: '1d' }),
    jwt.sign({ userId: randomBytes(12).toString('hex'), role: 'DONOR' }, secret, { ...options, expiresIn: '1d' }),
    jwt.sign(payload, secret, options),
    donorToken.slice(0, -10) + 'tampered',
  ]
  for (const token of tokens) await api('/api/auth/me', 'GET', undefined, 401, token)
})

test('/api/auth/me returns the current safe user and linked profile IDs', async () => {
  const user = (await api('/api/auth/me', 'GET', undefined, 200, donorToken)).data.user
  assert.equal(user.id, donor.id)
  assert.equal(user.donorId, donor.donorId)
  assert.equal(user.role, 'DONOR')
})

test('donor cannot perform hospital operations and hospital cannot perform donor operations', async () => {
  await api('/api/requests', 'POST', requestBody(), 403, donorToken)
  await api(`/api/donors/${donor.donorId}`, 'PUT', { location: 'Other' }, 403, hospitalToken)
  const seeded = (await api('/api/requests')).data[0]
  await api(`/api/requests/${seeded.id}/accept`, 'POST', { donorId: donor.donorId }, 403, hospitalToken)
})

test('donor updates its own profile and account availability/location stay synchronized', async () => {
  const profile = (await api(`/api/donors/${donor.donorId}`, 'PUT', { isAvailable: false, location: 'Secunderabad' }, 200, donorToken)).data
  assert.equal(profile.isAvailable, false)
  const user = (await api('/api/auth/me', 'GET', undefined, 200, donorToken)).data.user
  assert.equal(user.isAvailable, false)
  assert.equal(user.location, 'Secunderabad')
  await api(`/api/donors/${donor.donorId}`, 'PUT', { isAvailable: true }, 200, donorToken)
})

test('donor cannot edit another profile, inject ownership/role fields, or steal an account email', async () => {
  await api(`/api/donors/${otherDonor.donorId}`, 'PUT', { location: 'Other' }, 403, donorToken)
  await api(`/api/donors/${donor.donorId}`, 'PUT', { userId: otherDonor.id }, 400, donorToken)
  await api(`/api/donors/${donor.donorId}`, 'PUT', { role: 'ADMIN' }, 400, donorToken)
  await api(`/api/donors/${donor.donorId}`, 'PUT', { email: hospital.email }, 409, donorToken)
  assert.equal((await api('/api/auth/me', 'GET', undefined, 200, donorToken)).data.user.email, donor.email)
})

test('hospital creates an emergency request bound to its own linked hospital', async () => {
  ownedRequest = (await api('/api/requests', 'POST', requestBody(), 201, hospitalToken)).data
  assert.equal(ownedRequest.hospitalId, hospital.hospitalId)
  assert.equal(ownedRequest.status, 'ACTIVE')
  await api('/api/requests', 'POST', requestBody(otherHospital), 403, hospitalToken)
  await api(`/api/requests/${ownedRequest.id}`, 'PUT', { unitsRequired: 3 }, 200, hospitalToken)
  otherRequest = (await api('/api/requests', 'POST', requestBody(otherHospital), 201, otherHospitalToken)).data
})

test('hospital cannot update, fulfill, cancel, or transfer another hospital request', async () => {
  await api(`/api/requests/${otherRequest.id}`, 'PUT', { unitsRequired: 4 }, 403, hospitalToken)
  await api(`/api/requests/${otherRequest.id}/fulfill`, 'POST', undefined, 403, hospitalToken)
  await api(`/api/requests/${otherRequest.id}/cancel`, 'POST', undefined, 403, hospitalToken)
  await api(`/api/requests/${ownedRequest.id}`, 'PUT', { hospitalId: otherHospital.hospitalId }, 403, hospitalToken)
  await api(`/api/requests/${otherRequest.id}/fulfill`, 'POST', undefined, 200, otherHospitalToken)
  await api(`/api/requests/${otherRequest.id}`, 'PUT', { unitsRequired: 4 }, 403, hospitalToken)
})

test('donor accepts only as itself; public matches and donor records omit contact information', async () => {
  const matched = (await api(`/api/requests/${ownedRequest.id}/matches`)).data
  assert.ok(matched.matches.some((profile) => profile.id === donor.donorId))
  for (const profile of matched.matches) {
    assert.equal(Object.hasOwn(profile, 'email'), false)
    assert.equal(Object.hasOwn(profile, 'phone'), false)
    assert.equal(Object.hasOwn(profile, 'userId'), false)
  }
  for (const profile of (await api('/api/donors')).data) {
    assert.equal(Object.hasOwn(profile, 'email'), false)
    assert.equal(Object.hasOwn(profile, 'phone'), false)
  }
  await api(`/api/requests/${ownedRequest.id}/accept`, 'POST', { donorId: otherDonor.donorId }, 403, donorToken)
  const accepted = (await api(`/api/requests/${ownedRequest.id}/accept`, 'POST', { donorId: donor.donorId }, 200, donorToken)).data
  assert.equal(accepted.request.status, 'MATCHING')
  await api(`/api/requests/${ownedRequest.id}/accept`, 'POST', { donorId: donor.donorId }, 200, donorToken)
  assert.equal((await api(`/api/requests/${ownedRequest.id}`)).data.acceptedDonorIds.length, 1)
})

test('owning hospital fulfills and cancels requests while role/state guards remain enforced', async () => {
  const fulfilled = (await api(`/api/requests/${ownedRequest.id}/fulfill`, 'POST', undefined, 200, hospitalToken)).data
  assert.equal(fulfilled.status, 'FULFILLED')
  assert.ok(fulfilled.fulfilledAt)
  await api(`/api/requests/${ownedRequest.id}/cancel`, 'POST', undefined, 409, hospitalToken)
  const fresh = (await api('/api/requests', 'POST', requestBody(), 201, hospitalToken)).data
  assert.equal((await api(`/api/requests/${fresh.id}/cancel`, 'POST', undefined, 200, hospitalToken)).data.status, 'CANCELLED')
})

test('seeded admin logs in and ordinary users cannot perform administrative operations', async () => {
  const admin = (await api('/api/auth/login', 'POST', { email: environment.ADMIN_EMAIL, password })).data
  adminToken = admin.token
  assert.equal(admin.user.role, 'ADMIN')
  const body = { name: 'Managed Hospital', email: 'managed.hospital@example.com', location: 'Hyderabad' }
  await api('/api/hospitals', 'POST', body, 403, hospitalToken)
  await api('/api/hospitals', 'POST', body, 403, donorToken)
  const created = (await api('/api/hospitals', 'POST', body, 201, adminToken)).data
  await api(`/api/hospitals/${created.id}`, 'PUT', { verified: true }, 403, hospitalToken)
  await api(`/api/hospitals/${created.id}`, 'PUT', { verified: true }, 200, adminToken)
  const profile = { name: 'Managed Donor', email: 'managed.donor@example.com', bloodGroup: 'B-', location: 'Hyderabad' }
  await api('/api/donors', 'POST', profile, 403, donorToken)
  await api('/api/donors', 'POST', profile, 201, adminToken)
  await api(`/api/requests/${ownedRequest.id}`, 'DELETE', undefined, 403, donorToken)
  await api(`/api/requests/${ownedRequest.id}`, 'DELETE', undefined, 403, hospitalToken)
  const disposable = (await api('/api/requests', 'POST', requestBody(), 201, hospitalToken)).data
  await api(`/api/requests/${disposable.id}`, 'DELETE', undefined, 200, adminToken)
})

test('bcrypt hashes are persisted and passwords/hashes/secrets are absent from responses and logs', async () => {
  const users = await readUsers()
  assert.ok(users.length > 0)
  for (const user of users) {
    assert.equal(/^\$2[aby]\$12\$/.test(user.password), true, 'Persisted passwords must be bcrypt cost-12 hashes')
    assert.equal(user.password === password, false, 'Plain-text passwords must not be stored')
    assert.equal(await bcrypt.compare(password, user.password), true, 'Bcrypt verification should succeed')
  }
  assert.equal(logs.includes(password), false)
  assert.equal(logs.includes(secret), false)
  assert.equal(/\$2[aby]\$12\$/.test(logs), false)
  assert.ok((await readFile(path.join(backend, '.gitignore'), 'utf8')).split(/\r?\n/).includes('.env'))
})

test('seeded profile emails cannot be claimed by registration; failed linking rolls back the new user', async () => {
  const count = (await readUsers()).length
  await api('/api/auth/register', 'POST', registration('DONOR', 'arjun.demo@bloodboard.example'), 409)
  assert.equal((await readUsers()).length, count)
  await api('/api/auth/register', 'POST', registration('HOSPITAL', 'demo.citycare@bloodboard.example'), 409)
  assert.equal((await readUsers()).length, count)
})

test('demo reseeding preserves authenticated accounts, profile links, and user-created requests', async () => {
  const count = (await readUsers()).length
  const result = spawnSync(process.execPath, ['src/seed.js'], { cwd: backend, env: { ...environment, DATA_DIR: directory }, encoding: 'utf8' })
  assert.equal(result.status, 0)
  assert.equal((await readUsers()).length, count)
  assert.equal((await api(`/api/donors/${donor.donorId}`)).data.id, donor.donorId)
  assert.equal((await api(`/api/hospitals/${hospital.hospitalId}`)).data.id, hospital.hospitalId)
  assert.equal((await api(`/api/requests/${ownedRequest.id}`)).data.status, 'FULFILLED')
})

test('users, linked profiles, JWTs, and requests remain valid after backend restart', async () => {
  await stop()
  await start()
  assert.equal((await api('/api/auth/me', 'GET', undefined, 200, donorToken)).data.user.id, donor.id)
  assert.equal((await api('/api/auth/me', 'GET', undefined, 200, adminToken)).data.user.role, 'ADMIN')
  assert.equal((await api('/api/auth/login', 'POST', { email: donor.email, password })).data.user.donorId, donor.donorId)
  assert.equal((await api(`/api/requests/${ownedRequest.id}`)).data.status, 'FULFILLED')
})

test('admin script cannot promote an existing donor account', async () => {
  const result = spawnSync(process.execPath, ['src/seedAdmin.js'], { cwd: backend, env: { ...environment, DATA_DIR: directory, ADMIN_EMAIL: donor.email }, encoding: 'utf8' })
  assert.equal(result.status, 1)
  assert.equal((await api('/api/auth/me', 'GET', undefined, 200, donorToken)).data.user.role, 'DONOR')
  assert.equal(result.stdout.includes(password) || result.stderr.includes(password), false)
})
