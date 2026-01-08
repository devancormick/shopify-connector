import { graphqlRequest, type RateLimitState } from '../api';
import type { NormalizedFulfillment, FulfillmentsPayload } from '../types';

const FULFILLMENTS_QUERY = `
query Fulfillments($cursor: String, $first: Int!) {
  fulfillments(first: $first, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    edges {
      node {
        id
        status
        createdAt
        order { id }
        trackingInfo {
          number
          url
          company
        }
      }
    }
  }
}
`;

interface FulfillmentsGql {
  fulfillments: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    edges: Array<{
      node: {
        id: string;
        status: string;
        createdAt: string;
        order: { id: string };
        trackingInfo: Array<{
          number: string | null;
          url: string | null;
          company: string | null;
        }>;
      };
    }>;
  };
}

function normalizeFulfillment(node: FulfillmentsGql['fulfillments']['edges'][0]['node']): NormalizedFulfillment {
  const tracking = node.trackingInfo?.[0];
  return {
    id: node.id,
    orderId: node.order.id,
    status: node.status,
    trackingNumbers: (node.trackingInfo ?? [])
      .map((t) => t?.number)
      .filter((n): n is string => Boolean(n)),
    trackingUrls: (node.trackingInfo ?? [])
      .map((t) => t?.url)
      .filter((u): u is string => Boolean(u)),
    carrierName: tracking?.company ?? null,
    createdAt: node.createdAt,
  };
}

export async function fetchFulfillments(
  shop: string,
  accessToken: string,
  cursor: string | null,
  state?: RateLimitState
): Promise<{ payload: FulfillmentsPayload; nextState: RateLimitState }> {
  const first = 50;
  const { data, cost } = await graphqlRequest<FulfillmentsGql>(
    shop,
    accessToken,
    FULFILLMENTS_QUERY,
    { cursor, first },
    state
  );
  const fulfillments = data.fulfillments;
  const pageInfo = fulfillments.pageInfo;
  const nextState: RateLimitState = cost?.throttleStatus
    ? { available: cost.throttleStatus.currentlyAvailable, lastRestore: Date.now() }
    : (state ?? { available: 1000, lastRestore: Date.now() });
  const payload: FulfillmentsPayload = {
    fulfillments: fulfillments.edges.map((e) => normalizeFulfillment(e.node)),
    hasNextPage: pageInfo.hasNextPage,
    cursor: pageInfo.endCursor,
  };
  return { payload, nextState };
}
