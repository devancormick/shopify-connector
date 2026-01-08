import { graphqlRequest, type RateLimitState } from '../api';
import type {
  NormalizedProduct,
  ProductsPayload,
} from '../types';
import { normalizeVariant } from './variant-utils';

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
