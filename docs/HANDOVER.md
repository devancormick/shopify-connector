# Handover walkthrough

## What was built

- **Shopify connector** (read-only): OAuth and private app token connect, token storage, revoke/disconnect, and HTTP API to fetch orders (with fulfillments/tracking per order), fulfillments, and products as normalized JSON.
- **Connection**: OAuth (`/auth/install` + callback) or private app token (`POST /auth/connect-token`).
- **Data**: Orders (with fulfillments/tracking), fulfillments, products (variants with size/color/SKU, inventory). Pagination and rate limiting. Product variants endpoint for products with >250 variants.
- **Safety**: One-action disconnect; 401 with `code: TOKEN_INVALID` for token expiry; no background sync after disconnect.

## Run locally

1. Create a Shopify app (Custom app or dev store app) and get Client ID and Client Secret (for OAuth).
2. Copy `.env.example` to `.env` and set:
   - `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, `CALLBACK_URL_BASE` (for OAuth)
3. `npm install && npm run build && npm start`
4. **OAuth**: Open `http://localhost:3000/auth/install?shop=YOUR-STORE.myshopify.com`; after approving, you’re connected.
   **Private app**: `POST /auth/connect-token` with `{ "shop": "STORE.myshopify.com", "accessToken": "shpat_..." }`.
5. Use `GET /api/orders?shop=...`, `/api/fulfillments?shop=...`, `/api/products?shop=...` (optional `&cursor=...`). For products with many variants: `GET /api/product/{productId}/variants?shop=...&cursor=...`.
6. Use `POST /disconnect` with `{ "shop": "YOUR-STORE.myshopify.com" }` to disconnect.

## Integrate with your backend

- **Connect**: OAuth – redirect to `/auth/install?shop=...`; after callback, token is stored. Private app – call `POST /auth/connect-token` with shop and access token. Then call `/api/*` with the same `shop` for data (on-demand or refresh); no background sync.
- **Disconnect**: Call `POST /disconnect`; tokens are revoked (OAuth) or removed (private app). Do not call `/api/*` for that shop after disconnect.
- **Token expiry**: On 401 with `code: "TOKEN_INVALID"`, prompt the merchant to reconnect.

## Where things live

- `src/auth` – OAuth, token storage, connect/disconnect
- `src/api` – GraphQL client and rate limiting
- `src/data` – Orders, fulfillments, products fetch and normalization
- `src/delivery` – HTTP server and routes
- `src/types` – Shared types and payload schema
- `docs/SETUP.md` – Connection, scopes, disconnect
- `docs/SCHEMA.md` – JSON payload shapes

## Token storage

Default is in-memory (`memoryTokenStorage`). For production, replace with a persistent `TokenStorage` implementation (e.g. DB) in `src/delivery/server.ts` and pass it into the auth/connect and data flow.
