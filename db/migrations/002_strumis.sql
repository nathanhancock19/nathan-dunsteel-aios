-- Strumis sync tables
--
-- Each entity gets a flat table with the columns the UI / Claude tools need
-- as denormalised columns, plus a `raw` JSONB of the original row so we can
-- evolve the schema without re-syncing or losing data.
--
-- Identifier columns are TEXT (not GUID) so we can build composite keys
-- like "{project}::{cost_code}::{type}" when Strumis itself doesn't expose
-- a single primary key.
--
-- All tables include `synced_at` so we can detect stale rows.
--
-- The `sync_runs` table is the run-log + manual-refresh flag store.

CREATE TABLE IF NOT EXISTS sync_runs (
  id TEXT PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  source TEXT NOT NULL,                          -- 'desktop' | 'api'
  status TEXT NOT NULL,                          -- 'in_progress' | 'ok' | 'error'
  agent_version TEXT,
  project_filter TEXT,
  row_counts JSONB,
  error TEXT,
  manual_refresh_requested_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_sync_runs_started ON sync_runs (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_runs_status ON sync_runs (status);

-- Singleton row for tracking manual refresh requests across runs.
-- AIOS UI sets manual_refresh_requested_at = NOW() when user clicks Refresh.
-- Agent reads this on next poll and runs sync if newer than last sync.
CREATE TABLE IF NOT EXISTS sync_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_successful_sync_at TIMESTAMPTZ,
  last_successful_sync_id TEXT,
  manual_refresh_requested_at TIMESTAMPTZ,
  manual_refresh_handled_at TIMESTAMPTZ
);
INSERT INTO sync_state (id) VALUES (1) ON CONFLICT DO NOTHING;

-- =================================================================
-- ENTITY TABLES
-- =================================================================
-- Each table has the same shape:
--   key columns (denormalised for fast filtering)
--   raw JSONB (the full Strumis row for future-proofing)
--   synced_at TIMESTAMPTZ
--
-- Run ID stored to allow "purge stale rows from prior runs" if we want.

CREATE TABLE IF NOT EXISTS strumis_projects (
  project_number TEXT PRIMARY KEY,
  name TEXT,
  status TEXT,
  client TEXT,
  contract_value NUMERIC,
  start_date DATE,
  end_date DATE,
  raw JSONB NOT NULL,
  run_id TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS strumis_budget_lines (
  id TEXT PRIMARY KEY,
  project_number TEXT NOT NULL,
  cost_code TEXT,
  cost_centre TEXT,
  description TEXT,
  budget_amount NUMERIC,
  raw JSONB NOT NULL,
  run_id TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_strumis_budget_project ON strumis_budget_lines (project_number);
CREATE INDEX IF NOT EXISTS idx_strumis_budget_costcode ON strumis_budget_lines (cost_code);

CREATE TABLE IF NOT EXISTS strumis_cost_lines (
  id TEXT PRIMARY KEY,
  project_number TEXT NOT NULL,
  cost_code TEXT,
  cost_centre TEXT,
  description TEXT,
  actual_amount NUMERIC,
  committed_amount NUMERIC,
  raw JSONB NOT NULL,
  run_id TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_strumis_cost_project ON strumis_cost_lines (project_number);
CREATE INDEX IF NOT EXISTS idx_strumis_cost_costcode ON strumis_cost_lines (cost_code);

CREATE TABLE IF NOT EXISTS strumis_purchase_orders (
  id TEXT PRIMARY KEY,
  project_number TEXT NOT NULL,
  po_number TEXT,
  supplier TEXT,
  cost_code TEXT,
  description TEXT,
  amount NUMERIC,
  date DATE,
  status TEXT,
  raw JSONB NOT NULL,
  run_id TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_strumis_pos_project ON strumis_purchase_orders (project_number);
CREATE INDEX IF NOT EXISTS idx_strumis_pos_date ON strumis_purchase_orders (date DESC);

CREATE TABLE IF NOT EXISTS strumis_purchase_invoices (
  id TEXT PRIMARY KEY,
  project_number TEXT NOT NULL,
  invoice_number TEXT,
  po_number TEXT,
  supplier TEXT,
  cost_code TEXT,
  description TEXT,
  amount NUMERIC,
  date DATE,
  matched BOOLEAN,
  raw JSONB NOT NULL,
  run_id TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_strumis_inv_project ON strumis_purchase_invoices (project_number);
CREATE INDEX IF NOT EXISTS idx_strumis_inv_date ON strumis_purchase_invoices (date DESC);

CREATE TABLE IF NOT EXISTS strumis_time_sheets (
  id TEXT PRIMARY KEY,
  project_number TEXT NOT NULL,
  worker TEXT,
  cost_code TEXT,
  hours NUMERIC,
  amount NUMERIC,
  date DATE,
  raw JSONB NOT NULL,
  run_id TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_strumis_time_project ON strumis_time_sheets (project_number);
CREATE INDEX IF NOT EXISTS idx_strumis_time_date ON strumis_time_sheets (date DESC);

CREATE TABLE IF NOT EXISTS strumis_variations (
  id TEXT PRIMARY KEY,
  project_number TEXT NOT NULL,
  variation_number TEXT,
  description TEXT,
  amount NUMERIC,
  status TEXT,
  date DATE,
  raw JSONB NOT NULL,
  run_id TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_strumis_var_project ON strumis_variations (project_number);

CREATE TABLE IF NOT EXISTS strumis_transactions (
  id TEXT PRIMARY KEY,
  project_number TEXT NOT NULL,
  cost_code TEXT,
  type TEXT,
  description TEXT,
  amount NUMERIC,
  date DATE,
  reference TEXT,
  raw JSONB NOT NULL,
  run_id TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_strumis_tx_project ON strumis_transactions (project_number);
CREATE INDEX IF NOT EXISTS idx_strumis_tx_date ON strumis_transactions (date DESC);

-- Generic catch-all for any proc result we haven't yet given a typed table.
-- Lets us land data immediately and shape it into typed tables later.
CREATE TABLE IF NOT EXISTS strumis_raw (
  proc_name TEXT NOT NULL,
  row_index INT NOT NULL,
  run_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (proc_name, row_index, run_id)
);
CREATE INDEX IF NOT EXISTS idx_strumis_raw_proc ON strumis_raw (proc_name);
CREATE INDEX IF NOT EXISTS idx_strumis_raw_run ON strumis_raw (run_id);
