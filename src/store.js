import { randomUUID } from 'node:crypto';
const columns = 'id, owner_login AS "ownerLogin", title, done, run_id AS "runId", created_at AS "createdAt"';
const output = row => row && ({ ...row, createdAt: new Date(row.createdAt).toISOString() });
export function createStore(pool) {
  return {
    async create(owner, values) {
      const result = await pool.query(`INSERT INTO tasks (id, owner_login, title, done, run_id, created_at)
        VALUES ($1, $2, $3, false, $4, $5) RETURNING ${columns}`,
      [randomUUID(), owner, values.title, values.runId, new Date()]);
      return output(result.rows[0]);
    },
    async list(owner, runId) {
      const result = await pool.query(`SELECT ${columns} FROM tasks WHERE owner_login=$1 AND run_id=$2 ORDER BY created_at, id`, [owner, runId]);
      return result.rows.map(output);
    },
    async get(owner, id) {
      const result = await pool.query(`SELECT ${columns} FROM tasks WHERE owner_login=$1 AND id=$2`, [owner, id]);
      return output(result.rows[0]);
    },
    async update(owner, id, values) {
      const assignments = [];
      const params = [owner, id];
      for (const field of ['title', 'done']) {
        if (Object.hasOwn(values, field)) {
          params.push(values[field]);
          assignments.push(`${field}=$${params.length}`);
        }
      }
      const result = await pool.query(`UPDATE tasks SET ${assignments.join(', ')} WHERE owner_login=$1 AND id=$2 RETURNING ${columns}`, params);
      return output(result.rows[0]);
    },
    async remove(owner, id) {
      const result = await pool.query('DELETE FROM tasks WHERE owner_login=$1 AND id=$2', [owner, id]);
      return result.rowCount > 0;
    }
  };
}
