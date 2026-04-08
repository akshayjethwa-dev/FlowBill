/**
 * Centralized Firestore path helpers.
 * ALL collection reads/writes must use these — never hardcode paths.
 *
 * Canonical path: /merchants/{merchantId}/{collection}/{docId}
 */

export const FSPath = {
  // ── Top-level ──────────────────────────────────────────────────────────────
  merchant: (merchantId: string) =>
    `merchants/${merchantId}`,

  // ── Sub-collections ────────────────────────────────────────────────────────
  customers: (merchantId: string) =>
    `merchants/${merchantId}/customers`,

  customer: (merchantId: string, customerId: string) =>
    `merchants/${merchantId}/customers/${customerId}`,

  products: (merchantId: string) =>
    `merchants/${merchantId}/products`,

  product: (merchantId: string, productId: string) =>
    `merchants/${merchantId}/products/${productId}`,

  orders: (merchantId: string) =>
    `merchants/${merchantId}/orders`,

  order: (merchantId: string, orderId: string) =>
    `merchants/${merchantId}/orders/${orderId}`,

  estimates: (merchantId: string) =>
    `merchants/${merchantId}/estimates`,

  estimate: (merchantId: string, estimateId: string) =>
    `merchants/${merchantId}/estimates/${estimateId}`,

  invoices: (merchantId: string) =>
    `merchants/${merchantId}/invoices`,

  invoice: (merchantId: string, invoiceId: string) =>
    `merchants/${merchantId}/invoices/${invoiceId}`,

  payments: (merchantId: string) =>
    `merchants/${merchantId}/payments`,

  payment: (merchantId: string, paymentId: string) =>
    `merchants/${merchantId}/payments/${paymentId}`,

  reminders: (merchantId: string) =>
    `merchants/${merchantId}/reminders`,

  reminder: (merchantId: string, reminderId: string) =>
    `merchants/${merchantId}/reminders/${reminderId}`,

  reminderHistory: (merchantId: string, reminderId: string) =>
    `merchants/${merchantId}/reminders/${reminderId}/history`,

  activities: (merchantId: string) =>
    `merchants/${merchantId}/activities`,

  activity: (merchantId: string, activityId: string) =>
    `merchants/${merchantId}/activities/${activityId}`,

  whatsappMessages: (merchantId: string) =>
    `merchants/${merchantId}/whatsappMessages`,

  whatsappMessage: (merchantId: string, messageId: string) =>
    `merchants/${merchantId}/whatsappMessages/${messageId}`,

  dashboardSnapshots: (merchantId: string) =>
    `merchants/${merchantId}/dashboardSnapshots`,

  dashboardSnapshot: (merchantId: string, snapshotId: string) =>
    `merchants/${merchantId}/dashboardSnapshots/${snapshotId}`,

  subscriptions: (merchantId: string) =>
    `merchants/${merchantId}/subscriptions`,

  subscription: (merchantId: string, subscriptionId: string) =>
    `merchants/${merchantId}/subscriptions/${subscriptionId}`,
} as const;