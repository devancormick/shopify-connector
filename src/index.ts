import { createServer } from './delivery/server';

const PORT = parseInt(process.env.CONNECTOR_PORT ?? '3000', 10);

const server = createServer();
server.listen(PORT, () => {
  console.log(`Shopify connector listening on port ${PORT}`);
});
