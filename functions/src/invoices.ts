/**
 * invoices.ts
 * Server-authoritative invoice creation with:
 *  - Firestore transaction for atomic invoice numbering (no duplicates)
 *  - Idempotency via operationKey (clientId + "create_invoice")
 *  - Activity logging inside the same transaction
 *  - Firestore trigger to keep dashboardSnapshot in sync
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { z } from "zod";
import * as puppeteer from "puppeteer";
import * as handlebars from "handlebars";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const createInvoiceSchema = z.object({
  idempotencyKey: z.string().min(1), // client-generated UUID per form submission
  customerId: z.string(),
  customerName: z.string(),
  items: z.array(
    z.object({
      productId: z.string(),
      name: z.string(),
      qty: z.number(),
      rate: z.number(),
      gstRate: z.number(),
      amount: z.number(),
    })
  ),
  totalAmount: z.number(),
  status: z.enum(["draft", "sent", "unpaid", "partial", "paid"]),
  dueDate: z.string(),
  notes: z.string().optional(),
});

// ---------------------------------------------------------------------------
// createInvoice  (idempotent)
// ---------------------------------------------------------------------------
export const createInvoice = onCall(async (request) => {
  const { data, auth } = request;
  if (!auth) throw new HttpsError("unauthenticated", "User must be authenticated");
  const merchantId = auth.uid;

  let parsed: z.infer<typeof createInvoiceSchema>;
  try {
    parsed = createInvoiceSchema.parse(data);
  } catch (e) {
    if (e instanceof z.ZodError)
      throw new HttpsError("invalid-argument", "Invalid payload", (e as any).errors);
    throw e;
  }

  const { idempotencyKey } = parsed;

  // Idempotency document: stores the invoiceId created for this key
  const idempotencyRef = db.doc(
    `merchants/${merchantId}/operationKeys/${idempotencyKey}`
  );
  const counterRef = db.doc(`merchants/${merchantId}/counters/invoiceCounter`);
  const invoiceRef  = db.collection(`merchants/${merchantId}/invoices`).doc();

  try {
    const result = await db.runTransaction(async (t) => {
      // ── Idempotency check ──────────────────────────────────────────────────
      const idempSnap = await t.get(idempotencyRef);
      if (idempSnap.exists) {
        // Already processed → return stored result without side-effects
        return { invoiceId: idempSnap.data()!.invoiceId, alreadyCreated: true };
      }

      // ── Atomic invoice numbering ───────────────────────────────────────────
      const counterSnap = await t.get(counterRef);
      const currentCount = counterSnap.exists ? (counterSnap.data()?.count ?? 0) : 0;
      const newCount = currentCount + 1;
      const invoiceNumber = `INV-${String(newCount).padStart(4, "0")}`;

      // ── Write invoice ──────────────────────────────────────────────────────
      const newInvoice = {
        ...parsed,
        id: invoiceRef.id,
        merchantId,
        invoiceNumber,
        paidAmount: 0,
        balanceDue: parsed.totalAmount,
        dueDate: admin.firestore.Timestamp.fromDate(new Date(parsed.dueDate)),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      t.set(invoiceRef, newInvoice);

      // ── Update counter ─────────────────────────────────────────────────────
      t.set(counterRef, { count: newCount }, { merge: true });

      // ── Record idempotency key ─────────────────────────────────────────────
      t.set(idempotencyRef, {
        invoiceId: invoiceRef.id,
        operation: "create_invoice",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // ── Activity log ───────────────────────────────────────────────────────
      const activityRef = db.collection(`merchants/${merchantId}/activities`).doc();
      t.set(activityRef, {
        merchantId,
        type: "invoice_created",
        description: `Created invoice #${invoiceNumber} for ${parsed.customerName}`,
        metadata: {
          invoiceId: invoiceRef.id,
          invoiceNumber,
          customerId: parsed.customerId,
          customerName: parsed.customerName,
          amount: parsed.totalAmount,
        },
        userId: merchantId,
        userName: auth.token?.name ?? "System",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { invoiceId: invoiceRef.id, alreadyCreated: false };
    });

    return result;
  } catch (error) {
    if (error instanceof z.ZodError)
      throw new HttpsError("invalid-argument", "Invalid payload", (error as any).errors);
    if (error instanceof HttpsError) throw error;
    console.error("createInvoice transaction failed:", error);
    throw new HttpsError("internal", "Failed to create invoice");
  }
});

// ---------------------------------------------------------------------------
// Firestore trigger → keep dashboardSnapshot current
// ---------------------------------------------------------------------------
export const onInvoiceWrite = onDocumentWritten(
  "merchants/{merchantId}/invoices/{invoiceId}",
  async (event) => {
    const merchantId = event.params.merchantId;

    const before = event.data?.before.exists ? event.data.before.data() : null;
    const after  = event.data?.after.exists  ? event.data.after.data()  : null;

    const customerId = after?.customerId ?? before?.customerId;
    if (!customerId) return;

    const amountDiff = (after?.totalAmount ?? 0) - (before?.totalAmount ?? 0);
    const paidDiff   = (after?.paidAmount   ?? 0) - (before?.paidAmount   ?? 0);
    if (amountDiff === 0 && paidDiff === 0) return;

    const statsRef    = db.doc(`merchants/${merchantId}/dashboardSnapshot/current`);
    const customerRef = db.doc(`merchants/${merchantId}/customers/${customerId}`);

    const batch = db.batch();

    batch.set(
      statsRef,
      {
        totalInvoiced:    admin.firestore.FieldValue.increment(amountDiff),
        totalCollected:   admin.firestore.FieldValue.increment(paidDiff),
        totalOutstanding: admin.firestore.FieldValue.increment(amountDiff - paidDiff),
        lastUpdatedAt:    admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    batch.set(
      customerRef,
      {
        outstandingAmount: admin.firestore.FieldValue.increment(amountDiff - paidDiff),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await batch.commit();
  }
);

// ---------------------------------------------------------------------------
// PDF generation
// ---------------------------------------------------------------------------
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
    .totals table th { background: transparent; text-align: right; border-bottom: none; }
    .totals table td { text-align: right; font-weight: bold; }
    .total-row { font-size: 1.2em; color: #4F46E5; border-top: 2px solid #eee; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>INVOICE</h1>
      <p><b>#{{invoiceNumber}}</b></p>
    </div>
    <div style="text-align:right;">
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
        <th style="text-align:center;">Qty</th>
        <th style="text-align:right;">Rate</th>
        <th style="text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{name}}<br><small style="color:#666">GST: {{gstRate}}%</small></td>
        <td style="text-align:center;">{{qty}}</td>
        <td style="text-align:right;">₹{{rate}}</td>
        <td style="text-align:right;">₹{{amount}}</td>
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

export const generateInvoicePdf = onCall({ memory: "1GiB" }, async (request) => {
  const { data, auth } = request;
  if (!auth) throw new HttpsError("unauthenticated", "User must be authenticated");
  const merchantId = auth.uid;
  const invoiceId  = data.invoiceId;

  try {
    const invoiceRef  = db.doc(`merchants/${merchantId}/invoices/${invoiceId}`);
    const invoiceSnap = await invoiceRef.get();
    if (!invoiceSnap.exists) throw new Error("Invoice not found");
    const invoiceData = invoiceSnap.data()!;

    const template = handlebars.compile(INVOICE_HTML_TEMPLATE);
    const fmt = (ts: any) =>
      ts ? (ts.toDate ? ts.toDate().toLocaleDateString() : new Date(ts).toLocaleDateString()) : new Date().toLocaleDateString();

    const html = template({
      ...invoiceData,
      createdAt: fmt(invoiceData.createdAt),
      dueDate:   fmt(invoiceData.dueDate),
    });

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    const bucket      = admin.storage().bucket();
    const storagePath = `merchants/${merchantId}/invoices/${invoiceId}/invoice_${invoiceData.invoiceNumber}.pdf`;
    await bucket.file(storagePath).save(pdfBuffer, { metadata: { contentType: "application/pdf" } });
    await invoiceRef.update({
      pdfStoragePath: storagePath,
      pdfGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, storagePath };
  } catch (error) {
    console.error("PDF Generation Error:", error);
    throw new HttpsError("internal", "Failed to generate PDF");
  }
});

export const getInvoicePdfUrl = onCall(async (request) => {
  const { data, auth } = request;
  if (!auth) throw new HttpsError("unauthenticated", "User must be authenticated");
  const merchantId = auth.uid;
  const invoiceId  = data.invoiceId;

  try {
    const invoiceSnap = await db.doc(`merchants/${merchantId}/invoices/${invoiceId}`).get();
    const invoiceData = invoiceSnap.data();
    if (!invoiceData?.pdfStoragePath)
      throw new HttpsError("failed-precondition", "PDF has not been generated yet");

    const [url] = await admin.storage().bucket().file(invoiceData.pdfStoragePath).getSignedUrl({
      version: "v4",
      action:  "read",
      expires: Date.now() + 2 * 60 * 60 * 1000,
    });

    return { url };
  } catch (error) {
    console.error("Signed URL Error:", error);
    throw new HttpsError("internal", "Failed to generate secure URL");
  }
});