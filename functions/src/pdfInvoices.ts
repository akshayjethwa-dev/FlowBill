// functions/src/pdfInvoices.ts
// ─── PDF Invoice Generation ───────────────────────────────────────────────────
//
// Cloud Function: generateInvoicePdf (HTTPS Callable)
//
// Flow:
//   1. Caller sends { merchantId, invoiceId }
//   2. Function fetches invoice + merchant + customer from Firestore
//   3. Renders an A4 HTML invoice template with GST breakdown
//   4. Converts HTML → PDF via Puppeteer (headless Chrome)
//   5. Uploads PDF to Firebase Storage:
//        merchants/{merchantId}/invoices/{invoiceId}/invoice.pdf
//   6. Generates a short-lived signed URL (1 hour) for immediate download
//   7. Updates invoice doc with: pdfStoragePath, pdfGeneratedAt, pdfUrl
//   8. Returns { pdfUrl } to the caller
//
// Storage security:
//   - Files are NOT public. No public read rules.
//   - Access is via signed URLs (1-hour expiry) generated server-side.
//   - Only authenticated merchant staff can call this function.
//
// ─────────────────────────────────────────────────────────────────────────────

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as puppeteer from 'puppeteer';

if (!admin.apps.length) admin.initializeApp();

const db      = admin.firestore();
const storage = admin.storage();

// ─── Types (local — mirrors frontend Invoice / OrderItem) ─────────────────────

interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  rate: number;
  gstRate: number;
  amount: number;
  gstAmount?: number;
  totalAmount?: number;
}

interface InvoiceDoc {
  invoiceNumber: string;
  merchantId: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
  dueDate: admin.firestore.Timestamp;
  notes?: string;
  createdAt?: admin.firestore.Timestamp;
}

interface MerchantDoc {
  businessName?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  logoUrl?: string;
}

interface CustomerDoc {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  gstin?: string;
}

// ─── Callable Function ────────────────────────────────────────────────────────

export const generateInvoicePdf = onCall({
  region:         'asia-south1',
  timeoutSeconds: 120,
  memory:         '1GiB',        // Puppeteer needs at least 512MB
  enforceAppCheck: false,
}, async (request) => {
  // ── Auth guard: only authenticated users can call this ────────────────────
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be logged in to generate a PDF.');
  }

  const { merchantId, invoiceId } = request.data as {
    merchantId: string;
    invoiceId: string;
  };

  if (!merchantId || !invoiceId) {
    throw new HttpsError('invalid-argument', 'merchantId and invoiceId are required.');
  }

  // ── Ownership check: caller must be the merchant ──────────────────────────
  if (request.auth.uid !== merchantId) {
    throw new HttpsError('permission-denied', 'You can only generate PDFs for your own invoices.');
  }

  // ── Fetch Firestore documents ─────────────────────────────────────────────
  const [invoiceSnap, merchantSnap] = await Promise.all([
    db.doc(`merchants/${merchantId}/invoices/${invoiceId}`).get(),
    db.doc(`merchants/${merchantId}`).get(),
  ]);

  if (!invoiceSnap.exists) {
    throw new HttpsError('not-found', `Invoice ${invoiceId} not found.`);
  }
  if (!merchantSnap.exists) {
    throw new HttpsError('not-found', `Merchant ${merchantId} not found.`);
  }

  const invoice  = invoiceSnap.data()  as InvoiceDoc;
  const merchant = merchantSnap.data() as MerchantDoc;

  // Fetch customer doc (optional — graceful fallback if missing)
  let customer: CustomerDoc = { name: invoice.customerName };
  const customerSnap = await db
    .doc(`merchants/${merchantId}/customers/${invoice.customerId}`)
    .get();
  if (customerSnap.exists) {
    customer = customerSnap.data() as CustomerDoc;
  }

  // ── Build HTML ────────────────────────────────────────────────────────────
  const html = buildInvoiceHtml({ invoice, merchant, customer, invoiceId });

  // ── HTML → PDF via Puppeteer ──────────────────────────────────────────────
  let pdfBuffer: Buffer;
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfRaw = await page.pdf({
      format:             'A4',
      printBackground:    true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    await browser.close();
    pdfBuffer = Buffer.from(pdfRaw);
  } catch (err: any) {
    console.error('[PDF] Puppeteer error:', err?.message ?? err);
    throw new HttpsError('internal', `PDF generation failed: ${err?.message ?? 'unknown error'}`);
  }

  // ── Upload to Firebase Storage ─────────────────────────────────────────────
  // Path: merchants/{merchantId}/invoices/{invoiceId}/invoice.pdf
  const bucket    = storage.bucket();
  const storagePath = `merchants/${merchantId}/invoices/${invoiceId}/invoice.pdf`;
  const fileRef   = bucket.file(storagePath);

  await fileRef.save(pdfBuffer, {
    contentType: 'application/pdf',
    metadata: {
      cacheControl:        'private, max-age=3600',
      contentDisposition:  `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`,
    },
  });

  // ── Generate signed URL (1-hour expiry) ────────────────────────────────────
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  const [pdfUrl] = await fileRef.getSignedUrl({
    action:  'read',
    expires: expiresAt,
  });

  // ── Update invoice doc with PDF metadata ───────────────────────────────────
  await invoiceSnap.ref.update({
    pdfStoragePath: storagePath,
    pdfGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt:      admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`[PDF] Generated for invoice ${invoiceId} → ${storagePath}`);

  return { pdfUrl, storagePath };
});

// ─── Callable Function: Get Fresh Signed URL ─────────────────────────────────
// Called when the merchant wants to re-download an already-generated PDF.
// Generates a fresh 1-hour signed URL without regenerating the PDF.

export const getInvoicePdfUrl = onCall({
  region:         'asia-south1',
  timeoutSeconds: 30,
  memory:         '256MiB',
  enforceAppCheck: false,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be logged in.');
  }

  const { merchantId, invoiceId } = request.data as {
    merchantId: string;
    invoiceId: string;
  };

  if (request.auth.uid !== merchantId) {
    throw new HttpsError('permission-denied', 'Access denied.');
  }

  const invoiceSnap = await db
    .doc(`merchants/${merchantId}/invoices/${invoiceId}`)
    .get();

  if (!invoiceSnap.exists) {
    throw new HttpsError('not-found', 'Invoice not found.');
  }

  const invoice = invoiceSnap.data()!;

  if (!invoice.pdfStoragePath) {
    throw new HttpsError('not-found', 'PDF has not been generated yet for this invoice.');
  }

  const fileRef  = storage.bucket().file(invoice.pdfStoragePath);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  const [pdfUrl] = await fileRef.getSignedUrl({
    action:  'read',
    expires: expiresAt,
  });

  return { pdfUrl };
});

