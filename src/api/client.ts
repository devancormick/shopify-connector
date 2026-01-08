import { sleep } from '../utils/sleep';
import { TokenInvalidError } from './errors';

const DEFAULT_RESTORE_RATE = 50;

export interface CostInfo {
  requestedQueryCost: number;
  actualQueryCost: number;
  throttleStatus: {
    maximumAvailable: number;
    currentlyAvailable: number;
    restoreRate: number;
  };
}

export interface RateLimitState {
  available: number;
  lastRestore: number;
}

function getCostFromBody(body: { extensions?: { cost?: CostInfo } }): CostInfo | null {
  return body?.extensions?.cost ?? null;
}

export function shopifyGraphQLUrl(shop: string, apiVersion = '2024-01'): string {
  return `https://${shop}/admin/api/${apiVersion}/graphql.json`;
}

export async function graphqlRequest<T>(
  shop: string,
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
  state?: RateLimitState
): Promise<{ data: T; cost: CostInfo | null }> {
  const url = shopifyGraphQLUrl(shop);
  let available = state?.available ?? 1000;
  let lastRestore = state?.lastRestore ?? Date.now();

  const restoreRate = DEFAULT_RESTORE_RATE;
  const maxAvailable = 1000;

  const run = async (): Promise<{ data: T; cost: CostInfo | null }> => {
    const elapsed = (Date.now() - lastRestore) / 1000;
    available = Math.min(maxAvailable, available + elapsed * restoreRate);
    lastRestore = Date.now();

    if (available < 10) {
      const wait = ((10 - available) / restoreRate) * 1000;
      await sleep(Math.ceil(wait));
      return run();
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({ query, variables: variables ?? {} }),
    });

    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After');
      await sleep(retryAfter ? parseInt(retryAfter, 10) * 1000 : 2000);
      return graphqlRequest<T>(shop, accessToken, query, variables, {
        available: 0,
        lastRestore: Date.now(),
      });
    }

    if (res.status === 401) {
      throw new TokenInvalidError('Token expired or revoked');
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Shopify API error ${res.status}: ${text}`);
    }

    const body = (await res.json()) as {
      data?: T;
      errors?: Array<{ message: string }>;
      extensions?: { cost?: CostInfo };
    };

    if (body.errors?.length) {
      throw new Error(body.errors.map((e) => e.message).join('; '));
    }

    const cost = getCostFromBody(body);
    if (cost?.throttleStatus) {
      available = cost.throttleStatus.currentlyAvailable;
    }

    return { data: body.data as T, cost };
  };

  return run();
}
