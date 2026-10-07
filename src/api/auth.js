import { request } from './client'

export const authApi = {
  register: (fields) => request('/auth/register', { method: 'POST', body: fields, token: null }),
  login: ({ email, password }) => request('/auth/login', { method: 'POST', body: { email, password }, token: null }),
  me: (token, signal) => request('/auth/me', { token, signal }),
}
