/**
 * ═══════════════════════════════════════════════════════════════════
 * FlowBill — Firestore Schema & Ownership Reference
 * ═══════════════════════════════════════════════════════════════════
 *
 * OWNERSHIP RULE:
 *   Every business document lives under /merchants/{merchantId}/...
 *   merchantId is ALWAYS written at document creation from the
 *   authenticated user's auth context — never from client input.
 *
 * IMMUTABILITY RULES:
 *   - id, merchantId, createdAt — never overwritten after first write
 *   - Document numbers (invoiceNumber, orderNumber, etc.) — immutable
 *
 * QUERY RULE:
 *   All collection queries MUST include a where('merchantId', '==', merchantId)
 *   clause OR use the sub-collection path which scopes automatically.
 *   Use FSPath helpers from src/lib/models/paths.ts for all paths.
 *
 * ───────────────────────────────────────────────────────────────────
 * COLLECTION SCHEMAS
 * ───────────────────────────────────────────────────────────────────
 *
 * merchants/{merchantId}
 *   Required : id, businessName, ownerName, ownerUid, phone, category,
 *              subscriptionStatus, createdAt, onboarding{}
 *   Optional : email, gstin, upiId, address
 *   Immutable: id, ownerUid, createdAt
 *
 * merchants/{merchantId}/customers/{customerId}
 *   Required : id, merchantId, name, phone, creditDays,
 *              outstandingAmount, status, createdAt
 *   Optional : email, businessName, gstin, address, whatsapp*
 *   Computed : outstandingAmount (Cloud Function trigger)
 *   Immutable: id, merchantId, createdAt
 *
 * merchants/{merchantId}/products/{productId}
 *   Required : id, merchantId, name, unit, price, gstRate, isActive
 *   Optional : sku, description, hsnCode
 *   Immutable: id, merchantId, createdAt
 *
 * merchants/{merchantId}/orders/{orderId}
 *   Required : id, merchantId, orderNumber, customerId, customerName,
 *              items[], totalAmount, status
 *   Optional : notes, orderDate, deliveryDate, convertedInvoiceId
 *   Computed : totalAmount (sum of items)
 *   Immutable: id, merchantId, createdAt, orderNumber
 *
 * merchants/{merchantId}/estimates/{estimateId}
 *   Required : id, merchantId, estimateNumber, customerId, customerName,
 *              items[], totalAmount, status, validUntil
 *   Optional : orderId, notes, convertedInvoiceId
 *   Computed : totalAmount
 *   Immutable: id, merchantId, createdAt, estimateNumber
 *
 * merchants/{merchantId}/invoices/{invoiceId}
 *   Required : id, merchantId, invoiceNumber, customerId, customerName,
 *              items[], totalAmount, paidAmount, balanceAmount, status, dueDate
 *   Optional : orderId, estimateId, notes, pdfStoragePath, pdfGeneratedAt
 *   Computed : paidAmount, balanceAmount (updated by paymentService)
 *   Immutable: id, merchantId, createdAt, invoiceNumber
 *
 * merchants/{merchantId}/payments/{paymentId}
 *   Required : id, merchantId, customerId, customerName, amount,
 *              method, status, paymentDate
 *   Optional : invoiceId, invoiceNumber, referenceNumber, notes
 *   Immutable: id, merchantId, createdAt
 *
 * merchants/{merchantId}/reminders/{reminderId}
 *   Required : id, merchantId, customerId, customerName, type,
 *              status, scheduledAt, message
 *   Optional : invoiceId, invoiceNumber, sentAt, failureReason
 *   Immutable: id, merchantId, createdAt
 *
 * merchants/{merchantId}/reminders/{reminderId}/history/{histId}
 *   Required : id, merchantId, reminderId, customerId, type, channel, status
 *   Optional : sentAt, failureReason
 *   Immutable: id, merchantId, createdAt (append-only)
 *
 * merchants/{merchantId}/activities/{activityId}
 *   Required : id, merchantId, type, description, userId, userName
 *   Optional : metadata
 *   Immutable: ALL fields (append-only log — never update or delete)
 *
 * merchants/{merchantId}/whatsappMessages/{messageId}
 *   Required : id, merchantId, customerId, customerPhone, templateKey,
 *              provider, sendStatus, deliveryStatus, retryCount, channel
 *   Optional : customerName, invoiceId, invoiceNumber, reminderId,
 *              providerMessageId, lastError*, variables, *At timestamps
 *   Computed : isPermanentFailure, deliveryStatus (webhook callbacks)
 *   Immutable: id, merchantId, createdAt
 *
 * merchants/{merchantId}/dashboardSnapshots/{snapshotId}
 *   Required : id, merchantId, date, all numeric stats
 *   Computed : ALL fields (written by scheduled Cloud Function only)
 *   Immutable: ALL fields (snapshots are never edited after creation)
 *
 * merchants/{merchantId}/subscriptions/{subscriptionId}
 *   Required : id, merchantId, currentPlanId, status, nextBillingDate
 *   Optional : usageLimits[], billingHistory[]
 *   Computed : status (updated by webhook / Cloud Function)
 *   Immutable: id, merchantId, createdAt
 * ───────────────────────────────────────────────────────────────────
 */

// This file is documentation only — no runtime exports.
export {};