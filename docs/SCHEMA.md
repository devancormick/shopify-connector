# JSON payload schema (for backend)

All dates are ISO 8601 strings. All list endpoints support pagination via `cursor` and return `hasNextPage` and `cursor` for the next page.

## Orders – `GET /api/orders`

```json
{
  "orders": [
    {
      "id": "gid://shopify/Order/...",
      "name": "#1001",
      "status": "FULFILLED",
      "fulfillmentStatus": "FULFILLED",
      "createdAt": "2024-01-15T12:00:00Z",
      "customerName": "Jane Doe",
      "lineItems": [
        {
          "id": "gid://shopify/LineItem/...",
          "title": "Product A",
          "quantity": 2,
          "sku": "SKU-001",
          "variantId": "gid://shopify/ProductVariant/..."
        }
      ]
    }
  ],
  "hasNextPage": true,
  "cursor": "eyJsYXN0X2lkIjo..."
}
```

## Fulfillments – `GET /api/fulfillments`

```json
{
  "fulfillments": [
    {
      "id": "gid://shopify/Fulfillment/...",
      "orderId": "gid://shopify/Order/...",
      "status": "SUCCESS",
      "trackingNumbers": ["1Z999AA10123456784"],
      "trackingUrls": ["https://..."],
      "carrierName": "UPS",
      "createdAt": "2024-01-16T10:00:00Z"
    }
  ],
  "hasNextPage": false,
  "cursor": null
}
```

Orders with no tracking yet will have fulfillments with empty `trackingNumbers` and `trackingUrls`.

## Products – `GET /api/products`

```json
{
  "products": [
    {
      "id": "gid://shopify/Product/...",
      "title": "Product A",
      "description": "Plain text description.",
      "variants": [
        {
          "id": "gid://shopify/ProductVariant/...",
          "title": "Small / Red",
          "sku": "SKU-S-R",
          "option1": "Small",
          "option2": "Red",
          "option3": null,
          "inventoryQuantity": 10,
          "inventoryStatus": "in_stock"
        }
      ]
    }
  ],
  "hasNextPage": true,
  "cursor": "..."
}
```

`inventoryStatus`: `in_stock` | `out_of_stock` | `partial` (partial = 1–9 units).
