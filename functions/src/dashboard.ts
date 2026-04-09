/**
 * dashboard.ts
 * refreshDashboardSnapshot – callable + exported helper.
 *
 * Aggregates live Firestore data for the merchant and writes a single
 * `merchants/{merchantId}/dashboardSnapshot/current` document. This lets the
 * frontend do a single document read instead of expensive aggregation queries.
 *
 * Used by:
 *  - payments.ts  (after recordManualPayment)
 *  - conversions.ts (after any conversion that creates an invoice)
 *  - Can also be called directly from the frontend / cron
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// ---------------------------------------------------------------------------
// Internal helper – called from other functions
// ---------------------------------------------------------------------------
export async function refreshDashboardSnapshot(merchantId: string): Promise<void> {
  const invoicesRef = db.collection(`merchants/${merchantId}/invoices`);

  // Fetch all non-archived invoices and overdue invoices in parallel
  const [allSnap, overdueSnap] = await Promise.all([
    invoicesRef.where("isArchived", "!=", true).get(),
    invoicesRef
      .where("status", "in", ["sent", "unpaid", "partial"])
      .where("dueDate", "<", admin.firestore.Timestamp.now())
      .get(),
  ]);

  let totalInvoiced    = 0;
  let totalCollected   = 0;
  let totalOutstanding = 0;
  let overdueCount     = 0;
  let overdueAmount    = 0;
  let draftCount       = 0;
  let paidCount        = 0;
  let openCount        = 0;

  for (const doc of allSnap.docs) {
    const inv = doc.data();
    totalInvoiced    += inv.totalAmount  ?? 0;
    totalCollected   += inv.paidAmount   ?? 0;
    totalOutstanding += inv.balanceDue   ?? ((inv.totalAmount ?? 0) - (inv.paidAmount ?? 0));
    if (inv.status === "draft")                                   draftCount++;
    if (inv.status === "paid")                                    paidCount++;
    if (["sent", "unpaid", "partial"].includes(inv.status))       openCount++;
  }

  for (const doc of overdueSnap.docs) {
    const inv = doc.data();
    overdueCount++;
    overdueAmount += inv.balanceDue ?? ((inv.totalAmount ?? 0) - (inv.paidAmount ?? 0));
  }

  const snapshotRef = db.doc(`merchants/${merchantId}/dashboardSnapshot/current`);
  await snapshotRef.set(
    {
      merchantId,
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      overdueCount,
      overdueAmount,
      draftCount,
      paidCount,
      openCount,
      totalInvoiceCount: allSnap.size,
      lastRefreshedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

// ---------------------------------------------------------------------------
// Callable Cloud Function – triggered from frontend or scheduled job
// ---------------------------------------------------------------------------
export const refreshDashboardSnapshotFn = onCall(async (request) => {
  const { auth } = request;
  if (!auth) throw new HttpsError("unauthenticated", "User must be authenticated");

  const merchantId = auth.uid;

  try {
    await refreshDashboardSnapshot(merchantId);
    return { success: true, message: "Dashboard snapshot refreshed" };
  } catch (error) {
    console.error("refreshDashboardSnapshot failed:", error);
    throw new HttpsError("internal", "Failed to refresh dashboard snapshot");
  }
});