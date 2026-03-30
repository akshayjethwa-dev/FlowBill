export interface ActivityItem {
  id: string;
  type: 'order' | 'invoice' | 'payment' | 'customer' | 'reminder';
  title: string;
  subtitle: string;
  timestamp: any;
  status?: string;
}