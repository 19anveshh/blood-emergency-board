import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { chromium } from 'playwright'
import { env } from '../backend/src/config/env.js'

const backendRequire = createRequire(new URL('../backend/package.json', import.meta.url))
const bcrypt = backendRequire('bcryptjs')
const jwt = backendRequire('jsonwebtoken')
const ui = process.env.TEST_FRONTEND_URL || 'http://localhost:5173'
const api = process.env.TEST_API_URL || 'http://localhost:5000/api'
const key = 'bloodEmergencyToken'
const suffix = `${Date.now()}-${randomBytes(3).toString('hex')}`
const password = `Demo-${randomBytes(16).toString('hex')}Aa7!`
const donor = { name: 'Aditi Sharma', email: `aditi.auth-${suffix}@example.com`, phone: '9876512310', location: 'Hyderabad' }
const hospital = { name: 'Riverbank Emergency Center', email: `riverbank.auth-${suffix}@example.com`, phone: '9876512311', location: 'Hyderabad' }
let browser
let page
let currentStep = 'Browser startup'
let donorRecord
let donorToken
const pageErrors = []
const apiPaths = []

const check = async (label, work) => {
  currentStep = label
  await work()
  console.log(`PASS: ${label}`)
}

const responseFor = (path, status = 200) => page.waitForResponse((response) => response.url() === `${api}${path}` && response.status() === status && response.request().method() !== 'OPTIONS')
const tokenSaved = () => page.evaluate((storageKey) => localStorage.getItem(storageKey), key)

const fillRegister = async (account, role = 'DONOR', suppliedPassword = password) => {
  await page.goto(`${ui}/register`)
  if (role === 'HOSPITAL') await page.getByRole('button', { name: 'I represent a hospital' }).click()
  for (const field of ['name', 'email', 'phone', 'location']) await page.locator(`input[name="${field}"]`).fill(account[field])
  if (role === 'DONOR') await page.locator('select[name="bloodGroup"]').selectOption({ label: 'O−' })
  await page.locator('input[name="password"]').fill(suppliedPassword)
  await page.locator('.terms-check input').check()
}

const doLogin = async (account, selectedRole = 'Hospital') => {
  await page.goto(`${ui}/login`)
  await page.getByRole('button', { name: selectedRole, exact: true }).click()
  await page.locator('input[name="email"]').fill(account.email)
  await page.locator('input[name="password"]').fill(account.password || password)
  const pending = responseFor('/auth/login')
  await page.getByRole('button', { name: 'Sign in to workspace' }).click()
  return pending
}

