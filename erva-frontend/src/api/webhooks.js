import { apiClient } from './client'

export const webhooksApi = {
  simulate: (payload = {}) =>
    apiClient.post('/webhooks/stripe/simulate', payload).then((r) => r.data),
  chainStep: (payload) =>
    apiClient.post('/webhooks/stripe/chain-step', payload).then((r) => r.data),
}
