import { createApp } from './delivery/server';

const PORT = parseInt(process.env.CONNECTOR_PORT ?? '3000', 10);

const app = createApp();
app.listen(PORT, () => {
  console.log(`Shopify connector listening on port ${PORT}`);
});
