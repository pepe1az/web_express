BEGIN;
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY,
  owner_login text NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200 AND char_length(btrim(title)) > 0),
  done boolean NOT NULL DEFAULT false,
  run_id varchar(64) NOT NULL CHECK (run_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS tasks_owner_run_created_idx ON tasks (owner_login, run_id, created_at, id);
COMMIT;
