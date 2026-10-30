DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='todo_app') THEN
    CREATE ROLE todo_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE CONNECTION LIMIT 5;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='todo_reviewer') THEN
    CREATE ROLE todo_reviewer LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE CONNECTION LIMIT 5;
  END IF;
END $$;
SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', current_database()) \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO todo_app,todo_reviewer', current_database()) \gexec
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO todo_app,todo_reviewer;
GRANT SELECT,INSERT,UPDATE,DELETE ON tasks TO todo_app,todo_reviewer;
ALTER ROLE todo_app SET statement_timeout='5s';
ALTER ROLE todo_reviewer SET statement_timeout='15s';
