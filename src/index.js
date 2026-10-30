import pg from 'pg';
import { createApp } from './app.js';
import { createStore } from './store.js';
const { DATABASE_URL, API_TOKEN, AUTHOR_LOGIN, AUTHOR_FULL_NAME } = process.env;
if (!DATABASE_URL || !API_TOKEN || API_TOKEN.length < 32 || !AUTHOR_LOGIN || !AUTHOR_FULL_NAME) throw new Error('Заполните DATABASE_URL, API_TOKEN, AUTHOR_LOGIN, AUTHOR_FULL_NAME');
const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 5, connectionTimeoutMillis: 3000, query_timeout: 5000, idleTimeoutMillis: 30000 });
pool.on('error', () => {});
const app = createApp({ store: createStore(pool), author: { login: AUTHOR_LOGIN, fullName: AUTHOR_FULL_NAME }, token: API_TOKEN });
const server = app.listen(Number(process.env.PORT || 8090), process.env.HOST || '127.0.0.1');
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  const timeout = setTimeout(() => process.exit(1), 10000).unref();
  server.close(async () => { await pool.end(); clearTimeout(timeout); });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
