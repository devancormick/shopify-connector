import { graphqlRequest, type RateLimitState } from '../api';
import type { NormalizedVariant } from '../types';
import { normalizeVariant } from './variant-utils';

const PRODUCT_VARIANTS_QUERY = `
query ProductVariants($productId: ID!, $cursor: String, $first: Int!) {
  product(id: $productId) {
    id
    title
    variants(first: $first, after: $cursor) {
      pageInfo { hasNextPage endCursor }
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
`;

interface ProductVariantsGql {
  product: {
    id: string;
    title: string;
    variants: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
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
  } | null;
}

interface VariantNode {
  id: string;
  title: string;
  sku: string | null;
  selectedOptions: Array<{ name: string; value: string }>;
  inventoryQuantity: number;
}

export interface ProductVariantsPayload {
  productId: string;
  productTitle: string;
  variants: NormalizedVariant[];
  hasNextPage: boolean;
  cursor: string | null;
}

export async function fetchProductVariants(
  shop: string,
  accessToken: string,
  productId: string,
  cursor: string | null,
  state?: RateLimitState
): Promise<{ payload: ProductVariantsPayload; nextState: RateLimitState }> {
  const first = 250;
  const { data, cost } = await graphqlRequest<ProductVariantsGql>(
    shop,
    accessToken,
    PRODUCT_VARIANTS_QUERY,
    { productId, cursor, first },
    state
  );
  const product = data.product;
  const nextState: RateLimitState = cost?.throttleStatus
    ? { available: cost.throttleStatus.currentlyAvailable, lastRestore: Date.now() }
    : (state ?? { available: 1000, lastRestore: Date.now() });
  if (!product) {
    return {
      payload: {
        productId,
        productTitle: '',
        variants: [],
        hasNextPage: false,
        cursor: null,
      },
      nextState,
    };
  }
  const variants = product.variants;
  const payload: ProductVariantsPayload = {
    productId: product.id,
    productTitle: product.title,
    variants: variants.edges.map((e) => normalizeVariant(e.node)),
    hasNextPage: variants.pageInfo.hasNextPage,
    cursor: variants.pageInfo.endCursor,
  };
  return { payload, nextState };
}
