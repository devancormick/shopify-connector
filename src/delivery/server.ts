import http from 'http';
import { URL } from 'url';
import { memoryTokenStorage } from '../auth';
import { connectStore, disconnectStore, getConnectUrl } from '../auth';
import { fetchOrders } from '../data/orders';
import { fetchFulfillments } from '../data/fulfillments';
import { fetchProducts } from '../data/products';

const storage = memoryTokenStorage;

function send(res: http.ServerResponse, status: number, body: unknown): void {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  });
  res.end(data);
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
          send(res, 400, { error: 'Missing shop in body' });
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
          send(res, 401, { error: 'Store not connected or invalid shop' });
          return;
        }
        const { payload } = await fetchOrders(shop, token, cursor);
        send(res, 200, payload);
        return;
      }

      if (pathname === '/api/fulfillments' && method === 'GET') {
        const shop = url.searchParams.get('shop');
        const cursor = url.searchParams.get('cursor') ?? null;
        const token = shop ? await storage.get(shop) : null;
        if (!shop || !token) {
          send(res, 401, { error: 'Store not connected or invalid shop' });
          return;
        }
        const { payload } = await fetchFulfillments(shop, token, cursor);
        send(res, 200, payload);
        return;
      }

      if (pathname === '/api/products' && method === 'GET') {
        const shop = url.searchParams.get('shop');
        const cursor = url.searchParams.get('cursor') ?? null;
        const token = shop ? await storage.get(shop) : null;
        if (!shop || !token) {
          send(res, 401, { error: 'Store not connected or invalid shop' });
          return;
        }
        const { payload } = await fetchProducts(shop, token, cursor);
        send(res, 200, payload);
        return;
      }

      if (pathname === '/health' && method === 'GET') {
        send(res, 200, { status: 'ok' });
        return;
      }

      send(res, 404, { error: 'Not found' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal server error';
      send(res, 500, { error: message });
    }
  });
}
