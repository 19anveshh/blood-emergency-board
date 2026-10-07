import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { chromium } from 'playwright'

const frontend = process.env.TEST_FRONTEND_URL || 'http://localhost:5173'
const api = process.env.TEST_API_URL || 'http://localhost:5000/api'
const hospital = {
  name: 'CityCare Demo Hospital',
  email: 'hospital.demo@bloodboard.local',
  password: 'DemoHospital123!',
  phone: '9876500001',
  location: 'Demo District, Bengaluru',
}
const donor = {
  name: 'Arjun Demo Donor',
  email: 'donor.demo@bloodboard.local',
  password: 'DemoDonor123!',
  phone: '9876500002',
  location: 'Demo District, Bengaluru',
}
const suffix = randomBytes(3).toString('hex')
let browser
let page
let requestId
let step = 'Browser startup'
const pageErrors = []

const pass = async (label, action) => {
  step = label
  await action()
  console.log(`PASS: ${label}`)
}

const response = (path, status) => page.waitForResponse((item) => item.url() === `${api}${path}` && (!status || item.status() === status) && item.request().method() !== 'OPTIONS')

async function registerIfNeeded(account, role) {
  await page.goto(`${frontend}/register`)
  if (role === 'HOSPITAL') await page.getByRole('button', { name: 'I represent a hospital' }).click()
  for (const field of ['name', 'email', 'phone', 'location']) await page.locator(`input[name="${field}"]`).fill(account[field])
  if (role === 'DONOR') await page.locator('select[name="bloodGroup"]').selectOption({ label: 'O−' })
  await page.locator('input[name="password"]').fill(account.password)
  await page.locator('.terms-check input').check()
  const pending = response('/auth/register')
  await page.getByRole('button', { name: 'Create my account' }).click()
  const result = await pending
  if (result.status() === 201) await page.waitForURL(`${frontend}/login`)
  else {
    assert.equal(result.status(), 409)
    await page.goto(`${frontend}/login`)
  }
}

async function login(account, role) {
  await page.goto(`${frontend}/login`)
  await page.getByRole('button', { name: role, exact: true }).click()
  await page.locator('input[name="email"]').fill(account.email)
  await page.locator('input[name="password"]').fill(account.password)
  const pending = response('/auth/login', 200)
  await page.getByRole('button', { name: 'Sign in to workspace' }).click()
  const result = await pending
  const data = await result.json()
  return data.data.user
}

try {
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  page = await context.newPage()
  page.on('pageerror', () => pageErrors.push('browser page error'))
  page.on('console', (message) => { if (message.type() === 'error' && !/Failed to load resource|net::ERR_/.test(message.text())) pageErrors.push('browser console error') })

  await pass('Hospital login', async () => {
    await registerIfNeeded(hospital, 'HOSPITAL')
    const user = await login(hospital, 'Hospital')
    assert.equal(user.role, 'HOSPITAL')
    await page.waitForURL(`${frontend}/hospital`)
  })

  await pass('Create emergency', async () => {
    await page.getByRole('link', { name: 'Create emergency request' }).click()
    await page.waitForURL(`${frontend}/hospital/requests/new`)
    await page.locator('input[name="location"]').fill(`Demo District ${suffix}, Bengaluru`)
    await page.locator('input[name="requiredBefore"]').fill('2030-12-01T12:00')
    await page.locator('textarea[name="notes"]').fill(`Core demo emergency ${suffix}`)
    const pending = response('/requests', 201)
    await page.getByRole('button', { name: 'Create emergency request' }).click()
    const created = await pending
    requestId = (await created.json()).data.id
    await page.waitForURL(`${frontend}/hospital`)
    await page.getByText(requestId, { exact: false }).first().waitFor()
  })

  await pass('Emergency board', async () => {
    await page.goto(`${frontend}/board`)
    await page.locator('input[placeholder="Search by hospital or area"]').fill(`Demo District ${suffix}`)
    const card = page.locator('.emergency-card').first()
    await card.waitFor()
    await card.getByText('O−').waitFor()
    await card.getByText('CityCare Demo Hospital').waitFor()
    await card.getByText('Critical', { exact: true }).waitFor()
  })

  await pass('Donor login', async () => {
    await page.goto(`${frontend}/hospital`)
    await page.getByRole('link', { name: 'Sign out' }).click()
    await page.waitForURL(`${frontend}/login`)
    await registerIfNeeded(donor, 'DONOR')
    const user = await login(donor, 'Donor')
    assert.equal(user.role, 'DONOR')
    await page.waitForURL(`${frontend}/donor`)
  })

  await pass('Matching', async () => {
    await page.goto(`${frontend}/requests/${requestId}`)
    await page.getByRole('link', { name: 'View all matches' }).click()
    await page.waitForURL(`${frontend}/matching/${requestId}`)
    await page.getByText('Arjun Demo Donor').waitFor()
    await page.getByText(/%/).first().waitFor()
    await page.getByText('Available', { exact: true }).first().waitFor()
  })

  await pass('Accept request', async () => {
    const pending = response(`/requests/${requestId}/accept`, 200)
    await page.getByRole('button', { name: 'Accept request' }).click()
    await pending
    await page.getByText('Request Accepted', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'Request Accepted', exact: true }).waitFor()
  })

  await pass('Hospital fulfill', async () => {
    await page.getByRole('link', { name: 'Sign out' }).click()
    await page.waitForURL(`${frontend}/login`)
    await login(hospital, 'Hospital')
    await page.waitForURL(`${frontend}/hospital`)
    await page.goto(`${frontend}/requests/${requestId}`)
    await page.getByRole('heading', { name: `Request #${requestId}` }).waitFor()
    const pending = response(`/requests/${requestId}/fulfill`, 200)
    await page.getByRole('button', { name: 'Mark fulfilled' }).first().click()
    await pending
    await page.getByText('Blood Request Fulfilled', { exact: true }).first().waitFor()
    await page.getByText('Fulfilled', { exact: true }).first().waitFor()
  })

  await pass('Fulfilled status persists after refresh', async () => {
    await page.reload()
    await page.getByText('Fulfilled', { exact: true }).first().waitFor()
    await page.getByText('Blood Request Fulfilled', { exact: true }).first().waitFor()
  })

  await pass('No obvious browser errors', async () => assert.equal(pageErrors.length, 0))
  console.log('Core Blood Emergency Board workflow passed. Demo accounts are hospital.demo@bloodboard.local and donor.demo@bloodboard.local.')
} catch (error) {
  console.error(`FAIL: ${step}. ${error.message || 'Workflow details omitted.'} URL: ${page?.url() || 'unknown'}`)
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
}
