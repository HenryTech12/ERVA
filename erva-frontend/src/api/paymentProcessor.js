import { apiClient } from './client'

export const paymentProcessorApi = {
  // Recent transactions filtered to stripe channel (uses existing endpoint)
  getTransactions: (limit = 100) =>
    apiClient.get(`/transactions/recent?limit=${limit}`).then((r) => r.data),

  // Single transaction detail via alert-scoped lookup
  getTransactionsByAlert: (alertId) =>
    apiClient.get(`/transactions?alertId=${alertId}`).then((r) => r.data),

  // Webhook activity from audit log — stripe_webhook_enqueued + str_filed actions
  getWebhookEvents: (limit = 200) =>
    apiClient.get(`/audit?limit=${limit}&action=stripe_webhook_enqueued`).then((r) => r.data),

  // STR filings that went through Stripe
  getFiledSTRs: () =>
    apiClient.get('/str/list?limit=500').then((r) => r.data),
}
