import { Timestamp } from "firebase/firestore";

export type ActivityType = 
  | "invoice_created" 
  | "invoice_updated" 
  | "reminder_sent" 
  | "payment_marked" 
  | "customer_added";

export interface Activity {
  id: string;
  merchantId: string;
  type: ActivityType;
  description: string;
  metadata: {
    customerId?: string;
    customerName?: string;
    invoiceId?: string;
    invoiceNumber?: string;
    amount?: number;
    [key: string]: any;
  };
  userId: string; // The user who performed the action
  userName: string;
  createdAt: Timestamp;
}
