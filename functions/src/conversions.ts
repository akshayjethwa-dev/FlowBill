import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { z } from "zod";

const db = admin.firestore();

const convertSchema = z.object({
  sourceId: z.string()
});

export const convertEstimateToInvoice = onCall(async (request) => {
  const { data, auth } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'User must be authenticated');
  const merchantId = auth.uid;

  try {
    const { sourceId } = convertSchema.parse(data);
    
    // Define all refs for the transaction
    const estimateRef = db.doc(`merchants/${merchantId}/estimates/${sourceId}`);
    const counterRef = db.doc(`merchants/${merchantId}/counters/invoiceCounter`);
    const invoiceRef = db.collection(`merchants/${merchantId}/invoices`).doc();
    const activityRef = db.collection(`merchants/${merchantId}/activityLogs`).doc();

    const result = await db.runTransaction(async (t) => {
      // 1. Read Estimate
      const estimateSnap = await t.get(estimateRef);
      if (!estimateSnap.exists) {
        throw new HttpsError('not-found', 'Estimate not found');
      }
      const estimate = estimateSnap.data()!;

      // 2. IDEMPOTENCY CHECK
      if (estimate.status === 'accepted' && estimate.invoiceId) {
        return { invoiceId: estimate.invoiceId, message: 'Already converted' };
      }

      // 3. Read & Increment Counter
      const counterSnap = await t.get(counterRef);
      const currentCount = counterSnap.exists ? (counterSnap.data()?.count || 0) : 0;
      const newCount = currentCount + 1;
      const invoiceNumber = `INV-${String(newCount).padStart(4, '0')}`;

      // 4. Prepare New Invoice Payload
      const invoiceData = {
        merchantId,
        customerId: estimate.customerId,
        customerName: estimate.customerName,
        invoiceNumber,
        estimateId: sourceId,
        items: estimate.items,
        totalAmount: estimate.totalAmount,
        paidAmount: 0,
        status: 'draft',
        dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isArchived: false,
      };

      // 5. Execute Writes Atomically
      t.set(counterRef, { count: newCount }, { merge: true });
      t.set(invoiceRef, invoiceData);

      t.update(estimateRef, {
        status: 'accepted',
        invoiceId: invoiceRef.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      t.set(activityRef, {
        merchantId,
        type: "estimate_converted",
        description: `Converted Estimate #${estimate.estimateNumber || sourceId} to Invoice #${invoiceNumber}`,
        metadata: {
          estimateId: sourceId,
          invoiceId: invoiceRef.id,
          invoiceNumber: invoiceNumber
        },
        userId: merchantId,
        userName: auth.token?.name || "System",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isArchived: false
      });

      return { invoiceId: invoiceRef.id };
    });

    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new HttpsError('invalid-argument', 'Invalid payload data', (error as any).errors);
    }
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Conversion transaction failed');
  }
});

export const convertOrderToEstimate = onCall(async (request) => {
  const { data, auth } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'User must be authenticated');
  const merchantId = auth.uid;

  try {
    const { sourceId } = convertSchema.parse(data);
    
    const orderRef = db.doc(`merchants/${merchantId}/orders/${sourceId}`);
    const counterRef = db.doc(`merchants/${merchantId}/counters/estimateCounter`);
    const estimateRef = db.collection(`merchants/${merchantId}/estimates`).doc();
    const activityRef = db.collection(`merchants/${merchantId}/activityLogs`).doc();

    const result = await db.runTransaction(async (t) => {
      const orderSnap = await t.get(orderRef);
      if (!orderSnap.exists) throw new HttpsError('not-found', 'Order not found');
      
      const order = orderSnap.data()!;

      if (order.estimateId) {
        return { estimateId: order.estimateId, message: 'Already converted' };
      }

      const counterSnap = await t.get(counterRef);
      const currentCount = counterSnap.exists ? (counterSnap.data()?.count || 0) : 0;
      const newCount = currentCount + 1;
      const estimateNumber = `EST-${String(newCount).padStart(4, '0')}`;

      const estimateData = {
        merchantId,
        customerId: order.customerId,
        customerName: order.customerName,
        estimateNumber,
        orderId: sourceId,
        items: order.items,
        totalAmount: order.totalAmount,
        status: 'draft',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isArchived: false,
      };

      t.set(counterRef, { count: newCount }, { merge: true });
      t.set(estimateRef, estimateData);

      t.update(orderRef, {
        status: 'confirmed',
        estimateId: estimateRef.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      t.set(activityRef, {
        merchantId,
        type: "order_updated",
        description: `Converted Order #${order.orderNumber || sourceId} to Estimate #${estimateNumber}`,
        metadata: { orderId: sourceId, estimateId: estimateRef.id },
        userId: merchantId,
        userName: auth.token?.name || "System",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isArchived: false
      });

      return { estimateId: estimateRef.id };
    });

    return result;
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Order conversion failed');
  }
});