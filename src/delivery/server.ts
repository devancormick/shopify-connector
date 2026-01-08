import http from 'http';
import { URL } from 'url';
import { memoryTokenStorage } from '../auth';
import { connectStore, disconnectStore, getConnectUrl, connectWithToken } from '../auth';
import { TokenInvalidError } from '../api';
import { fetchOrders } from '../data/orders';
import { fetchFulfillments } from '../data/fulfillments';
import { fetchProducts } from '../data/products';
import { fetchProductVariants } from '../data/product-variants';

const storage = memoryTokenStorage;

function send(res: http.ServerResponse, status: number, body: unknown): void {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  });
  res.end(data);
}

function sendError(
  res: http.ServerResponse,
  status: number,
  message: string,
  code?: string
): void {
  const body: { error: string; code?: string } = { error: message };
  if (code) body.code = code;
  send(res, status, body);
}

function parseBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? (JSON.parse(raw) as Record<string, unknown>) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

export function createServer(): http.Server {
  return http.createServer(async (req, res) => {
    const method = req.method ?? 'GET';
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    const pathname = url.pathname;

    try {
      if (pathname === '/auth/install' && method === 'GET') {
        const shop = url.searchParams.get('shop');
        if (!shop) {
          send(res, 400, { error: 'Missing shop parameter' });
          return;
        }
        const redirectUrl = getConnectUrl(shop);
        res.writeHead(302, { Location: redirectUrl });
        res.end();
        return;
      }

      if (pathname === '/auth/callback' && method === 'GET') {
        const shop = url.searchParams.get('shop');
        const code = url.searchParams.get('code');
        if (!shop || !code) {
          send(res, 400, { error: 'Missing shop or code' });
          return;
        }
        const result = await connectStore(storage, shop, code);
        send(res, 200, result);
        return;
      }

      if (pathname === '/disconnect' && method === 'POST') {
        const body = await parseBody(req);
        const shop = (body.shop as string) ?? '';
        if (!shop) {
          sendError(res, 400, 'Missing shop in body');
          return;
        }
        const result = await disconnectStore(storage, shop);
        send(res, 200, result);
        return;
      }

      if (pathname === '/api/orders' && method === 'GET') {
        const shop = url.searchParams.get('shop');
        const cursor = url.searchParams.get('cursor') ?? null;
        const token = shop ? await storage.get(shop) : null;
        if (!shop || !token) {
          sendError(res, 401, 'Store not connected or invalid shop', 'TOKEN_INVALID');
          return;
        }
        try {
          const { payload } = await fetchOrders(shop, token, cursor);
          send(res, 200, payload);
        } catch (err) {
          if (err instanceof TokenInvalidError) {
            sendError(res, 401, err.message, err.code);
            return;
          }
          throw err;
        }
        return;
      }

      if (pathname === '/api/fulfillments' && method === 'GET') {
        const shop = url.searchParams.get('shop');
        const cursor = url.searchParams.get('cursor') ?? null;
        const token = shop ? await storage.get(shop) : null;
        if (!shop || !token) {
          sendError(res, 401, 'Store not connected or invalid shop', 'TOKEN_INVALID');
          return;
        }
        try {
          const { payload } = await fetchFulfillments(shop, token, cursor);
          send(res, 200, payload);
        } catch (err) {
          if (err instanceof TokenInvalidError) {
            sendError(res, 401, err.message, err.code);
            return;
          }
          throw err;
        }
        return;
      }

      if (pathname === '/api/products' && method === 'GET') {
        const shop = url.searchParams.get('shop');
        const cursor = url.searchParams.get('cursor') ?? null;
        const token = shop ? await storage.get(shop) : null;
        if (!shop || !token) {
          sendError(res, 401, 'Store not connected or invalid shop', 'TOKEN_INVALID');
          return;
        }
        try {
          const { payload } = await fetchProducts(shop, token, cursor);
          send(res, 200, payload);
        } catch (err) {
          if (err instanceof TokenInvalidError) {
            sendError(res, 401, err.message, err.code);
            return;
          }
          throw err;
        }
        return;
      }

      const productVariantsMatch = pathname.match(/^\/api\/product\/([^/]+)\/variants$/);
      if (productVariantsMatch && method === 'GET') {
        const productId = productVariantsMatch[1];
        const shop = url.searchParams.get('shop');
        const cursor = url.searchParams.get('cursor') ?? null;
        const token = shop ? await storage.get(shop) : null;
        if (!shop || !token) {
          sendError(res, 401, 'Store not connected or invalid shop', 'TOKEN_INVALID');
          return;
        }
        try {
          const { payload } = await fetchProductVariants(shop, token, productId, cursor);
          send(res, 200, payload);
        } catch (err) {
          if (err instanceof TokenInvalidError) {
            sendError(res, 401, err.message, err.code);
            return;
          }
          throw err;
        }
        return;
      }

      if (pathname === '/health' && method === 'GET') {
        send(res, 200, { status: 'ok' });
        return;
      }

      sendError(res, 404, 'Not found');
    } catch (err) {
      if (err instanceof TokenInvalidError) {
        sendError(res, 401, err.message, err.code);
        return;
      }
      const message = err instanceof Error ? err.message : 'Internal server error';
      sendError(res, 500, message);
    }
  });
}
