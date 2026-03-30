// 1. Export the ActivityType so ActivityIcon.tsx can import it.
// We include both the general categories and the specific actions your UI expects.
export type ActivityType = 
  | 'order' 
  | 'invoice' 
  | 'payment' 
  | 'customer' 
  | 'reminder'
  | 'invoice_created' 
  | 'invoice_updated' 
  | 'reminder_sent' 
  | 'payment_marked' 
  | 'customer_added';

// 2. Define the ActivityItem using the expanded type
export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  subtitle: string;
  timestamp: any;
  status?: string;
}