// src/types/invoice.ts
import { Timestamp, FieldValue } from 'firebase/firestore';
import { BaseEntity, OrderItem } from './common';

/**
 * Collection: /merchants/{merchantId}/invoices/{invoiceId}
 *
 * REQUIRED:    id, merchantId, invoiceNumber, customerId, customerName,
 *              items, totalAmount, paidAmount, balanceAmount, status, dueDate
 * OPTIONAL:    orderId, estimateId, notes, pdfStoragePath, pdfGeneratedAt
 * COMPUTED:    paidAmount (updated by paymentService), balanceAmount
 * IMMUTABLE:   id, merchantId, createdAt, invoiceNumber
 *
 * PDF fields:
 *   pdfStoragePath  — Storage path: merchants/{mid}/invoices/{id}/invoice.pdf
 *   pdfGeneratedAt  — Timestamp of last PDF generation
 *   pdfUrl          — NOT stored in Firestore; transient signed URL from Cloud Function
 */
export interface Invoice extends BaseEntity {
  // Required
  invoiceNumber: string;          // immutable after creation
  customerId: string;
  customerName: string;           // denormalized
  items: OrderItem[];
  totalAmount: number;            // computed from items
  paidAmount: number;             // computed by payment events
  balanceAmount: number;          // computed: totalAmount - paidAmount
  status: InvoiceStatus;
  dueDate: Timestamp | FieldValue | string;

  // Optional / linkage
  orderId?: string;
  estimateId?: string;
  notes?: string;

  // PDF metadata (stored in Firestore)
  pdfStoragePath?: string | null;
  pdfGeneratedAt?: Timestamp | FieldValue | string | null;

  // Transient — returned by generateInvoicePdf / getInvoicePdfUrl (NOT stored)
  pdfUrl?: string | null;
}

export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'unpaid'
  | 'paid'
  | 'partial'
  | 'overdue';