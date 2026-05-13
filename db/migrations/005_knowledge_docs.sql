-- Knowledge docs — long-lived reference documents (contracts, programmes,
-- specs) ingested into AIOS so the assistant can query their content.
--
-- Each row is one document for one project. clauses_json holds the
-- structured extraction (e.g. {variations_clause, payment_terms, eot_triggers,
-- scope_inclusions, scope_exclusions, key_dates, key_contacts}). content_md
-- holds the full parsed markdown as a fallback.
--
-- Upserted by external scripts (see workspace scripts/aios_ingest_contract.py).
-- Read by the assistant via lib/claude/tools.ts query_contract_clauses /
-- query_contract_full.

create table if not exists knowledge_docs (
  id uuid primary key default gen_random_uuid(),
  project_number text not null,
  doc_type text not null check (doc_type in ('contract', 'programme', 'spec', 'other')),
  source_path text,
  title text not null,
  content_md text not null,
  clauses_json jsonb,
  ingested_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists knowledge_docs_project_type_idx
  on knowledge_docs (project_number, doc_type);

create unique index if not exists knowledge_docs_unique_idx
  on knowledge_docs (project_number, doc_type, title);
