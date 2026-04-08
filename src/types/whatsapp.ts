import { Timestamp, FieldValue } from 'firebase/firestore';

export type WhatsappProvider = 'gupshup' | 'twilio' | '360dialog' | string;

export interface MerchantWhatsappConfig {
  provider: WhatsappProvider;
  status: 'pending' | 'active' | 'error' | 'disabled';
  businessNumber: string;
  appName: string;
  optInRequired: boolean;
  lastHealthCheckAt?: Timestamp | FieldValue | null;
  lastError?: string | null;
  createdAt?: Timestamp | FieldValue | string;
  updatedAt?: Timestamp | FieldValue | string;
}

export interface WhatsappTemplate {
  templateKey: string;
  providerTemplateId: string;
  category: 'utility' | 'marketing' | 'auth' | string;
  language: string;
  sampleBody?: string;
  paramOrder: string[];
  approved: boolean;
  createdAt?: Timestamp | FieldValue | string;
  updatedAt?: Timestamp | FieldValue | string;
}

/**
 * Collection: /merchants/{merchantId}/whatsappMessages/{messageId}
 *
 * REQUIRED:    id, merchantId, customerId, customerPhone, templateKey,
 *              provider, sendStatus, deliveryStatus, retryCount, channel
 * OPTIONAL:    customerName, invoiceId, invoiceNumber, reminderId,
 *              providerMessageId, lastErrorCode, lastErrorReason, variables
 * COMPUTED:    isPermanentFailure (set by retry handler), all *At timestamps
 * IMMUTABLE:   id, merchantId, createdAt
 */
export interface WhatsappMessage {
  readonly id: string;
  readonly merchantId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  reminderId: string | null;
  templateKey: string;
  provider: WhatsappProvider;
  providerTemplateId: string;
  providerMessageId: string | null;
  sendStatus: 'pending' | 'queued' | 'sent' | 'failed';
  deliveryStatus: 'unknown' | 'sent' | 'delivered' | 'read' | 'failed';
  retryCount: number;
  lastErrorCode: string | number | null;
  lastErrorReason: string | null;
  isPermanentFailure: boolean;
  channel: 'whatsapp';
  variables: Record<string, unknown>;
  createdAt?: Timestamp | FieldValue | string;
  updatedAt?: Timestamp | FieldValue | string;
  sentAt?: Timestamp | FieldValue | string | null;
  deliveredAt?: Timestamp | FieldValue | string | null;
  readAt?: Timestamp | FieldValue | string | null;
  failedAt?: Timestamp | FieldValue | string | null;
}

export interface WhatsappQuotaDaily {
  date: string;
  count: number;
  limit: number;
  updatedAt?: Timestamp | FieldValue | string;
}