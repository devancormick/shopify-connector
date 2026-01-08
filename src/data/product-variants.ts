import { graphqlRequest, type RateLimitState } from '../api';
import type { NormalizedVariant } from '../types';

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

interface VariantNode {
  id: string;
  title: string;
  sku: string | null;
  selectedOptions: Array<{ name: string; value: string }>;
  inventoryQuantity: number;
}

function normalizeVariant(node: VariantNode): NormalizedVariant {
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
