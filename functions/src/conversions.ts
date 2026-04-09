/**
 * conversions.ts
 * All conversion functions are idempotent:
 *  - convertOrderToEstimate
 *  - convertOrderToInvoice   (NEW)
 *  - convertEstimateToInvoice
 *
 * Each checks the source document for an already-stored target ID before
 * proceeding, so retrying returns the same result without duplicate writes.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { z } from "zod";
import { refreshDashboardSnapshot } from "./dashboard";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const convertSchema = z.object({ sourceId: z.string().min(1) });

// ---------------------------------------------------------------------------
// Helper: atomically get the next counter value for a named counter
// ---------------------------------------------------------------------------
async function nextNumber(
  t: FirebaseFirestore.Transaction,
  merchantId: string,
  counterName: string,
  prefix: string
): Promise<{
  count: number;
  formatted: string;
  counterRef: FirebaseFirestore.DocumentReference;
}> {
  const counterRef  = db.doc(`merchants/${merchantId}/counters/${counterName}`);
  const counterSnap = await t.get(counterRef);
  const count       = (counterSnap.exists ? (counterSnap.data()?.count ?? 0) : 0) + 1;
  const formatted   = `${prefix}-${String(count).padStart(4, "0")}`;
  return { count, formatted, counterRef };
}

// ---------------------------------------------------------------------------
// convertOrderToEstimate  (idempotent)
// ---------------------------------------------------------------------------
export const convertOrderToEstimate = onCall(async (request) => {
  const { data, auth } = request;
  if (!auth) throw new HttpsError("unauthenticated", "User must be authenticated");
  const merchantId = auth.uid;

  try {
    const { sourceId } = convertSchema.parse(data);
    const orderRef    = db.doc(`merchants/${merchantId}/orders/${sourceId}`);
    const estimateRef = db.collection(`merchants/${merchantId}/estimates`).doc();
    const activityRef = db.collection(`merchants/${merchantId}/activityLogs`).doc();

    const result = await db.runTransaction(async (t) => {
      const orderSnap = await t.get(orderRef);
      if (!orderSnap.exists) throw new HttpsError("not-found", "Order not found");
      const order = orderSnap.data()!;

      // ── Idempotency check ──────────────────────────────────────────────────
      if (order.estimateId) {
        return { estimateId: order.estimateId, alreadyConverted: true };
      }
      if (order.status === "cancelled") {
        throw new HttpsError("failed-precondition", "Cannot convert a cancelled order.");
      }

      // ── Numbering ──────────────────────────────────────────────────────────
      const { count, formatted: estimateNumber, counterRef } =
        await nextNumber(t, merchantId, "estimateCounter", "EST");

      const estimateData = {
        merchantId,
        customerId:     order.customerId,
        customerName:   order.customerName,
        estimateNumber,
        orderId:        sourceId,
        items:          order.items,
        totalAmount:    order.totalAmount,
        status:         "draft",
        createdAt:      admin.firestore.FieldValue.serverTimestamp(),
        updatedAt:      admin.firestore.FieldValue.serverTimestamp(),
        isArchived:     false,
      };

      t.set(counterRef, { count }, { merge: true });
      t.set(estimateRef, estimateData);
      t.update(orderRef, {
        status:      "confirmed",
        estimateId:  estimateRef.id,
        updatedAt:   admin.firestore.FieldValue.serverTimestamp(),
      });
      t.set(activityRef, {
        merchantId,
        type:        "order_converted_to_estimate",
        description: `Converted Order #${order.orderNumber ?? sourceId} → Estimate #${estimateNumber}`,
        metadata:    { orderId: sourceId, estimateId: estimateRef.id, estimateNumber },
        userId:      merchantId,
        userName:    auth.token?.name ?? "System",
        createdAt:   admin.firestore.FieldValue.serverTimestamp(),
        isArchived:  false,
      });

      return { estimateId: estimateRef.id, alreadyConverted: false };
    });

    return result;
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    if (error instanceof z.ZodError)
      throw new HttpsError("invalid-argument", "Invalid payload", (error as any).errors);
    console.error("convertOrderToEstimate failed:", error);
    throw new HttpsError("internal", "Order conversion failed");
  }
});

// ---------------------------------------------------------------------------
// convertOrderToInvoice  (NEW – idempotent)
// ---------------------------------------------------------------------------
export const convertOrderToInvoice = onCall(async (request) => {
  const { data, auth } = request;
  if (!auth) throw new HttpsError("unauthenticated", "User must be authenticated");
  const merchantId = auth.uid;

  try {
    const { sourceId } = convertSchema.parse(data);
    const orderRef    = db.doc(`merchants/${merchantId}/orders/${sourceId}`);
    const invoiceRef  = db.collection(`merchants/${merchantId}/invoices`).doc();
    const activityRef = db.collection(`merchants/${merchantId}/activityLogs`).doc();

    const result = await db.runTransaction(async (t) => {
      const orderSnap = await t.get(orderRef);
      if (!orderSnap.exists) throw new HttpsError("not-found", "Order not found");
      const order = orderSnap.data()!;

      // ── Idempotency check ──────────────────────────────────────────────────
      if (order.invoiceId) {
        return { invoiceId: order.invoiceId, alreadyConverted: true };
      }
      if (order.status === "cancelled") {
        throw new HttpsError("failed-precondition", "Cannot convert a cancelled order.");
      }

      // ── Numbering ──────────────────────────────────────────────────────────
      const { count, formatted: invoiceNumber, counterRef } =
        await nextNumber(t, merchantId, "invoiceCounter", "INV");

      const invoiceData = {
        merchantId,
        customerId:   order.customerId,
        customerName: order.customerName,
        invoiceNumber,
        orderId:      sourceId,
        items:        order.items,
        totalAmount:  order.totalAmount,
        paidAmount:   0,
        balanceDue:   order.totalAmount,
        status:       "draft",
        dueDate:      admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        ),
        createdAt:    admin.firestore.FieldValue.serverTimestamp(),
        updatedAt:    admin.firestore.FieldValue.serverTimestamp(),
        isArchived:   false,
      };

      t.set(counterRef, { count }, { merge: true });
      t.set(invoiceRef, invoiceData);
      t.update(orderRef, {
        status:    "converted_to_invoice",
        invoiceId: invoiceRef.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      t.set(activityRef, {
        merchantId,
        type:        "order_converted_to_invoice",
        description: `Converted Order #${order.orderNumber ?? sourceId} → Invoice #${invoiceNumber}`,
        metadata:    { orderId: sourceId, invoiceId: invoiceRef.id, invoiceNumber },
        userId:      merchantId,
        userName:    auth.token?.name ?? "System",
        createdAt:   admin.firestore.FieldValue.serverTimestamp(),
        isArchived:  false,
      });

      return { invoiceId: invoiceRef.id, alreadyConverted: false };
    });

    // Best-effort snapshot refresh
    if (!result.alreadyConverted) {
      try { await refreshDashboardSnapshot(merchantId); } catch (_) { /* non-critical */ }
    }

    return result;
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    if (error instanceof z.ZodError)
      throw new HttpsError("invalid-argument", "Invalid payload", (error as any).errors);
    console.error("convertOrderToInvoice failed:", error);
    throw new HttpsError("internal", "Order-to-invoice conversion failed");
  }
});

