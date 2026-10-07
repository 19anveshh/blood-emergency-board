import { randomBytes } from 'node:crypto'
import { readFile, writeFile, chmod } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const filename = fileURLToPath(new URL('../.env', import.meta.url))

try {
  const existing = await readFile(filename, 'utf8').catch((error) => {
    if (error.code === 'ENOENT') return ''
    throw error
  })
  const values = dotenv.parse(existing)
  const generated = {
    JWT_SECRET: randomBytes(48).toString('base64url'),
    JWT_EXPIRES_IN: '1d',
    ADMIN_EMAIL: 'admin@bloodboard.example',
    ADMIN_PASSWORD: `Demo-${randomBytes(24).toString('hex')}X7!`,
  }
  const missing = Object.entries(generated).filter(([key]) => !values[key] || values[key].startsWith('replace_'))
  let contents = existing
  for (const [key, value] of missing) {
    const pattern = new RegExp(`^${key}=.*$`, 'm')
    if (pattern.test(contents)) contents = contents.replace(pattern, `${key}=${value}`)
    else contents += `${contents && !contents.endsWith('\n') ? '\n' : ''}${key}=${value}\n`
  }
  if (missing.length) await writeFile(filename, contents, { mode: 0o600 })
  await chmod(filename, 0o600)
  console.log('Private auth configuration is ready in backend/.env. Values have not been printed.')
} catch {
  console.error('Unable to prepare private auth configuration. Check .env permissions.')
  process.exitCode = 1
}
