-- Matches lib/db/src/schema/* (Drizzle). Idempotent: safe on every startup.
-- Statements end with @@ (see spring.sql.init.separator) so DO $$ blocks are not split on inner ;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'member');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;@@

DO $$ BEGIN
  CREATE TYPE project_status AS ENUM ('active', 'archived', 'completed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;@@

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'in_review', 'done');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;@@

DO $$ BEGIN
  CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;@@

CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  avatar_url text,
  role user_role NOT NULL DEFAULT 'member',
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);@@

CREATE TABLE IF NOT EXISTS projects (
  id serial PRIMARY KEY,
  name text NOT NULL,
  description text,
  color text NOT NULL DEFAULT '#6366f1',
  status project_status NOT NULL DEFAULT 'active',
  owner_id integer NOT NULL REFERENCES users (id),
  start_date text,
  end_date text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);@@

CREATE TABLE IF NOT EXISTS tasks (
  id serial PRIMARY KEY,
  title text NOT NULL,
  description text,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  project_id integer NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  assignee_id integer REFERENCES users (id),
  reporter_id integer NOT NULL REFERENCES users (id),
  parent_task_id integer REFERENCES tasks (id) ON DELETE CASCADE,
  start_date text,
  due_date text,
  estimated_hours real,
  tags json NOT NULL DEFAULT '[]'::json,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);@@

CREATE TABLE IF NOT EXISTS task_dependencies (
  id serial PRIMARY KEY,
  task_id integer NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  depends_on_task_id integer NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  created_at timestamp NOT NULL DEFAULT now()
);@@

CREATE TABLE IF NOT EXISTS comments (
  id serial PRIMARY KEY,
  content text NOT NULL,
  task_id integer NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  user_id integer NOT NULL REFERENCES users (id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);@@
