export type WhatsappProvider = 'gupshup' | 'twilio' | '360dialog' | string;

export interface MerchantWhatsappConfig {
  provider: WhatsappProvider;
  status: 'pending' | 'active' | 'error' | 'disabled';
  businessNumber: string;
  appName: string;
  optInRequired: boolean;
  lastHealthCheckAt?: unknown | null;
  lastError?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WhatsappTemplate {
  templateKey: string;
  providerTemplateId: string;
  category: 'utility' | 'marketing' | 'auth' | string;
  language: string;
  sampleBody?: string;
  paramOrder: string[];
  approved: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WhatsappMessage {
  id: string;
  merchantId: string;
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
  createdAt?: unknown;
  updatedAt?: unknown;
  sentAt?: unknown | null;
  deliveredAt?: unknown | null;
  readAt?: unknown | null;
  failedAt?: unknown | null;
}

export interface WhatsappQuotaDaily {
  date: string;
  count: number;
  limit: number;
  updatedAt?: unknown;
}