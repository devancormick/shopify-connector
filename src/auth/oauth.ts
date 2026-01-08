const SCOPES = process.env.SHOPIFY_SCOPES ?? 'read_orders,read_fulfillments,read_products';

export function getInstallUrl(shop: string, callbackPath = '/auth/callback'): string {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const base = (process.env.CALLBACK_URL_BASE ?? '').replace(/\/$/, '');
  if (!clientId || !base) {
    throw new Error('SHOPIFY_CLIENT_ID and CALLBACK_URL_BASE must be set');
  }
  const redirectUri = `${base}${callbackPath}`;
  const state = Buffer.from(JSON.stringify({ shop: shop.toLowerCase() })).toString('base64url');
  return `https://${shop}/admin/oauth/authorize?client_id=${encodeURIComponent(clientId)}&scope=${encodeURIComponent(SCOPES)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
}

export async function exchangeCodeForToken(
  shop: string,
  code: string,
  callbackPath = '/auth/callback'
): Promise<string> {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  const base = (process.env.CALLBACK_URL_BASE ?? '').replace(/\/$/, '');
  if (!clientId || !clientSecret || !base) {
    throw new Error('SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET, and CALLBACK_URL_BASE must be set');
  }
  const redirectUri = `${base}${callbackPath}`;
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OAuth token exchange failed: ${res.status} ${text}`);
  }
  const body = (await res.json()) as { access_token: string };
  return body.access_token;
}

export async function revokeToken(shop: string, accessToken: string): Promise<void> {
  const res = await fetch(`https://${shop}/admin/oauth/revoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({ access_token: accessToken }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token revocation failed: ${res.status} ${text}`);
  }
}