// ---------------------------------------------------------------------------
// convertEstimateToInvoice  (idempotent)
// ---------------------------------------------------------------------------
export const convertEstimateToInvoice = onCall(async (request) => {
  const { data, auth } = request;
  if (!auth) throw new HttpsError("unauthenticated", "User must be authenticated");
  const merchantId = auth.uid;

  try {
    const { sourceId } = convertSchema.parse(data);
    const estimateRef = db.doc(`merchants/${merchantId}/estimates/${sourceId}`);
    const invoiceRef  = db.collection(`merchants/${merchantId}/invoices`).doc();
    const activityRef = db.collection(`merchants/${merchantId}/activityLogs`).doc();

    const result = await db.runTransaction(async (t) => {
      const estimateSnap = await t.get(estimateRef);
      if (!estimateSnap.exists) throw new HttpsError("not-found", "Estimate not found");
      const estimate = estimateSnap.data()!;

      // ── Idempotency check ──────────────────────────────────────────────────
      // If estimate already has an invoiceId, return it without re-creating
      if (estimate.invoiceId) {
        return { invoiceId: estimate.invoiceId, alreadyConverted: true };
      }
      if (estimate.status === "expired") {
        throw new HttpsError("failed-precondition", "Cannot convert an expired estimate.");
      }

      // ── Numbering ──────────────────────────────────────────────────────────
      const { count, formatted: invoiceNumber, counterRef } =
        await nextNumber(t, merchantId, "invoiceCounter", "INV");

      const invoiceData = {
        merchantId,
        customerId:   estimate.customerId,
        customerName: estimate.customerName,
        invoiceNumber,
        estimateId:   sourceId,
        items:        estimate.items,
        totalAmount:  estimate.totalAmount,
        paidAmount:   0,
        balanceDue:   estimate.totalAmount,
        status:       "draft",
        dueDate:      admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        ),
        createdAt:    admin.firestore.FieldValue.serverTimestamp(),
        updatedAt:    admin.firestore.FieldValue.serverTimestamp(),
        isArchived:   false,
      };

      t.set(counterRef, { count }, { merge: true });
      t.set(invoiceRef, invoiceData);
      t.update(estimateRef, {
        status:    "accepted",
        invoiceId: invoiceRef.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      t.set(activityRef, {
        merchantId,
        type:        "estimate_converted",
        description: `Converted Estimate #${estimate.estimateNumber ?? sourceId} → Invoice #${invoiceNumber}`,
        metadata:    { estimateId: sourceId, invoiceId: invoiceRef.id, invoiceNumber },
        userId:      merchantId,
        userName:    auth.token?.name ?? "System",
        createdAt:   admin.firestore.FieldValue.serverTimestamp(),
        isArchived:  false,
      });

      return { invoiceId: invoiceRef.id, alreadyConverted: false };
    });

    // Best-effort snapshot refresh
    if (!result.alreadyConverted) {
      try { await refreshDashboardSnapshot(merchantId); } catch (_) { /* non-critical */ }
    }

    return result;
  } catch (error) {
    if (error instanceof z.ZodError)
      throw new HttpsError("invalid-argument", "Invalid payload", (error as any).errors);
    if (error instanceof HttpsError) throw error;
    console.error("convertEstimateToInvoice failed:", error);
    throw new HttpsError("internal", "Conversion transaction failed");
  }
});