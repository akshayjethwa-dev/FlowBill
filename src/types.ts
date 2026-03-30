export interface Merchant {
  id: string;
  businessName: string;
  ownerName: string;
  email?: string;
  phone: string;
  gstin?: string;
  category: string;
  upiId?: string;
  address?: string;
  onboarded: boolean;
  createdAt: any; // Firestore Timestamp
}

export interface Customer {
  id: string;
  merchantId: string;
  name: string;
  phone: string;
  businessName?: string;
  gstin?: string;
  address?: string;
  creditDays: number;
  outstandingAmount: number;
  status: 'active' | 'overdue' | 'inactive';
  createdAt: any;
}

export interface Product {
  id: string;
  merchantId: string;
  name: string;
  sku?: string;
  unit: string;
  price: number;
  gstRate: number;
  isActive: boolean;
  createdAt: any;
}

export interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  rate: number;
  gstRate: number;
  amount: number;
}

export interface Order {
  id: string;
  merchantId: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'draft' | 'confirmed' | 'cancelled' | 'converted_to_invoice';
  notes?: string;
  orderDate: any;
  createdAt: any;
}

export interface Invoice {
  id: string;
  merchantId: string;
  orderId?: string;
  estimateId?: string;
  customerId: string;
  customerName: string;
  invoiceNumber: string;
  items: OrderItem[];
  totalAmount: number;
  paidAmount: number;
  status: 'draft' | 'sent' | 'unpaid' | 'paid' | 'partial' | 'overdue';
  dueDate: any;
  notes?: string;
  createdAt: any;
}

export interface Estimate {
  id: string;
  merchantId: string;
  orderId?: string;
  customerId: string;
  customerName: string;
  estimateNumber: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'converted_to_invoice';
  validUntil: any;
  notes?: string;
  createdAt: any;
}

export interface DashboardStats {
  totalSales: number;
  pendingAmount: number;
  overdueAmount: number;
  activeCustomers: number;
  dueTodayCount: number;
  overdueCount: number;
}

export interface ActivityItem {
  id: string;
  type: 'order' | 'invoice' | 'payment' | 'customer' | 'reminder';
  title: string;
  subtitle: string;
  timestamp: any;
  status?: string;
}

export interface Reminder {
  id: string;
  merchantId: string;
  customerId: string;
  customerName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  type: 'payment' | 'follow_up' | 'custom';
  status: 'upcoming' | 'overdue' | 'sent' | 'cancelled';
  scheduledDate: any;
  message: string;
  createdAt: any;
}

export interface ReminderHistory {
  id: string;
  merchantId: string;
  reminderId: string;
  customerId: string;
  customerName: string;
  type: string;
  sentAt: any;
  channel: 'whatsapp' | 'sms' | 'email';
  status: 'delivered' | 'failed';
}

export interface Payment {
  id: string;
  merchantId: string;
  customerId: string;
  customerName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  amount: number;
  method: 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other';
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  referenceNumber?: string;
  notes?: string;
  paymentDate: any;
  createdAt: any;
}

export interface AgingBucket {
  label: string;
  amount: number;
  count: number;
  color: string;
}

export interface LedgerSummary {
  totalOutstanding: number;
  overdueAmount: number;
  agingBuckets: AgingBucket[];
}

export interface CustomerLedgerEntry {
  customerId: string;
  customerName: string;
  outstandingAmount: number;
  overdueAmount: number;
  lastPaymentDate?: any;
  invoiceCount: number;
}
