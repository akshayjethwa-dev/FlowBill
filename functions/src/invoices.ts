import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { z } from "zod";

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Input Validation Schema
const createInvoiceSchema = z.object({
  customerId: z.string(),
  customerName: z.string(),
  items: z.array(z.object({
    productId: z.string(),
    name: z.string(),
    qty: z.number(),
    rate: z.number(),
    gstRate: z.number(),
    amount: z.number()
  })),
  totalAmount: z.number(),
  status: z.enum(['draft', 'sent', 'unpaid', 'partial', 'paid']),
  dueDate: z.string(), // Send as ISO string from client
  notes: z.string().optional()
});

export const createInvoice = onCall(async (request) => {
  // In v2, data and auth are properties of the request object
  const { data, auth } = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const merchantId = auth.uid;
  
  try {
    const invoiceData = createInvoiceSchema.parse(data);
    const counterRef = db.collection(`merchants/${merchantId}/counters`).doc('invoiceCounter');
    const invoiceRef = db.collection(`merchants/${merchantId}/invoices`).doc();
    
    const invoiceId = invoiceRef.id;

    await db.runTransaction(async (transaction) => {
      // 1. Read Counter
      const counterSnap = await transaction.get(counterRef);
      let currentCount = 0;
      if (counterSnap.exists) {
        currentCount = counterSnap.data()?.count || 0;
      }
      
      // 2. Increment Counter
      const newCount = currentCount + 1;
      transaction.set(counterRef, { count: newCount }, { merge: true });
      
      // 3. Format Invoice Number (e.g. INV-0001)
      const invoiceNumber = `INV-${String(newCount).padStart(4, '0')}`;
      
      // 4. Save Invoice
      const newInvoice = {
        ...invoiceData,
        id: invoiceRef.id,
        merchantId,
        invoiceNumber,
        paidAmount: 0,
        dueDate: admin.firestore.Timestamp.fromDate(new Date(invoiceData.dueDate)),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      transaction.set(invoiceRef, newInvoice);

      // 5. Log Activity via backend
      const activityRef = db.collection(`merchants/${merchantId}/activities`).doc();
      transaction.set(activityRef, {
        merchantId,
        type: "invoice_created",
        description: `Created invoice #${invoiceNumber} for ${invoiceData.customerName}`,
        metadata: {
          invoiceId: invoiceRef.id,
          invoiceNumber: invoiceNumber,
          customerId: invoiceData.customerId,
          customerName: invoiceData.customerName,
          amount: invoiceData.totalAmount
        },
        userId: merchantId,
        userName: auth.token?.name || "System",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    
    return { invoiceId };
  } catch (error) {
    console.error("Error creating invoice:", error);
    if (error instanceof z.ZodError) {
      // ✅ FIXED: Using 'any' bypasses the strict TypeScript generic error. 
      // This is perfectly safe here because 'instanceof' proves it's a ZodError at runtime!
      const validationErrors = (error as any).errors; 
      throw new HttpsError('invalid-argument', 'Invalid payload data provided', validationErrors);
    }
    
    throw new HttpsError('internal', 'Failed to create invoice via transaction');
  }
});