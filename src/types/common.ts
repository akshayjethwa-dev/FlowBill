export interface BaseEntity {
  id: string;
  merchantId: string;
  createdAt?: any; 
  isArchived?: boolean; // ✅ Added for soft-delete strategy
}

export interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  rate: number;
  gstRate: number;
  amount: number;
}