// ─── HTML Invoice Template ────────────────────────────────────────────────────

interface TemplateData {
  invoice:  InvoiceDoc;
  merchant: MerchantDoc;
  customer: CustomerDoc;
  invoiceId: string;
}

function buildInvoiceHtml({ invoice, merchant, customer, invoiceId }: TemplateData): string {
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);

  const formatDate = (ts: admin.firestore.Timestamp | string | undefined) => {
    if (!ts) return '—';
    const d = typeof ts === 'string' ? new Date(ts) : ts.toDate();
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Compute GST summary: group by rate
  const gstSummary: Record<number, { taxable: number; gst: number }> = {};
  let subTotal = 0;
  let totalGst = 0;

  const rows = invoice.items.map((item) => {
    const taxable  = item.qty * item.rate;
    const gstAmt   = item.gstAmount  ?? (taxable * item.gstRate / 100);
    const lineTotal = item.totalAmount ?? (taxable + gstAmt);
    subTotal += taxable;
    totalGst += gstAmt;

    if (!gstSummary[item.gstRate]) gstSummary[item.gstRate] = { taxable: 0, gst: 0 };
    gstSummary[item.gstRate].taxable += taxable;
    gstSummary[item.gstRate].gst    += gstAmt;

    return `
      <tr>
        <td>${item.name}</td>
        <td class="center">${item.qty}</td>
        <td class="right">${formatCurrency(item.rate)}</td>
        <td class="center">${item.gstRate}%</td>
        <td class="right">${formatCurrency(gstAmt)}</td>
        <td class="right bold">${formatCurrency(lineTotal)}</td>
      </tr>`;
  }).join('');

  const gstRows = Object.entries(gstSummary).map(([rate, vals]) => `
    <tr>
      <td>GST @ ${rate}%</td>
      <td class="right">${formatCurrency(vals.taxable)}</td>
      <td class="right">${formatCurrency(vals.gst)}</td>
    </tr>`).join('');

  const statusBadge = (() => {
    const colors: Record<string, string> = {
      paid: '#16a34a', unpaid: '#d97706', overdue: '#dc2626',
      partial: '#2563eb', sent: '#7c3aed', draft: '#6b7280',
    };
    const color = colors[invoice.status] ?? '#6b7280';
    return `<span style="background:${color};color:#fff;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em">${invoice.status}</span>`;
  })();

  const businessName = merchant.businessName ?? merchant.displayName ?? 'Your Business';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Invoice ${invoice.invoiceNumber}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 13px;
    color: #1a1a1a;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 12mm 14mm;
    position: relative;
  }

  /* ── Header ── */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 16px;
    border-bottom: 3px solid #4f46e5;
    margin-bottom: 20px;
  }
  .brand-name {
    font-size: 22px;
    font-weight: 800;
    color: #4f46e5;
    letter-spacing: -0.5px;
  }
  .brand-meta { font-size: 11px; color: #555; line-height: 1.6; margin-top: 4px; }

  .invoice-meta { text-align: right; }
  .invoice-label { font-size: 26px; font-weight: 900; color: #1e1b4b; letter-spacing: -1px; }
  .invoice-number { font-size: 13px; color: #555; margin-top: 4px; }
  .invoice-number span { font-weight: 700; color: #1a1a1a; }

  /* ── Parties ── */
  .parties {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 20px;
  }
  .party { flex: 1; }
  .party-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .08em;
    color: #4f46e5;
    margin-bottom: 6px;
  }
  .party-name { font-size: 15px; font-weight: 700; color: #111; }
  .party-detail { font-size: 11px; color: #555; line-height: 1.7; margin-top: 2px; }

  /* ── Dates strip ── */
  .dates-strip {
    background: #f5f5ff;
    border: 1px solid #e0e0ff;
    border-radius: 8px;
    display: flex;
    gap: 0;
    margin-bottom: 20px;
    overflow: hidden;
  }
  .date-cell {
    flex: 1;
    padding: 10px 14px;
    border-right: 1px solid #e0e0ff;
  }
  .date-cell:last-child { border-right: none; }
  .date-cell-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .08em;
    color: #7c3aed;
    margin-bottom: 3px;
  }
  .date-cell-value { font-size: 13px; font-weight: 700; color: #1a1a1a; }

  /* ── Items table ── */
  .items-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  .items-table thead tr {
    background: #4f46e5;
    color: #fff;
  }
  .items-table thead th {
    padding: 9px 10px;
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .05em;
  }
  .items-table thead th.center { text-align: center; }
  .items-table thead th.right  { text-align: right;  }

  .items-table tbody tr:nth-child(even) { background: #f8f8ff; }
  .items-table tbody td {
    padding: 9px 10px;
    font-size: 12px;
    color: #222;
    border-bottom: 1px solid #eee;
    vertical-align: middle;
  }
  .items-table tbody td.center { text-align: center; }
  .items-table tbody td.right  { text-align: right;  }
  .items-table tbody td.bold   { font-weight: 700;   }

  /* ── Totals + GST ── */
  .bottom-section {
    display: flex;
    gap: 24px;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  /* GST breakdown */
  .gst-table { flex: 1; }
  .gst-table-inner { width: 100%; border-collapse: collapse; }
  .gst-section-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .08em;
    color: #4f46e5;
    margin-bottom: 6px;
  }
  .gst-table-inner th {
    background: #f0f0ff;
    padding: 7px 9px;
    font-size: 11px;
    font-weight: 700;
    text-align: right;
    color: #333;
  }
  .gst-table-inner th:first-child { text-align: left; }
  .gst-table-inner td {
    padding: 7px 9px;
    font-size: 12px;
    text-align: right;
    border-bottom: 1px solid #eee;
  }
  .gst-table-inner td:first-child { text-align: left; }

  /* Totals */
  .totals { min-width: 220px; }
  .totals-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    border-bottom: 1px solid #eee;
    font-size: 12px;
  }
  .totals-row:last-child { border-bottom: none; }
  .totals-row.grand {
    padding: 10px 0 4px;
    font-size: 15px;
    font-weight: 800;
    color: #4f46e5;
    border-top: 2px solid #4f46e5;
    border-bottom: none;
  }
  .totals-row.paid-row { color: #16a34a; font-weight: 700; }
  .totals-row.balance-row { color: #dc2626; font-weight: 700; }

  /* ── Notes ── */
  .notes-section {
    background: #fffbf0;
    border: 1px solid #fde68a;
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 16px;
    font-size: 12px;
    color: #78350f;
  }
  .notes-section .notes-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .08em;
    color: #b45309;
    margin-bottom: 4px;
  }

  /* ── Footer ── */
  .footer {
    border-top: 1px solid #e5e5e5;
    padding-top: 12px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    font-size: 10px;
    color: #888;
  }
  .footer-generated { font-size: 9px; color: #bbb; }
  .status-wrap { display: flex; align-items: center; gap: 8px; }

  @media print {
    .page { padding: 10mm 12mm; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand-name">${escHtml(businessName)}</div>
      <div class="brand-meta">
        ${merchant.address ? escHtml(merchant.address) + '<br/>' : ''}
        ${merchant.phone   ? 'Ph: ' + escHtml(merchant.phone) + '&nbsp;&nbsp;' : ''}
        ${merchant.email   ? escHtml(merchant.email) : ''}<br/>
        ${merchant.gstin   ? 'GSTIN: <strong>' + escHtml(merchant.gstin) + '</strong>' : ''}
      </div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-label">INVOICE</div>
      <div class="invoice-number">No. <span>#${escHtml(invoice.invoiceNumber)}</span></div>
    </div>
  </div>

  <!-- Parties -->
  <div class="parties">
    <div class="party">
      <div class="party-label">Bill To</div>
      <div class="party-name">${escHtml(customer.name ?? invoice.customerName)}</div>
      <div class="party-detail">
        ${customer.address ? escHtml(customer.address) + '<br/>' : ''}
        ${customer.phone   ? 'Ph: ' + escHtml(customer.phone)   + '<br/>' : ''}
        ${customer.email   ? escHtml(customer.email) + '<br/>'  : ''}
        ${customer.gstin   ? 'GSTIN: <strong>' + escHtml(customer.gstin) + '</strong>' : ''}
      </div>
    </div>
    <div style="text-align:right">
      <div class="status-wrap" style="justify-content:flex-end;margin-bottom:6px">
        ${statusBadge}
      </div>
    </div>
  </div>

  <!-- Dates strip -->
  <div class="dates-strip">
    <div class="date-cell">
      <div class="date-cell-label">Invoice Date</div>
      <div class="date-cell-value">${formatDate(invoice.createdAt as admin.firestore.Timestamp)}</div>
    </div>
    <div class="date-cell">
      <div class="date-cell-label">Due Date</div>
      <div class="date-cell-value">${formatDate(invoice.dueDate)}</div>
    </div>
    <div class="date-cell">
      <div class="date-cell-label">Invoice ID</div>
      <div class="date-cell-value">${escHtml(invoiceId)}</div>
    </div>
  </div>

  <!-- Items table -->
  <table class="items-table">
    <thead>
      <tr>
        <th>Description</th>
        <th class="center">Qty</th>
        <th class="right">Rate</th>
        <th class="center">GST%</th>
        <th class="right">GST Amt</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <!-- Bottom: GST breakdown + Totals -->
  <div class="bottom-section">
    <div class="gst-table">
      <div class="gst-section-label">GST Summary</div>
      <table class="gst-table-inner">
        <thead>
          <tr>
            <th>Tax</th>
            <th>Taxable</th>
            <th>GST Amount</th>
          </tr>
        </thead>
        <tbody>${gstRows}</tbody>
      </table>
    </div>

    <div class="totals">
      <div class="totals-row">
        <span>Sub Total</span>
        <span>${formatCurrency(subTotal)}</span>
      </div>
      <div class="totals-row">
        <span>Total GST</span>
        <span>${formatCurrency(totalGst)}</span>
      </div>
      <div class="totals-row grand">
        <span>Grand Total</span>
        <span>${formatCurrency(invoice.totalAmount)}</span>
      </div>
      <div class="totals-row paid-row">
        <span>Amount Paid</span>
        <span>− ${formatCurrency(invoice.paidAmount)}</span>
      </div>
      <div class="totals-row balance-row">
        <span>Balance Due</span>
        <span>${formatCurrency(invoice.balanceAmount)}</span>
      </div>
    </div>
  </div>

  ${invoice.notes ? `
  <!-- Notes -->
  <div class="notes-section">
    <div class="notes-label">Notes</div>
    ${escHtml(invoice.notes)}
  </div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <div>
      <div><strong>${escHtml(businessName)}</strong></div>
      ${merchant.gstin ? `<div>GSTIN: ${escHtml(merchant.gstin)}</div>` : ''}
    </div>
    <div style="text-align:right">
      <div class="footer-generated">
        Generated on ${new Date().toLocaleDateString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
        })} · FlowBill
      </div>
    </div>
  </div>

</div>
</body>
</html>`;
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function escHtml(s: string | undefined | null): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}