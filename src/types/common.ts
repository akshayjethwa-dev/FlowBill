export interface BaseEntity {
  id: string;
  merchantId: string;
  createdAt?: any; 
}

export interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  rate: number;
  gstRate: number;
  amount: number;
}