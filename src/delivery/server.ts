import express, { type NextFunction, type Request, type Response } from 'express';
import { memoryTokenStorage } from '../auth';
import { connectStore, disconnectStore, getConnectUrl, connectWithToken } from '../auth';
import { TokenInvalidError } from '../api';
import { fetchOrders } from '../data/orders';
import { fetchFulfillments } from '../data/fulfillments';
import { fetchProducts } from '../data/products';
import { fetchProductVariants } from '../data/product-variants';

const storage = memoryTokenStorage;

function sendError(res: Response, status: number, message: string, code?: string): void {
  const body: { error: string; code?: string } = { error: message };
  if (code) body.code = code;
  res.status(status).json(body);
}

function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
  });
  next();
}

function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<void>>(
  fn: T
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

async function requireToken(req: Request): Promise<{ shop: string; token: string; cursor: string | null }> {
  const shop = (req.query.shop as string) ?? '';
  const cursor = (req.query.cursor as string) ?? null;
  const token = shop ? await storage.get(shop) : null;
  if (!shop || !token) {
    throw new TokenInvalidError('Store not connected or invalid shop');
  }
  return { shop, token, cursor };
}

export function createApp(): express.Express {
  const app = express();

  app.use(express.json());
  app.use(requestLogger);

  app.get('/auth/install', (req, res) => {
    const shop = (req.query.shop as string) ?? '';
    if (!shop) {
      sendError(res, 400, 'Missing shop parameter');
      return;
    }
    const redirectUrl = getConnectUrl(shop);
    res.redirect(302, redirectUrl);
  });

  app.get('/auth/callback', asyncHandler(async (req, res) => {
    const shop = (req.query.shop as string) ?? '';
    const code = (req.query.code as string) ?? '';
    if (!shop || !code) {
      sendError(res, 400, 'Missing shop or code');
      return;
    }
    const result = await connectStore(storage, shop, code);
    res.json(result);
  }));

  app.post('/auth/connect-token', asyncHandler(async (req, res) => {
    const shop = (req.body?.shop as string) ?? '';
    const accessToken = (req.body?.accessToken as string) ?? '';
    if (!shop || !accessToken) {
      sendError(res, 400, 'Missing shop or accessToken in body');
      return;
    }
    const result = await connectWithToken(storage, shop, accessToken);
    res.json(result);
  }));

  app.post('/disconnect', asyncHandler(async (req, res) => {
    const shop = (req.body?.shop as string) ?? '';
    if (!shop) {
      sendError(res, 400, 'Missing shop in body');
      return;
    }
    const result = await disconnectStore(storage, shop);
    res.json(result);
  }));

  app.get('/api/orders', asyncHandler(async (req, res) => {
    const { shop, token, cursor } = await requireToken(req);
    const { payload } = await fetchOrders(shop, token, cursor);
    res.json(payload);
  }));

  app.get('/api/fulfillments', asyncHandler(async (req, res) => {
    const { shop, token, cursor } = await requireToken(req);
    const { payload } = await fetchFulfillments(shop, token, cursor);
    res.json(payload);
  }));

  app.get('/api/products', asyncHandler(async (req, res) => {
    const { shop, token, cursor } = await requireToken(req);
    const { payload } = await fetchProducts(shop, token, cursor);
    res.json(payload);
  }));

  app.get('/api/product/:id/variants', asyncHandler(async (req, res) => {
    const { shop, token, cursor } = await requireToken(req);
    const productId = req.params.id;
    const { payload } = await fetchProductVariants(shop, token, productId, cursor);
    res.json(payload);
  }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use((_req, res) => {
    sendError(res, 404, 'Not found');
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof TokenInvalidError) {
      sendError(res, 401, err.message, err.code);
      return;
    }
    if (err instanceof SyntaxError) {
      sendError(res, 400, 'Invalid JSON');
      return;
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    sendError(res, 500, message);
  });

  return app;
}
