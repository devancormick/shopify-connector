# JSON payload schema (for backend)

All dates are ISO 8601 strings. All list endpoints support pagination via `cursor` and return `hasNextPage` and `cursor` for the next page.

## Orders – `GET /api/orders`

Each order includes its fulfillments (tracking) so “Where is my order?” and “What is the tracking link?” can be answered from one call.

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
      ],
      "fulfillments": [
        {
          "id": "gid://shopify/Fulfillment/...",
          "status": "SUCCESS",
          "trackingNumbers": ["1Z999AA10123456784"],
          "trackingUrls": ["https://..."],
          "carrierName": "UPS"
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

Products include up to 250 variants per product. For products with more variants, use `GET /api/product/{productId}/variants`.

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
          "size": "Small",
          "color": "Red",
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

- `size` / `color`: Mapped from variant options when option name matches (e.g. Size, Color, Colour).
- `inventoryStatus`: `in_stock` | `out_of_stock` | `partial` (partial = 1–9 units).

## Product variants (large products) – `GET /api/product/{productId}/variants`

For products with more than 250 variants, page through variants with this endpoint. Use the product GID (e.g. `gid://shopify/Product/123`).

```json
{
  "productId": "gid://shopify/Product/123",
  "productTitle": "Product A",
  "variants": [ ... ],
  "hasNextPage": true,
  "cursor": "..."
}
```

## Error responses

All errors return `{ "error": "message", "code": "CODE" }` where `code` is optional. Use `code: "TOKEN_INVALID"` (with HTTP 401) to prompt the merchant to reconnect.
