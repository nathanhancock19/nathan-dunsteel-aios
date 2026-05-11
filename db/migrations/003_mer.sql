-- MER (Monthly Earnings Report) tables.
--
-- Source: Nathan's manually-maintained Google Sheet, synced ~daily.
-- Idempotent upsert by primary key on each sync.

CREATE TABLE IF NOT EXISTS mer_scopes (
  id TEXT PRIMARY KEY,                  -- "{project}::{scope}"
  project_number TEXT NOT NULL,
  project_label TEXT,
  scope_name TEXT NOT NULL,
  scope_value NUMERIC,
  remaining_value NUMERIC,
  claimed_pct NUMERIC,                  -- 0..1
  is_variation BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mer_scopes_project ON mer_scopes (project_number);

CREATE TABLE IF NOT EXISTS mer_claims (
  id TEXT PRIMARY KEY,                  -- "{project}::{scope}::{yearmonth}"
  project_number TEXT NOT NULL,
  scope_name TEXT NOT NULL,
  year_month TEXT NOT NULL,             -- "2026-04"
  remaining_value NUMERIC,
  claimed_pct NUMERIC,                  -- 0..1
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mer_claims_project_month ON mer_claims (project_number, year_month);
CREATE INDEX IF NOT EXISTS idx_mer_claims_scope ON mer_claims (project_number, scope_name);

-- One-row table tracking the last MER sync.
CREATE TABLE IF NOT EXISTS mer_sync_state (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_synced_at TIMESTAMPTZ,
  last_scope_count INT,
  last_claim_count INT,
  last_error TEXT
);
INSERT INTO mer_sync_state (id) VALUES (1) ON CONFLICT DO NOTHING;
