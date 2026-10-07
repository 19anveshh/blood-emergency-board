import { request } from './client'

export const requestApi = {
  list: () => request('/requests'),
  get: (id) => request(`/requests/${id}`),
  matches: (id) => request(`/requests/${id}/matches`),
  create: (fields) => request('/requests', { method: 'POST', body: fields }),
  accept: (id, donorId) => request(`/requests/${id}/accept`, { method: 'POST', body: { donorId } }),
  fulfill: (id) => request(`/requests/${id}/fulfill`, { method: 'POST' }),
}
