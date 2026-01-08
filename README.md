# Shopify Connector

Read-only Shopify connector for an AI-based customer support platform. Securely connects Shopify stores and pulls orders, fulfillments, and products via the GraphQL Admin API so your backend can answer customer questions accurately.

## Features

- **Secure connection**: OAuth-based store connect with token storage and revocation
- **Read-only**: Orders, fulfillments, products; no writes, refunds, or order edits
- **Structured data**: Normalized JSON payloads with documented schema
- **Rate limiting**: Handles Shopify cost/rate limits and large stores with pagination
- **Disconnect**: One-action revoke; no background sync after disconnect

## Quick Start

```bash
cp .env.example .env
# Set SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET, CALLBACK_URL_BASE
npm install
npm run build
npm start
```

See [docs/SETUP.md](docs/SETUP.md) for connection flow, required scopes, and how to disconnect.

## Project Structure

- `src/auth` – OAuth and token storage
- `src/api` – GraphQL client, rate limiting, queries
- `src/data` – Orders, fulfillments, products fetch and normalize
- `src/delivery` – Data delivery API for your backend
- `src/types` – Shared types and schema

## License

Proprietary. All rights reserved. This repository is private.
