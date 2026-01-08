export interface StoredConnection {
  shop: string;
  accessToken: string;
  createdAt: string;
}

export interface TokenStorage {
  save(shop: string, accessToken: string): Promise<void>;
  get(shop: string): Promise<string | null>;
  delete(shop: string): Promise<void>;
  has(shop: string): Promise<boolean>;
}
