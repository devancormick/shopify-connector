import type { TokenStorage } from '../types';
import { getInstallUrl, exchangeCodeForToken, revokeToken } from './oauth';

export interface ConnectResult {
  shop: string;
  connected: true;
}

export interface DisconnectResult {
  shop: string;
  disconnected: true;
}

export async function connectStore(
  storage: TokenStorage,
  shop: string,
  code: string
): Promise<ConnectResult> {
  const token = await exchangeCodeForToken(shop, code);
  await storage.save(shop, token);
  return { shop: shop.toLowerCase(), connected: true };
}

export async function disconnectStore(
  storage: TokenStorage,
  shop: string
): Promise<DisconnectResult> {
  const token = await storage.get(shop);
  if (token) {
    try {
      await revokeToken(shop, token);
    } catch {
      // OAuth revoke may fail for private app tokens; still remove from storage
    }
    await storage.delete(shop);
  }
  return { shop: shop.toLowerCase(), disconnected: true };
}

export function getConnectUrl(shop: string): string {
  return getInstallUrl(shop);
}
