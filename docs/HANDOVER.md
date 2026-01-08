# Handover walkthrough

## What was built

- **Shopify connector** (read-only): OAuth connect, token storage, revoke, and HTTP API to fetch orders, fulfillments, and products as normalized JSON.

## Run locally

1. Create a Shopify app (Custom app or dev store app) and get Client ID and Client Secret.
2. Copy `.env.example` to `.env` and set:
   - `SHOPIFY_CLIENT_ID`
   - `SHOPIFY_CLIENT_SECRET`
   - `CALLBACK_URL_BASE` (e.g. `https://your-ngrok-url` or `http://localhost:3000` for testing)
3. `npm install && npm run build && npm start`
4. Open `http://localhost:3000/auth/install?shop=YOUR-STORE.myshopify.com` to install; after approving, you’re connected.
5. Use `GET /api/orders?shop=...`, `/api/fulfillments?shop=...`, `/api/products?shop=...` (optional `&cursor=...`) for data.
6. Use `POST /disconnect` with `{ "shop": "YOUR-STORE.myshopify.com" }` to disconnect.

## Integrate with your backend

- **Connect**: Redirect merchants to `/auth/install?shop=...`; after callback, the connector stores the token. Your backend can then call the `/api/*` endpoints with the same `shop` to get data (on-demand or refresh); no background sync.
- **Disconnect**: Call `POST /disconnect` when the merchant disconnects; tokens are revoked and removed. Do not call `/api/*` for that shop after disconnect.

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
