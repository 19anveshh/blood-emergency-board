import '../src/config/env.js'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

// Initialize deployment JSON files from the private prototype snapshot.
// Existing runtime data is never overwritten during an ordinary process restart.
try {
  if (!process.env.DATA_DIR) throw new Error('Deployment data directory is required')
  const directory = path.resolve(process.env.DATA_DIR)
  const initialDirectory = process.env.INITIAL_DATA_DIR || '/etc/secrets'
  const pending = []
  const validate = (contents) => {
    const records = JSON.parse(contents)
    if (!Array.isArray(records) || records.some((record) => !record || typeof record.id !== 'string')) {
      throw new Error('Invalid collection')
    }
  }

  await mkdir(directory, { recursive: true })
  for (const collection of ['donors', 'hospitals', 'bloodRequests', 'users']) {
    const target = path.join(directory, `${collection}.json`)
    let contents
    try {
      contents = await readFile(target, 'utf8')
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      contents = await readFile(path.join(initialDirectory, `${collection}.json`), 'utf8')
      pending.push({ target, contents })
    }
    validate(contents)
  }

  for (const { target, contents } of pending) {
    await writeFile(target, contents, { flag: 'wx', mode: 0o600 })
  }
  if (pending.length) console.log('Existing prototype JSON data imported to demo storage.')
  await import('../server.js')
} catch {
  console.error('Unable to start production API. Check demo storage and private initialization files.')
  process.exitCode = 1
}
