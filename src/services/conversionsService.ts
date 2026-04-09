/**
 * conversionsService.ts
 * Frontend service layer for order/estimate conversion operations.
 * All writes go through Cloud Functions – never directly to Firestore.
 */
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions(undefined, "asia-south1");

/** Convert an order into an estimate. Safe to retry. */
export async function convertOrderToEstimate(
  orderId: string
): Promise<{ estimateId: string; alreadyConverted: boolean }> {
  const fn = httpsCallable<
    { sourceId: string },
    { estimateId: string; alreadyConverted: boolean }
  >(functions, "convertOrderToEstimate");
  return (await fn({ sourceId: orderId })).data;
}

/** Convert an order directly into an invoice. Safe to retry. */
export async function convertOrderToInvoice(
  orderId: string
): Promise<{ invoiceId: string; alreadyConverted: boolean }> {
  const fn = httpsCallable<
    { sourceId: string },
    { invoiceId: string; alreadyConverted: boolean }
  >(functions, "convertOrderToInvoice");
  return (await fn({ sourceId: orderId })).data;
}

/** Convert an estimate into an invoice. Safe to retry. */
export async function convertEstimateToInvoice(
  estimateId: string
): Promise<{ invoiceId: string; alreadyConverted: boolean }> {
  const fn = httpsCallable<
    { sourceId: string },
    { invoiceId: string; alreadyConverted: boolean }
  >(functions, "convertEstimateToInvoice");
  return (await fn({ sourceId: estimateId })).data;
}