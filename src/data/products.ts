import { graphqlRequest, type RateLimitState } from '../api';
import type {
  NormalizedProduct,
  NormalizedVariant,
  ProductsPayload,
} from '../types';

const PRODUCTS_QUERY = `
query Products($cursor: String, $first: Int!) {
  products(first: $first, after: $cursor, query: "status:active") {
    pageInfo { hasNextPage endCursor }
    edges {
      node {
        id
        title
        descriptionHtml
        variants(first: 250) {
          edges {
            node {
              id
              title
              sku
              selectedOptions { name value }
              inventoryQuantity
            }
          }
        }
      }
    }
  }
}
`;

interface ProductsGql {
  products: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    edges: Array<{
      node: {
        id: string;
        title: string;
        descriptionHtml: string;
        variants: {
          edges: Array<{
            node: {
              id: string;
              title: string;
              sku: string | null;
              selectedOptions: Array<{ name: string; value: string }>;
              inventoryQuantity: number;
            };
          }>;
        };
      };
    }>;
  };
}

function inventoryStatus(qty: number): 'in_stock' | 'out_of_stock' | 'partial' {
  if (qty <= 0) return 'out_of_stock';
  if (qty < 10) return 'partial';
  return 'in_stock';
}

function pickOptionByName(opts: Array<{ name: string; value: string }>, ...names: string[]): string | null {
  const lower = names.map((n) => n.toLowerCase());
  const opt = opts.find((o) => lower.includes(o.name.toLowerCase()));
  return opt?.value ?? null;
}

function normalizeVariant(
  node: ProductsGql['products']['edges'][0]['node']['variants']['edges'][0]['node']
): NormalizedVariant {
  const opts = node.selectedOptions ?? [];
  const option1 = opts[0]?.value ?? null;
  const option2 = opts[1]?.value ?? null;
  const option3 = opts[2]?.value ?? null;
  const size = pickOptionByName(opts, 'size', 'Size');
  const color = pickOptionByName(opts, 'color', 'Color', 'Colour');
  const qty = node.inventoryQuantity ?? 0;
  return {
    id: node.id,
    title: node.title,
    sku: node.sku ?? null,
    size,
    color,
    option1,
    option2,
    option3,
    inventoryQuantity: qty,
    inventoryStatus: inventoryStatus(qty),
  };
}

function normalizeProduct(node: ProductsGql['products']['edges'][0]['node']): NormalizedProduct {
  const plainDesc = node.descriptionHtml
    ? node.descriptionHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    : '';
  return {
    id: node.id,
    title: node.title,
    description: plainDesc,
    variants: node.variants.edges.map((e) => normalizeVariant(e.node)),
  };
}

export async function fetchProducts(
  shop: string,
  accessToken: string,
  cursor: string | null,
  state?: RateLimitState
): Promise<{ payload: ProductsPayload; nextState: RateLimitState }> {
  const first = 25;
  const { data, cost } = await graphqlRequest<ProductsGql>(
    shop,
    accessToken,
    PRODUCTS_QUERY,
    { cursor, first },
    state
  );
  const products = data.products;
  const pageInfo = products.pageInfo;
  const nextState: RateLimitState = cost?.throttleStatus
    ? { available: cost.throttleStatus.currentlyAvailable, lastRestore: Date.now() }
    : (state ?? { available: 1000, lastRestore: Date.now() });
  const payload: ProductsPayload = {
    products: products.edges.map((e) => normalizeProduct(e.node)),
    hasNextPage: pageInfo.hasNextPage,
    cursor: pageInfo.endCursor,
  };
  return { payload, nextState };
}
