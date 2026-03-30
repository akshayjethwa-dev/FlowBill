import { BaseEntity } from './common';

export interface Product extends BaseEntity {
  name: string;
  sku?: string;
  unit: string;
  price: number;
  gstRate: number;
  isActive: boolean;
}