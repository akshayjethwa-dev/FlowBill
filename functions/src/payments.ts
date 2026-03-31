import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export const recordManualPayment = onCall(async (request) => {
  const { auth, data } = request;

  // Check authentication
  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be logged in to record payments.");
  }

  const {
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
    status = 'completed'
  } = data;

  if (!merchantId || !customerId || typeof amount !== 'number' || amount <= 0) {
    throw new HttpsError("invalid-argument", "Missing required fields or invalid amount.");
  }

  const db = admin.firestore();

  try {
    await db.runTransaction(async (transaction) => {
      // 1. If linked to an invoice, validate balance and calculate new state
      if (invoiceId) {
        const invoiceRef = db.collection(`merchants/${merchantId}/invoices`).doc(invoiceId);
        const invoiceSnap = await transaction.get(invoiceRef);

        if (!invoiceSnap.exists) {
          throw new HttpsError("not-found", "Invoice not found.");
        }

        const invoiceData = invoiceSnap.data();
        const totalAmount = invoiceData?.totalAmount || 0;
        const paidAmount = invoiceData?.paidAmount || 0;
        const balanceDue = totalAmount - paidAmount;

        // Reject if amount is greater than remaining balance
        if (amount > balanceDue) {
          throw new HttpsError(
            "failed-precondition", 
            `Payment amount (₹${amount}) exceeds the remaining invoice balance (₹${balanceDue}).`
          );
        }

        const newPaidAmount = paidAmount + amount;
        let newStatus = invoiceData?.status || "unpaid";
        if (newPaidAmount > 0 && newPaidAmount < totalAmount) {
          newStatus = "partial";
        }
        if (newPaidAmount >= totalAmount) {
          newStatus = "paid";
        }

        transaction.update(invoiceRef, {
          paidAmount: newPaidAmount,
          status: newStatus,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      // 2. Create the Payment Record
      const paymentRef = db.collection(`merchants/${merchantId}/payments`).doc();
      transaction.set(paymentRef, {
        merchantId,
        customerId,
        customerName,
        ...(invoiceId && { invoiceId }),
        ...(invoiceNumber && { invoiceNumber }),
        amount,
        method,
        referenceNumber: referenceNumber || null,
        notes: notes || null,
        paymentDate: paymentDate ? new Date(paymentDate) : admin.firestore.FieldValue.serverTimestamp(),
        status,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 3. Update the Customer's outstanding balance
      const customerRef = db.collection(`merchants/${merchantId}/customers`).doc(customerId);
      transaction.update(customerRef, {
        outstandingAmount: admin.firestore.FieldValue.increment(-amount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 4. Log the activity for the audit trail
      const activityRef = db.collection(`merchants/${merchantId}/activities`).doc();
      transaction.set(activityRef, {
        merchantId,
        type: "payment_marked",
        description: `Recorded payment of ₹${amount.toLocaleString('en-IN')} from ${customerName}`,
        metadata: {
          paymentId: paymentRef.id,
          customerId,
          customerName,
          ...(invoiceId && { invoiceId, invoiceNumber }),
          amount,
          method
        },
        userId: auth.uid,
        userName: auth.token.name || "Unknown User",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    return { success: true, message: "Payment recorded successfully" };
  } catch (error: any) {
    console.error("Transaction failure:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message || "An error occurred while recording the payment.");
  }
});