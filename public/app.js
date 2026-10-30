const $ = id => document.getElementById(id);
const state = { token: '', runId: 'manual', tasks: [], filter: 'all', editing: null, deleting: null, revision: 0 };
let noticeTimer;
function notice(message, error = false) {
  clearTimeout(noticeTimer);
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
  $('status').hidden = false;
  noticeTimer = setTimeout(() => { $('status').hidden = true; }, error ? 9000 : 3500);
}
function logout() {
  state.token = ''; state.tasks = []; state.revision++;
  $('token').value = ''; $('workspace').hidden = true; $('auth-panel').hidden = false;
  $('edit-dialog').close(); $('delete-dialog').close(); $('token').focus();
}
async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(path, { ...options, headers: { Authorization: `Bearer ${state.token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}) } });
  } catch { throw new Error('Нет связи с сервером. Проверьте подключение и повторите попытку.'); }
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) logout();
    throw new Error(data.error || 'Не удалось выполнить запрос');
  }
  return data;
}
async function withForm(form, action) {
  const button = form.querySelector('button[type=submit]');
  if (button.disabled) return;
  button.disabled = true;
  try { await action(); } catch (error) { notice(error.message, true); }
  finally { button.disabled = false; }
}
function makeButton(symbol, label, handler) {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'icon-button'; button.textContent = symbol;
  button.setAttribute('aria-label', label); button.title = label; button.addEventListener('click', handler);
  return button;
}
function render() {
  const done = state.tasks.filter(task => task.done).length;
  $('total-badge').textContent = String(state.tasks.length);
  $('progress-text').textContent = `${done} из ${state.tasks.length}`;
  $('progress').max = Math.max(1, state.tasks.length); $('progress').value = done;
  const tasks = state.tasks.filter(task => state.filter === 'all' || task.done === (state.filter === 'done'));
  $('task-list').replaceChildren(); $('empty').hidden = tasks.length > 0;
  $('empty').querySelector('h3').textContent = state.tasks.length ? 'Таких дел пока нет' : 'Здесь пока чистый лист';
  $('empty').querySelector('p').textContent = state.tasks.length ? 'Выберите другой фильтр или добавьте новое дело.' : 'Добавьте первое дело — оно появится здесь.';
  for (const task of tasks) {
    const li = document.createElement('li'); li.className = `task${task.done ? ' completed' : ''}`; li.dataset.id = task.id;
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = task.done;
    checkbox.setAttribute('aria-label', `Выполнение: ${task.title}`);
    checkbox.addEventListener('change', async () => {
      checkbox.disabled = true;
      try { await api(`/api/tasks/${task.id}/`, { method: 'PATCH', body: JSON.stringify({ done: checkbox.checked }) }); await reload(); notice('Статус сохранён'); }
      catch (error) { checkbox.checked = task.done; notice(error.message, true); }
      finally { checkbox.disabled = false; }
    });
    const body = document.createElement('div'); body.className = 'task-body';
    const title = document.createElement('span'); title.className = 'task-title'; title.textContent = task.title;
    const meta = document.createElement('div'); meta.className = 'task-meta';
    meta.textContent = new Date(task.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    body.append(title, meta);
    const actions = document.createElement('div'); actions.className = 'task-actions';
    actions.append(makeButton('✎', `Изменить: ${task.title}`, () => { state.editing = task.id; $('edit-title').value = task.title; $('edit-dialog').showModal(); $('edit-title').focus(); }));
    actions.append(makeButton('×', `Удалить: ${task.title}`, () => { state.deleting = task.id; $('delete-title').textContent = task.title; $('delete-dialog').showModal(); }));
    li.append(checkbox, body, actions); $('task-list').append(li);
  }
}
async function reload() {
  const revision = ++state.revision;
  const tasks = await api(`/api/tasks/?runId=${encodeURIComponent(state.runId)}`);
  if (revision === state.revision && state.token) { state.tasks = tasks; render(); }
}
$('auth-form').addEventListener('submit', event => {
  event.preventDefault();
  withForm(event.currentTarget, async () => {
    state.token = $('token').value.trim();
    const author = await api('/api/author/');
    $('author-name').textContent = author.fullName; $('author-login').textContent = `@${author.login}`;
    await reload(); $('token').value = ''; $('auth-panel').hidden = true; $('workspace').hidden = false;
    $('new-title').focus();
  });
});
$('logout').addEventListener('click', logout);
$('create-form').addEventListener('submit', event => {
  event.preventDefault();
  withForm(event.currentTarget, async () => {
    await api('/api/tasks/', { method: 'POST', body: JSON.stringify({ title: $('new-title').value, runId: state.runId }) });
    $('new-title').value = ''; await reload(); notice('Дело добавлено'); $('new-title').focus();
  });
});
$('group-form').addEventListener('submit', event => {
  event.preventDefault();
  withForm(event.currentTarget, async () => {
    const next = $('run-id').value;
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(next)) throw new Error('Проверьте название группы');
    const tasks = await api(`/api/tasks/?runId=${encodeURIComponent(next)}`);
    state.revision++; state.runId = next; state.tasks = tasks; render(); notice(`Выбрана группа: ${next}`);
  });
});
$('refresh').addEventListener('click', async () => { try { await reload(); notice('Список обновлён'); } catch (error) { notice(error.message, true); } });
for (const button of document.querySelectorAll('[data-filter]')) {
  button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    render();
  });
}
$('cancel-edit').addEventListener('click', () => $('edit-dialog').close());
$('cancel-delete').addEventListener('click', () => $('delete-dialog').close());
$('edit-form').addEventListener('submit', event => {
  event.preventDefault();
  withForm(event.currentTarget, async () => {
    await api(`/api/tasks/${state.editing}/`, { method: 'PATCH', body: JSON.stringify({ title: $('edit-title').value }) });
    $('edit-dialog').close(); await reload(); notice('Название сохранено');
  });
});
$('delete-form').addEventListener('submit', event => {
  event.preventDefault();
  withForm(event.currentTarget, async () => {
    await api(`/api/tasks/${state.deleting}/`, { method: 'DELETE' });
    $('delete-dialog').close(); await reload(); notice('Дело удалено');
  });
});
