import { randomBytes } from 'node:crypto'
import { AppError } from '../middleware/errors.js'
import { jsonStore } from './jsonStore.js'

export const assertId = (id, label = 'Record id') => {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(id)) {
    throw new AppError(`${label} must be a valid record id`, 400, 'INVALID_ID')
  }
}

export const createRepository = (collection, { defaults = {}, validate, serialize = (record) => record }) => {
  const check = (record, records) => {
    validate(record)
    if (record.email && records.some((existing) => existing.id !== record.id && existing.email?.toLowerCase() === record.email.toLowerCase())) {
      throw new AppError('A record with that email already exists', 409, 'DUPLICATE_EMAIL')
    }
  }

  return {
    async findAll(filters = {}) {
      const records = await jsonStore.read(collection)
      return records.filter((record) => Object.entries(filters).every(([key, value]) => record[key] === value))
        .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
        .map(serialize)
    },

    async findById(id) {
      assertId(id)
      const record = (await jsonStore.read(collection)).find((item) => item.id === id)
      return record ? serialize(record) : null
    },

    create(attributes) {
      return jsonStore.mutate(collection, (records) => {
        const now = new Date().toISOString()
        const record = { ...structuredClone(defaults), ...attributes, id: randomBytes(12).toString('hex'), createdAt: now, updatedAt: now }
        check(record, records)
        records.push(record)
        return serialize(record)
      })
    },

    updateById(id, change) {
      assertId(id)
      return jsonStore.mutate(collection, async (records) => {
        const index = records.findIndex((record) => record.id === id)
        if (index === -1) return null
        const current = structuredClone(records[index])
        const updates = typeof change === 'function' ? await change(current) : change
        const record = { ...current, ...updates, id: current.id, createdAt: current.createdAt, updatedAt: new Date().toISOString() }
        check(record, records)
        records[index] = record
        return serialize(record)
      })
    },

    deleteById(id) {
      assertId(id)
      return jsonStore.mutate(collection, (records) => {
        const index = records.findIndex((record) => record.id === id)
        return index === -1 ? null : serialize(records.splice(index, 1)[0])
      })
    },

    async replaceAll(records) {
      for (const record of records) check(record, records)
      await jsonStore.replace(collection, records)
    },
  }
}
