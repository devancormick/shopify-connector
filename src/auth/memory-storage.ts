import type { TokenStorage } from '../types';

const store = new Map<string, string>();

export const memoryTokenStorage: TokenStorage = {
  async save(shop: string, accessToken: string): Promise<void> {
    store.set(shop.toLowerCase(), accessToken);
  },
  async get(shop: string): Promise<string | null> {
    return store.get(shop.toLowerCase()) ?? null;
  },
  async delete(shop: string): Promise<void> {
    store.delete(shop.toLowerCase());
  },
  async has(shop: string): Promise<boolean> {
    return store.has(shop.toLowerCase());
  },
};
