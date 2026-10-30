export class InputError extends Error {}
export const validRunId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
export const validId = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function taskInput(body, patch = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('Ожидается JSON-объект');
  const keys = Object.keys(body);
  const allowed = patch ? ['title', 'done'] : ['title', 'runId'];
  if (!keys.length || keys.some(key => !allowed.includes(key))) throw new InputError('Недопустимый набор полей');
  const result = {};
  if (!patch || Object.hasOwn(body, 'title')) {
    if (typeof body.title !== 'string') throw new InputError('title должен быть строкой');
    const title = body.title.trim();
    if (Array.from(title).length < 1 || Array.from(title).length > 200) throw new InputError('Длина title: от 1 до 200 символов');
    result.title = title;
  }
  if (!patch) {
    if (!validRunId(body.runId)) throw new InputError('Некорректный runId');
    result.runId = body.runId;
  }
  if (Object.hasOwn(body, 'done')) {
    if (typeof body.done !== 'boolean') throw new InputError('done должен быть boolean');
    result.done = body.done;
  }
  return result;
}
