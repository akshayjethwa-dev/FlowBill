import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { z } from "zod";
import * as puppeteer from "puppeteer";
import * as handlebars from "handlebars";

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

// ============================================================================
// STEP 6: DENORMALIZED STATS TRIGGER
// ============================================================================
export const onInvoiceWrite = onDocumentWritten("merchants/{merchantId}/invoices/{invoiceId}", async (event) => {
  const merchantId = event.params.merchantId;
  
  // Get data before and after the change (handles create, update, and delete)
  const before = event.data?.before.exists ? event.data?.before.data() : null;
  const after = event.data?.after.exists ? event.data?.after.data() : null;

  // We need the customer ID to update their specific outstanding balance
  const customerId = after?.customerId || before?.customerId;
  if (!customerId) return;

  // Calculate the difference in amounts
  const amountDiff = (after?.totalAmount || 0) - (before?.totalAmount || 0);
  const paidDiff = (after?.paidAmount || 0) - (before?.paidAmount || 0);

  // If no financial change happened (e.g., just updating notes), exit early to save writes
  if (amountDiff === 0 && paidDiff === 0) return;

  const statsRef = db.doc(`merchants/${merchantId}/stats/dashboard`);
  const customerRef = db.doc(`merchants/${merchantId}/customers/${customerId}`);

  const batch = db.batch();

  // 1. Update Global Dashboard Stats
  batch.set(statsRef, {
    totalInvoiced: admin.firestore.FieldValue.increment(amountDiff),
    totalCollected: admin.firestore.FieldValue.increment(paidDiff),
    totalOutstanding: admin.firestore.FieldValue.increment(amountDiff - paidDiff),
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  // 2. Update Customer's Specific Outstanding Balance
  batch.set(customerRef, {
    outstandingAmount: admin.firestore.FieldValue.increment(amountDiff - paidDiff),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  await batch.commit();
});

// ============================================================================
// PDF GENERATION & DELIVERY
// ============================================================================

const INVOICE_HTML_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.5; padding: 40px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #4F46E5; margin: 0; }
    .details { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .details h3 { margin-bottom: 5px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #f9fafb; text-align: left; padding: 12px; font-size: 12px; color: #6b7280; text-transform: uppercase; border-bottom: 2px solid #eee; }
    td { padding: 12px; border-bottom: 1px solid #eee; }
    .totals { width: 50%; float: right; }
    .totals table th { background: transparent; text-align: right; border-bottom: none;}
    .totals table td { text-align: right; font-weight: bold;}
    .total-row { font-size: 1.2em; color: #4F46E5; border-top: 2px solid #eee; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>INVOICE</h1>
      <p><b>#{{invoiceNumber}}</b></p>
    </div>
    <div style="text-align: right;">
      <p><b>Issue Date:</b> {{createdAt}}</p>
      <p><b>Due Date:</b> {{dueDate}}</p>
    </div>
  </div>

  <div class="details">
    <div>
      <h3>Bill To:</h3>
      <p><b>{{customerName}}</b></p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item / Description</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Rate</th>
        <th style="text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{name}}<br><small style="color:#666">GST: {{gstRate}}%</small></td>
        <td style="text-align: center;">{{qty}}</td>
        <td style="text-align: right;">₹{{rate}}</td>
        <td style="text-align: right;">₹{{amount}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr>
        <th>Total Amount Due:</th>
        <td class="total-row">₹{{totalAmount}}</td>
      </tr>
    </table>
  </div>
</body>
</html>
`;

// 1. Generate PDF (Requires 1GB RAM for Puppeteer)
export const generateInvoicePdf = onCall({ memory: "1GiB" }, async (request) => {
  const { data, auth } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'User must be authenticated');
  
  const merchantId = auth.uid;
  const invoiceId = data.invoiceId;

  try {
    const invoiceRef = db.doc(`merchants/${merchantId}/invoices/${invoiceId}`);
    const invoiceSnap = await invoiceRef.get();
    
    if (!invoiceSnap.exists) throw new Error('Invoice not found');
    const invoiceData = invoiceSnap.data()!;

    // Compile HTML
    const template = handlebars.compile(INVOICE_HTML_TEMPLATE);
    
    // Safely format dates depending on whether they are Timestamps or strings
    const formatTimestamp = (ts: any) => {
      if (!ts) return new Date().toLocaleDateString();
      return ts.toDate ? ts.toDate().toLocaleDateString() : new Date(ts).toLocaleDateString();
    };

    const html = template({
      ...invoiceData,
      createdAt: formatTimestamp(invoiceData.createdAt),
      dueDate: formatTimestamp(invoiceData.dueDate),
    });

    // Launch headless browser to print PDF
    const browser = await puppeteer.launch({ 
      headless: true, 
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    // Upload to Firebase Storage
    const bucket = admin.storage().bucket();
    const storagePath = `merchants/${merchantId}/invoices/${invoiceId}/invoice_${invoiceData.invoiceNumber}.pdf`;
    const file = bucket.file(storagePath);
    
    await file.save(pdfBuffer, {
      metadata: { contentType: 'application/pdf' }
    });

    // Update Invoice record with PDF metadata
    await invoiceRef.update({
      pdfStoragePath: storagePath,
      pdfGeneratedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, storagePath };
  } catch (error) {
    console.error("PDF Generation Error:", error);
    throw new HttpsError('internal', 'Failed to generate PDF');
  }
});

// 2. Securely fetch signed download URL (valid for 2 hours)
export const getInvoicePdfUrl = onCall(async (request) => {
  const { data, auth } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'User must be authenticated');
  
  const merchantId = auth.uid;
  const invoiceId = data.invoiceId;

  try {
    const invoiceSnap = await db.doc(`merchants/${merchantId}/invoices/${invoiceId}`).get();
    const invoiceData = invoiceSnap.data();

    if (!invoiceData?.pdfStoragePath) {
      throw new HttpsError('failed-precondition', 'PDF has not been generated yet');
    }

    const bucket = admin.storage().bucket();
    const file = bucket.file(invoiceData.pdfStoragePath);

    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 2 * 60 * 60 * 1000, // 2 hours
    });

    return { url };
  } catch (error) {
    console.error("Signed URL Error:", error);
    throw new HttpsError('internal', 'Failed to generate secure URL');
  }
});