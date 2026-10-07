export const TOKEN_KEY = 'bloodEmergencyToken'
const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(message, status = 0, details = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export const readToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

export const saveToken = (token) => {
  try { localStorage.setItem(TOKEN_KEY, token) } catch {
    throw new ApiError('Browser storage is unavailable. Enable local storage to sign in.')
  }
}

export const removeToken = () => {
  try { localStorage.removeItem(TOKEN_KEY) } catch { /* Auth state still clears if browser storage is blocked. */ }
}

const cleanMessage = (value) => {
  if (typeof value !== 'string' || !value.trim() || value.length > 500 || /stack trace|node_modules|file:\/\/|\bat\s+.*:\d+|(?:Type|Syntax|Reference)Error:/i.test(value)) return null
  return value.trim()
}

export async function request(path, { method = 'GET', body, token = readToken(), signal } = {}) {
  let response
  try {
    response = await fetch(`${baseUrl}/${path.replace(/^\/+/, '')}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError('Cannot reach the server. Check that the backend is running and try again.')
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.success !== true) {
    const fallback = response.status >= 500
      ? 'The service is temporarily unavailable. Please try again.'
      : 'The request could not be completed. Please try again.'
    const message = response.status < 500 ? cleanMessage(payload?.message) || fallback : fallback
    const details = response.status < 500 && Array.isArray(payload?.details)
      ? payload.details.map(cleanMessage).filter(Boolean).slice(0, 10)
      : []
    throw new ApiError(message, response.status, details)
  }
  return payload.data
}
