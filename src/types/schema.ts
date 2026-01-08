/**
 * Normalized JSON payload types for backend consumption.
 * All dates are ISO 8601 strings.
 */

export interface NormalizedLineItem {
  id: string;
  title: string;
  quantity: number;
  sku: string | null;
  variantId: string | null;
}

export interface NormalizedOrderFulfillment {
  id: string;
  status: string;
  trackingNumbers: string[];
  trackingUrls: string[];
  carrierName: string | null;
}

export interface NormalizedOrder {
  id: string;
  name: string;
  status: string;
  fulfillmentStatus: string | null;
  createdAt: string;
  customerName: string | null;
  lineItems: NormalizedLineItem[];
  fulfillments: NormalizedOrderFulfillment[];
}

export interface NormalizedFulfillment {
  id: string;
  orderId: string;
  status: string;
  trackingNumbers: string[];
  trackingUrls: string[];
  carrierName: string | null;
  createdAt: string;
}

export interface NormalizedVariant {
  id: string;
  title: string;
  sku: string | null;
  size: string | null;
  color: string | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  inventoryQuantity: number;
  inventoryStatus: 'in_stock' | 'out_of_stock' | 'partial';
}

export interface NormalizedProduct {
  id: string;
  title: string;
  description: string;
  variants: NormalizedVariant[];
}

export interface OrdersPayload {
  orders: NormalizedOrder[];
  hasNextPage: boolean;
  cursor: string | null;
}

export interface FulfillmentsPayload {
  fulfillments: NormalizedFulfillment[];
  hasNextPage: boolean;
  cursor: string | null;
}

export interface ProductsPayload {
  products: NormalizedProduct[];
  hasNextPage: boolean;
  cursor: string | null;
}
