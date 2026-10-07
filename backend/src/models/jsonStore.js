import { randomBytes } from 'node:crypto'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { AppError } from '../middleware/errors.js'

const defaultDirectory = fileURLToPath(new URL('../../data/', import.meta.url))
const collections = ['donors', 'hospitals', 'bloodRequests', 'users']

// One store instance per process. DATA_DIR only overrides the location for isolated tests.
export const createJsonStore = (directory = defaultDirectory) => {
  const pendingWrites = new Map()
  let ready = false

  const filename = (collection) => {
    if (!collections.includes(collection)) throw new AppError('Unknown data collection', 500, 'STORAGE_ERROR')
    return path.join(directory, `${collection}.json`)
  }

  const read = async (collection) => {
    try {
      const records = JSON.parse(await readFile(filename(collection), 'utf8'))
      if (!Array.isArray(records) || records.some((record) => !record || typeof record.id !== 'string')) {
        throw new Error('Invalid collection format')
      }
      return records
    } catch {
      // Never overwrite unreadable/corrupt data and never include file contents in errors.
      throw new AppError(`Unable to read ${collection} demo data`, 503, 'STORAGE_ERROR')
    }
  }

  const write = async (collection, records) => {
    const target = filename(collection)
    const temporary = `${target}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`
    try {
      await writeFile(temporary, `${JSON.stringify(records, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
      await rename(temporary, target)
    } catch {
      throw new AppError(`Unable to save ${collection} demo data`, 503, 'STORAGE_ERROR')
    } finally {
      await unlink(temporary).catch(() => {})
    }
  }

  const queued = (collection, operation) => {
    const previous = pendingWrites.get(collection) ?? Promise.resolve()
    const result = previous.then(operation)
    // A failed write must not block all subsequent operations.
    pendingWrites.set(collection, result.catch(() => {}))
    return result
  }

  return {
    async initialize() {
      try {
        await mkdir(directory, { recursive: true })
        for (const collection of collections) {
          try {
            await writeFile(filename(collection), '[]\n', { flag: 'wx', mode: 0o600 })
          } catch (error) {
            if (error.code !== 'EEXIST') throw error
          }
          await read(collection)
        }
        ready = true
      } catch {
        throw new AppError('Unable to initialize local JSON storage. Check data files and permissions.', 503, 'STORAGE_ERROR')
      }
    },

    async read(collection) {
      await (pendingWrites.get(collection) ?? Promise.resolve())
      return read(collection)
    },

    mutate(collection, change) {
      return queued(collection, async () => {
        const records = await read(collection)
        const result = await change(records)
        await write(collection, records)
        return structuredClone(result)
      })
    },

    replace(collection, records) {
      return queued(collection, () => write(collection, records))
    },

    status() {
      return { state: ready ? 'connected' : 'disconnected', name: 'blood_emergency_board', host: 'local', type: 'json-file' }
    },
  }
}

export const jsonStore = createJsonStore(process.env.DATA_DIR || defaultDirectory)
