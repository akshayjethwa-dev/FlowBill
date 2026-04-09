/**
 * payments.ts
 * Idempotent recordManualPayment:
 *  - Accepts a client-generated idempotencyKey
 *  - On retry, returns the existing paymentId without re-applying side-effects
 *  - Uses a single Firestore transaction for invoice update + payment record + customer balance
 *  - Calls refreshDashboardSnapshot after commit
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { refreshDashboardSnapshot } from "./dashboard";

export const recordManualPayment = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be logged in to record payments.");
  }

  const {
    idempotencyKey,    // REQUIRED: client-generated UUID per payment attempt
    merchantId,
    customerId,
    customerName,
    invoiceId,
    invoiceNumber,
    amount,
    method,
    referenceNumber,
    notes,
    paymentDate,
    status = "completed",
  } = data;

  // ── Basic validation ────────────────────────────────────────────────────────
  if (!idempotencyKey || typeof idempotencyKey !== "string") {
    throw new HttpsError("invalid-argument", "idempotencyKey is required.");
  }
  if (!merchantId || !customerId || typeof amount !== "number" || amount <= 0) {
    throw new HttpsError("invalid-argument", "Missing required fields or invalid amount.");
  }

  const db = admin.firestore();

  // Idempotency doc lives under the merchant's operationKeys sub-collection
  const idempotencyRef = db.doc(
    `merchants/${merchantId}/operationKeys/${idempotencyKey}`
  );
  const paymentRef = db.collection(`merchants/${merchantId}/payments`).doc();

  try {
    const result = await db.runTransaction(async (transaction) => {
      // ── Idempotency check ───────────────────────────────────────────────────
      const idempSnap = await transaction.get(idempotencyRef);
      if (idempSnap.exists) {
        return {
          success: true,
          paymentId: idempSnap.data()!.paymentId,
          alreadyRecorded: true,
        };
      }

      // ── Invoice validation & update ─────────────────────────────────────────
      if (invoiceId) {
        const invoiceRef  = db.doc(`merchants/${merchantId}/invoices/${invoiceId}`);
        const invoiceSnap = await transaction.get(invoiceRef);

        if (!invoiceSnap.exists)
          throw new HttpsError("not-found", "Invoice not found.");

        const inv         = invoiceSnap.data()!;
        const totalAmount = inv.totalAmount ?? 0;
        const paidAmount  = inv.paidAmount  ?? 0;
        const balanceDue  = totalAmount - paidAmount;

        if (amount > balanceDue) {
          throw new HttpsError(
            "failed-precondition",
            `Payment ₹${amount} exceeds remaining balance ₹${balanceDue}.`
          );
        }

        const newPaid  = paidAmount + amount;
        let newStatus  = inv.status ?? "unpaid";
        if (newPaid > 0 && newPaid < totalAmount) newStatus = "partial";
        if (newPaid >= totalAmount)               newStatus = "paid";

        transaction.update(invoiceRef, {
          paidAmount: newPaid,
          balanceDue: totalAmount - newPaid,
          status:     newStatus,
          updatedAt:  admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // ── Payment record ──────────────────────────────────────────────────────
      transaction.set(paymentRef, {
        merchantId,
        customerId,
        customerName,
        ...(invoiceId     && { invoiceId }),
        ...(invoiceNumber && { invoiceNumber }),
        amount,
        method,
        referenceNumber: referenceNumber ?? null,
        notes:           notes           ?? null,
        paymentDate:     paymentDate
          ? new Date(paymentDate)
          : admin.firestore.FieldValue.serverTimestamp(),
        status,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // ── Customer outstanding balance ────────────────────────────────────────
      const customerRef = db.doc(`merchants/${merchantId}/customers/${customerId}`);
      transaction.update(customerRef, {
        outstandingAmount: admin.firestore.FieldValue.increment(-amount),
        updatedAt:         admin.firestore.FieldValue.serverTimestamp(),
      });

      // ── Activity log ────────────────────────────────────────────────────────
      const activityRef = db.collection(`merchants/${merchantId}/activities`).doc();
      transaction.set(activityRef, {
        merchantId,
        type:        "payment_marked",
        description: `Recorded payment of ₹${amount.toLocaleString("en-IN")} from ${customerName}`,
        metadata: {
          paymentId:    paymentRef.id,
          customerId,
          customerName,
          ...(invoiceId && { invoiceId, invoiceNumber }),
          amount,
          method,
        },
        userId:    auth.uid,
        userName:  auth.token?.name ?? "Unknown User",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // ── Store idempotency key ───────────────────────────────────────────────
      transaction.set(idempotencyRef, {
        paymentId:  paymentRef.id,
        operation:  "record_manual_payment",
        createdAt:  admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, paymentId: paymentRef.id, alreadyRecorded: false };
    });

    // Refresh dashboard snapshot outside the transaction (best-effort)
    try {
      await refreshDashboardSnapshot(merchantId);
    } catch (snapshotErr) {
      console.warn("Dashboard snapshot refresh failed (non-critical):", snapshotErr);
    }

    return result;
  } catch (error: any) {
    console.error("recordManualPayment transaction failed:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message ?? "An error occurred while recording the payment.");
  }
});