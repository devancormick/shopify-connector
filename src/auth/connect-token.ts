import type { TokenStorage } from '../types';
import { graphqlRequest } from '../api';
import { TokenInvalidError } from '../api';

const SHOP_QUERY = `
query Shop {
  shop { name }
}
`;

export interface ConnectTokenResult {
  shop: string;
  connected: true;
}

/**
 * Connect a store using a private/custom app access token (read-only).
 * Validates the token with a cheap Shopify API call, then stores it.
 */
export async function connectWithToken(
  storage: TokenStorage,
  shop: string,
  accessToken: string
): Promise<ConnectTokenResult> {
  try {
    await graphqlRequest<{ shop: { name: string } }>(shop, accessToken, SHOP_QUERY);
  } catch (err) {
    if (err instanceof TokenInvalidError) {
      throw err;
    }
    throw new Error('Invalid shop or access token');
  }
  await storage.save(shop, accessToken);
  return { shop: shop.toLowerCase(), connected: true };
}
