import test from 'node:test';
import assert from 'node:assert/strict';
import { taskInput, validId, validRunId } from '../src/validation.js';
import { createApp } from '../src/app.js';

test('title trimming, unicode length and allowed fields', () => {
  assert.deepEqual(taskInput({ title: '  дело  ', runId: 'manual' }), { title: 'дело', runId: 'manual' });
  assert.equal(taskInput({ title: '😀'.repeat(200), runId: 'a' }).title.length, 400);
  for (const body of [null, [], {}, { title: '', runId: 'a' }, { title: 'x', runId: 'a', done: false }, { title: 'x', runId: 'a', ownerLogin: 'other' }, { title: '😀'.repeat(201), runId: 'a' }, { title: 1, runId: 'a' }]) assert.throws(() => taskInput(body));
});
test('PATCH accepts only nonempty title/done', () => {
  assert.deepEqual(taskInput({ done: false }, true), { done: false });
  for (const body of [{}, { done: 'false' }, { done: 0 }, { runId: 'a' }, { title: ' ' }, []]) assert.throws(() => taskInput(body, true));
});
test('UUID and runId boundaries', () => {
  assert.ok(validId('12345678-abcd-1234-1234-123456789abc'));
  assert.ok(!validId('123'));
  assert.ok(validRunId('A_z-0'));
  assert.ok(validRunId('a'.repeat(64)));
  for (const value of ['', 'a'.repeat(65), 'привет', 'a b', [], 1]) assert.ok(!validRunId(value));
});
test('authentication precedes JSON parsing; database failures are 503 JSON', async () => {
  const token = 'test-token-that-is-at-least-32-characters';
  const app = createApp({ store: { list: async () => { throw Error('private connection details'); } }, author: { login: 'test', fullName: 'Test' }, token });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  try {
    const unauthorized = await fetch(url + '/api/tasks/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(unauthorized.status, 401);
    const failed = await fetch(url + '/api/tasks/?runId=test', { headers: { Authorization: 'Bearer ' + token } });
    assert.equal(failed.status, 503);
    assert.match(failed.headers.get('content-type'), /^application\/json/);
    assert.deepEqual(await failed.json(), { error: 'База данных временно недоступна' });
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
