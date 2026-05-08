-- Decision log: every PO approval, allocation, snooze, and assistant tool
-- call writes a row. Becomes the assistant's memory window for "what did
-- I commit to do" / "what did I approve last week" recall, and feeds the
-- supplier-learning suggestions on PO allocation.

create table if not exists decisions (
  id          uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor       text not null,                    -- 'nathan' | 'assistant'
  category    text not null,                    -- 'po-approval' | 'po-allocation' | 'snooze' | 'note' | etc
  subject     text,                              -- 'Moss Vale Auto' | 'Project 411'
  body        jsonb not null,
  source_id   text                               -- Monday item id, Notion page id, etc
);

create index if not exists decisions_subject_idx
  on decisions (subject, occurred_at desc);

create index if not exists decisions_category_idx
  on decisions (category, occurred_at desc);

-- Inbox state, server-side mirror of localStorage. Optional: localStorage
-- is the source of truth for v1, server-side mirror lets the assistant
-- read snooze/waiting state for context.
create table if not exists inbox_state (
  id                  text primary key,
  state               text not null,             -- 'new' | 'done' | 'snoozed' | 'waiting'
  state_changed_at    timestamptz not null default now(),
  snoozed_until       timestamptz,
  waiting_for         text,
  waiting_chase_after timestamptz,
  last_seen_at        timestamptz
);

create index if not exists inbox_state_state_idx
  on inbox_state (state, state_changed_at desc);

-- Push history: prevents threshold push from re-firing for the same item
-- and dedupes morning-vs-threshold push for items already seen today.
create table if not exists push_history (
  id          uuid primary key default gen_random_uuid(),
  item_id     text not null,
  push_type   text not null,                     -- 'morning' | 'threshold'
  sent_at     timestamptz not null default now()
);

create index if not exists push_history_item_idx
  on push_history (item_id, sent_at desc);
