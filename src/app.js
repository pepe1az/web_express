import express from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { InputError, taskInput, validId, validRunId } from './validation.js';
const hash = value => createHash('sha256').update(value).digest();
export function createApp({ store, author, token }) {
  const app = express();
  app.disable('x-powered-by');
  app.enable('strict routing');
  app.set('query parser', 'simple');
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'same-origin');
    res.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    next();
  });
  app.get('/login/', (req, res) => res.type('text/plain').send(author.login));
  const expected = hash(token);
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const match = /^Bearer (\S+)$/i.exec(req.get('Authorization') || '');
    if (!match || !timingSafeEqual(hash(match[1]), expected)) {
      res.set('WWW-Authenticate', 'Bearer');
      return res.status(401).json({ error: 'Требуется действующий токен' });
    }
    next();
  });
  app.use('/api', express.json({ limit: '16kb', strict: true }));
  app.get('/api/author/', (req, res) => res.json(author));
  app.post('/api/tasks/', async (req, res) => {
    const task = await store.create(author.login, taskInput(req.body));
    res.status(201).location(`/api/tasks/${task.id}/`).json(task);
  });
  app.get('/api/tasks/', async (req, res) => {
    if (!validRunId(req.query.runId)) throw new InputError('Необходим корректный runId');
    res.json(await store.list(author.login, req.query.runId));
  });
  app.param('id', (req, res, next, id) => {
    if (!validId(id)) return next(new InputError('Некорректный UUID'));
    next();
  });
  app.get('/api/tasks/:id/', async (req, res) => {
    const task = await store.get(author.login, req.params.id);
    if (!task) return res.status(404).json({ error: 'Дело не найдено' });
    res.json(task);
  });
  app.patch('/api/tasks/:id/', async (req, res) => {
    const task = await store.update(author.login, req.params.id, taskInput(req.body, true));
    if (!task) return res.status(404).json({ error: 'Дело не найдено' });
    res.json(task);
  });
  app.delete('/api/tasks/:id/', async (req, res) => {
    if (!await store.remove(author.login, req.params.id)) return res.status(404).json({ error: 'Дело не найдено' });
    res.status(204).end();
  });
  app.use('/api', (req, res) => res.status(404).json({ error: 'Маршрут не найден' }));
  app.use(express.static(fileURLToPath(new URL('../public', import.meta.url))));
  app.use((req, res) => res.status(404).type('text/plain').send('Страница не найдена'));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const input = error instanceof InputError || error instanceof URIError ||
      ['entity.parse.failed', 'entity.too.large', 'encoding.unsupported', 'charset.unsupported'].includes(error.type);
    res.status(input ? 400 : 503).json({ error: input ? (error instanceof InputError ? error.message : 'Некорректное тело запроса') : 'База данных временно недоступна' });
  });
  return app;
}
