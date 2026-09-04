-- schema.sql
-- Run once against your Railway PostgreSQL database.
-- Safe to re-run (all statements are idempotent).

CREATE TABLE IF NOT EXISTS config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS names (
  name TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS menu (
  id         SERIAL PRIMARY KEY,
  category   TEXT    NOT NULL,
  name       TEXT    NOT NULL,
  price      INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  name        TEXT        PRIMARY KEY,
  items       JSONB       NOT NULL DEFAULT '[]',
  ordered_by  TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Initial config rows (do not add mgr here — it lives in the MGR_CODE env var)
INSERT INTO config (key, value) VALUES
  ('locked',       'false'),
  ('lockTime',     ''),
  ('orderingOpen', 'false')
ON CONFLICT (key) DO NOTHING;