try {
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ ignoreHTTPSErrors: true })
  page = await context.newPage()
  page.on('pageerror', () => pageErrors.push('Uncaught browser error'))
  page.on('console', (message) => {
    if (message.type() === 'error' && !/Failed to load resource|net::ERR_/.test(message.text())) pageErrors.push('Unexpected browser console error')
  })
  page.on('request', (request) => { if (request.url().startsWith(api)) apiPaths.push(new URL(request.url()).pathname) })

  await check('TEST 1 — registration page opens', async () => {
    await page.goto(`${ui}/register`)
    await page.getByRole('heading', { name: 'Join the response.' }).waitFor()
  })
  await check('TEST 2 — real DONOR registration succeeds', async () => {
    await fillRegister(donor)
    const pending = responseFor('/auth/register', 201)
    await page.getByRole('button', { name: 'Create my account' }).click()
    const response = await pending
    const data = await response.json()
    assert.equal(data.data.user.role, 'DONOR')
    assert.equal(data.data.user.bloodGroup, 'O-')
    assert.equal(Object.hasOwn(data.data.user, 'password'), false)
    await page.waitForURL(`${ui}/login`)
    await page.getByRole('status').filter({ hasText: 'Account created successfully' }).waitFor()
    assert.equal(await tokenSaved(), null, 'Registration must not pretend to log in')
  })
  await check('TEST 3 — users.json contains the browser-created account', async () => {
    const records = JSON.parse(await readFile(new URL('../backend/data/users.json', import.meta.url), 'utf8'))
    donorRecord = records.find((record) => record.email === donor.email)
    assert.equal(Boolean(donorRecord?.donorId), true)
  })
  await check('TEST 4 — password is bcrypt-hashed and plaintext is not stored', async () => {
    assert.equal(/^\$2[aby]\$12\$/.test(donorRecord.password), true)
    assert.equal(donorRecord.password === password, false)
    assert.equal(await bcrypt.compare(password, donorRecord.password), true)
  })
  let donorLogin
  await check('TEST 5 — donor logs in through the existing form', async () => {
    // Deliberately select Hospital: the backend role must still send this user to Donor.
    donorLogin = await (await doLogin(donor, 'Hospital')).json()
    await page.waitForURL(`${ui}/donor`)
    await page.waitForFunction((name) => document.querySelector('.header-profile strong')?.textContent === name, donor.name)
  })
  await check('TEST 6 — backend returns a DONOR JWT', async () => {
    donorToken = donorLogin.data.token
    assert.equal(typeof donorToken === 'string' && donorToken.split('.').length === 3, true)
    const payload = JSON.parse(Buffer.from(donorToken.split('.')[1], 'base64url').toString())
    assert.equal(payload.role, 'DONOR')
    assert.equal(payload.userId, donorRecord.id)
  })
  await check('TEST 7 — frontend stores JWT only, not passwords', async () => {
    assert.equal((await tokenSaved()) === donorToken, true)
    assert.equal(await page.evaluate((value) => Object.values(localStorage).some((entry) => entry.includes(value)), password), false)
    assert.deepEqual(await page.evaluate(() => Object.keys(localStorage)), [key])
  })
  let restored
  await check('TEST 8 — browser refresh succeeds', async () => {
    const pending = responseFor('/auth/me')
    await page.reload()
    restored = await pending
    await page.waitForURL(`${ui}/donor`)
  })
  await check('TEST 9 — /auth/me restores user with the Bearer token', async () => {
    assert.equal(restored.request().headers().authorization === `Bearer ${donorToken}`, true)
    assert.equal((await restored.json()).data.user.id, donorRecord.id)
    await page.waitForFunction((name) => document.querySelector('.header-profile strong')?.textContent === name, donor.name)
  })
  await check('TEST 10 — existing Sign out action logs out', async () => {
    await page.getByRole('link', { name: 'Sign out' }).click()
    await page.waitForURL(`${ui}/login`)
  })
  await check('TEST 11 — logout removes saved JWT', async () => assert.equal(await tokenSaved(), null))
  await check('TEST 12 — logged-out user attempts protected donor dashboard', async () => { await page.goto(`${ui}/donor`) })
  await check('TEST 13 — protected route redirects to login', async () => {
    await page.waitForURL(`${ui}/login`)
    await page.getByRole('heading', { name: 'Good to see you again.' }).waitFor()
  })
  let hospitalLogin
  await check('TEST 14 — real HOSPITAL registration and login succeed', async () => {
    await fillRegister(hospital, 'HOSPITAL')
    const pending = responseFor('/auth/register', 201)
    await page.getByRole('button', { name: 'Create my account' }).click()
    const registration = await pending
    assert.equal((await registration.json()).data.user.role, 'HOSPITAL')
    assert.equal(Object.hasOwn(registration.request().postDataJSON(), 'bloodGroup'), false)
    await page.waitForURL(`${ui}/login`)
    const login = await doLogin(hospital, 'Donor')
    hospitalLogin = await login.json()
    assert.deepEqual(Object.keys(login.request().postDataJSON()).sort(), ['email', 'password'])
    await page.waitForURL(`${ui}/hospital`)
  })
  await check('TEST 15 — routing uses backend HOSPITAL role despite Donor selection', async () => {
    assert.equal(hospitalLogin.data.user.role, 'HOSPITAL')
    assert.equal(new URL(page.url()).pathname, '/hospital')
    await page.waitForFunction((name) => document.querySelector('.header-profile strong')?.textContent === name, hospital.name)
    await page.goto(`${ui}/donor`)
    await page.waitForURL(`${ui}/hospital`)
    await page.goto(`${ui}/admin`)
    await page.waitForURL(`${ui}/hospital`)
    await page.getByRole('link', { name: 'Sign out' }).click()
    await page.waitForURL(`${ui}/login`)
  })
  await check('TEST 16 — existing private ADMIN credentials route to admin dashboard', async () => {
    assert.equal(Boolean(env.adminEmail && env.adminPassword), true, 'Private admin setup must be configured')
    const response = await doLogin({ email: env.adminEmail, password: env.adminPassword }, 'Donor')
    assert.equal((await response.json()).data.user.role, 'ADMIN')
    await page.waitForURL(`${ui}/admin`)
    await page.getByRole('link', { name: 'Sign out' }).click()
    await page.waitForURL(`${ui}/login`)
  })

  await check('Duplicate registration shows backend error and does not authenticate', async () => {
    await fillRegister(donor)
    const pending = responseFor('/auth/register', 409)
    await page.getByRole('button', { name: 'Create my account' }).click()
    await pending
    await page.getByRole('alert').filter({ hasText: 'Email is already registered' }).waitFor()
    assert.equal(new URL(page.url()).pathname, '/register')
    assert.equal(await tokenSaved(), null)
  })
  await check('Backend password validation is shown without fake success', async () => {
    await fillRegister({ ...donor, email: `validation-${suffix}@example.com` }, 'DONOR', 'WeakPassword')
    const pending = responseFor('/auth/register', 400)
    await page.getByRole('button', { name: 'Create my account' }).click()
    await pending
    await page.getByRole('alert').filter({ hasText: 'uppercase, lowercase' }).waitFor()
    assert.equal(new URL(page.url()).pathname, '/register')
  })
  await check('Wrong password shows a clean login error and saves no token', async () => {
    await page.goto(`${ui}/login`)
    await page.locator('input[name="email"]').fill(donor.email)
    await page.locator('input[name="password"]').fill('WrongPassword123!')
    const pending = responseFor('/auth/login', 401)
    await page.getByRole('button', { name: 'Sign in to workspace' }).click()
    await pending
    await page.getByRole('alert').filter({ hasText: 'Invalid email or password' }).waitFor()
    assert.equal(await tokenSaved(), null)
  })
  await check('Expired saved JWT is removed on startup and redirects to login', async () => {
    const expired = jwt.sign({ userId: donorRecord.id, role: 'DONOR' }, env.jwtSecret, { algorithm: 'HS256', issuer: 'blood-emergency-board', audience: 'bloodboard-api', expiresIn: -1 })
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key, value: expired })
    const pending = responseFor('/auth/me', 401)
    await page.goto(`${ui}/donor`)
    await pending
    await page.waitForURL(`${ui}/login`)
    await page.getByRole('alert').filter({ hasText: 'session has expired' }).waitFor()
    assert.equal(await tokenSaved(), null)
  })
  await check('DONOR cannot open hospital/create-request/admin routes', async () => {
    await doLogin(donor, 'Hospital')
    await page.waitForURL(`${ui}/donor`)
    for (const path of ['/hospital', '/hospital/requests/new', '/admin']) {
      await page.goto(ui + path)
      await page.waitForURL(`${ui}/donor`)
    }
    await page.getByRole('link', { name: 'Sign out' }).click()
    await page.waitForURL(`${ui}/login`)
  })
  await check('Server traces are suppressed in login error UI', async () => {
    await page.route(`${api}/auth/login`, (route) => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'ReferenceError: private backend trace\n at file:///server.js:22:1' }) }))
    await page.locator('input[name="email"]').fill(donor.email)
    await page.locator('input[name="password"]').fill(password)
    await page.getByRole('button', { name: 'Sign in to workspace' }).click()
    await page.getByRole('alert').filter({ hasText: 'temporarily unavailable' }).waitFor()
    assert.equal((await page.getByRole('alert').innerText()).includes('private backend trace'), false)
    await page.unroute(`${api}/auth/login`)
  })
  await check('Network failure displays a clean retry message', async () => {
    await page.route(`${api}/auth/login`, (route) => route.abort('failed'))
    await page.getByRole('button', { name: 'Sign in to workspace' }).click()
    await page.getByRole('alert').filter({ hasText: 'Cannot reach the server' }).waitFor()
    assert.equal(await tokenSaved(), null)
    await page.unroute(`${api}/auth/login`)
  })
  await check('Only auth and core request-list endpoints are called', async () => {
    assert.equal(apiPaths.length > 0, true)
    assert.equal(apiPaths.every((path) => /^\/api\/auth\/(register|login|me)$/.test(path) || path === '/api/requests'), true)
    await page.goto(`${ui}/board`)
    await page.getByRole('heading', { name: 'Emergency blood board' }).waitFor()
    assert.equal(apiPaths.every((path) => /^\/api\/auth\/(register|login|me)$/.test(path) || path === '/api/requests'), true)
  })
  await check('No uncaught application or unexpected console errors', async () => assert.equal(pageErrors.length, 0))
  console.log('Authentication integration browser workflow passed. Test donor/hospital accounts remain persisted; no credentials or tokens were printed.')
} catch {
  console.error(`FAIL: ${currentStep}. Error details are omitted to protect credentials and tokens.`)
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
}
