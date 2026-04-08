import { BaseEntity } from './common';

/**
 * Collection: /merchants/{merchantId}/products/{productId}
 *
 * REQUIRED:    id, merchantId, name, unit, price, gstRate, isActive
 * OPTIONAL:    sku, description, hsnCode
 * IMMUTABLE:   id, merchantId, createdAt
 */
export interface Product extends BaseEntity {
  // Required
  name: string;
  unit: string;
  price: number;
  gstRate: GstRate;
  isActive: boolean;

  // Optional
  sku?: string;
  description?: string;
  hsnCode?: string;
}

/** Valid GST slab rates in India */
export type GstRate = 0 | 5 | 12 | 18 | 28;