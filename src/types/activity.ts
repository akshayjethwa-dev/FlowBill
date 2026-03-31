export type ActivityType = 
  | 'order' 
  | 'invoice' 
  | 'payment' 
  | 'customer' 
  | 'reminder'
  | 'invoice_created' 
  | 'invoice_updated'
  | 'order_created'   
  | 'order_updated'
  | 'reminder_sent' 
  | 'payment_marked' 
  | 'payment_recorded'
  | 'customer_added';

export interface ActivityLog {
  id: string;
  merchantId: string;
  type: ActivityType;
  description: string;
  metadata: Record<string, any>;
  userId: string;
  userName: string;
  createdAt: any;
}

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  subtitle: string;
  timestamp: any;
  status?: string;
  description?: string;
  userName?: string;
  metadata?: Record<string, any>;
}