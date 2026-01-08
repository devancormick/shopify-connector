# Setup & Connection

## How connection works

1. **Install URL**: Your backend or a simple UI sends the merchant to:
   `GET /auth/install?shop=STORE.myshopify.com`
   The connector redirects the merchant to Shopify OAuth.

2. **Callback**: After the merchant approves, Shopify redirects to your callback with `?shop=...&code=...`. The connector exchanges the code for an access token and stores it by shop domain. No background sync is started.

3. **Data access**: Your backend calls:
   - `GET /api/orders?shop=STORE.myshopify.com` (optional `&cursor=...` for pagination)
   - `GET /api/fulfillments?shop=STORE.myshopify.com&cursor=...`
   - `GET /api/products?shop=STORE.myshopify.com&cursor=...`
   Each returns JSON with a documented schema (see `src/types/schema.ts`). Use `hasNextPage` and `cursor` to page through large stores.

4. **Refresh**: Call the same endpoints again anytime; no reconnection needed until the token is revoked or expired.

## Required scopes

- `read_orders`
- `read_fulfillments`
- `read_products`

Set in env as `SHOPIFY_SCOPES` (comma-separated) or leave default.

## How to disconnect

- **Single action**: `POST /disconnect` with body `{ "shop": "STORE.myshopify.com" }`.
- The connector calls Shopify’s revoke endpoint and deletes the stored token. No background sync runs after disconnect.

## Environment

- `SHOPIFY_CLIENT_ID` – from your Shopify app
- `SHOPIFY_CLIENT_SECRET` – from your Shopify app
- `CALLBACK_URL_BASE` – e.g. `http://localhost:3000` or your public URL (no trailing slash)
- `SHOPIFY_SCOPES` – optional; default `read_orders,read_fulfillments,read_products`
- `CONNECTOR_PORT` – optional; default `3000`

## Token expiration / reconnect

If Shopify returns 401 (e.g. token expired or revoked), your backend should treat the store as disconnected and prompt the merchant to reconnect via `/auth/install?shop=...` again.
