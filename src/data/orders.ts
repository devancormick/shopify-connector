import { graphqlRequest, type RateLimitState } from '../api';
import type {
  NormalizedOrder,
  NormalizedLineItem,
  OrdersPayload,
} from '../types';

const ORDERS_QUERY = `
query Orders($cursor: String, $first: Int!) {
  orders(first: $first, after: $cursor, query: "status:any") {
    pageInfo { hasNextPage endCursor }
    edges {
      node {
        id
        name
        status
        displayFulfillmentStatus
        createdAt
        customer { displayName }
        lineItems(first: 50) {
          edges {
            node {
              id
              title
              quantity
              sku
              variant { id }
            }
          }
        }
      }
    }
  }
}
`;

interface OrdersGql {
  orders: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    edges: Array<{
      node: {
        id: string;
        name: string;
        status: string;
        displayFulfillmentStatus: string;
        createdAt: string;
        customer: { displayName: string } | null;
        lineItems: {
          edges: Array<{
            node: {
              id: string;
              title: string;
              quantity: number;
              sku: string | null;
              variant: { id: string } | null;
            };
          }>;
        };
      };
    }>;
  };
}

function normalizeLineItem(node: OrdersGql['orders']['edges'][0]['node']['lineItems']['edges'][0]['node']): NormalizedLineItem {
  return {
    id: node.id,
    title: node.title,
    quantity: node.quantity,
    sku: node.sku ?? null,
    variantId: node.variant?.id ?? null,
  };
}

function normalizeOrder(node: OrdersGql['orders']['edges'][0]['node']): NormalizedOrder {
  return {
    id: node.id,
    name: node.name,
    status: node.status,
    fulfillmentStatus: node.displayFulfillmentStatus || null,
    createdAt: node.createdAt,
    customerName: node.customer?.displayName ?? null,
    lineItems: node.lineItems.edges.map((e) => normalizeLineItem(e.node)),
  };
}

export async function fetchOrders(
  shop: string,
  accessToken: string,
  cursor: string | null,
  state?: RateLimitState
): Promise<{ payload: OrdersPayload; nextState: RateLimitState }> {
  const first = 50;
  const { data, cost } = await graphqlRequest<OrdersGql>(
    shop,
    accessToken,
    ORDERS_QUERY,
    { cursor, first },
    state
  );
  const orders = data.orders;
  const pageInfo = orders.pageInfo;
  const nextState: RateLimitState = cost?.throttleStatus
    ? { available: cost.throttleStatus.currentlyAvailable, lastRestore: Date.now() }
    : (state ?? { available: 1000, lastRestore: Date.now() });
  const payload: OrdersPayload = {
    orders: orders.edges.map((e) => normalizeOrder(e.node)),
    hasNextPage: pageInfo.hasNextPage,
    cursor: pageInfo.endCursor,
  };
  return { payload, nextState };
}
