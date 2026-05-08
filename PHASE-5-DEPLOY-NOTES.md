# Phase 5 Deploy Notes

Phases 5a through 5e shipped in commits b2bd754 through f2dac97. This
file is the runbook for what you need to do on Vercel before the new
behaviour is fully live. Read top to bottom.

## What runs without any setup

These work the moment the deploy lands. No env or DB changes needed.

- **Phase 5a**
  - PO allocation flow with Job/Scope + Cost Code dropdowns and Confirm
    step. Writes both columns and flips status in one go.
  - Additional comments rendered on PO card.
  - Dead `/deliveries/new` route removed.
  - Urgent flags stub removed.

- **Phase 5b** Inbox
  - Inbox tab is the new dashboard default.
  - Snapshot tab keeps the existing 4 cards as a secondary view.
  - Snooze (24h), done, and waiting state persisted in localStorage
    (per-device).
  - Generators: monday-po, sheets-delivery, notion-diary, docket-app.

- **Phase 5e** Brand
  - Tailwind tokens (ink, cream, signal, muted, rule).
  - Geist font everywhere.
  - Layout shell, dashboard tabs, inbox, assistant panel, PO cards
    converted.

- **Phase 5c** Action assistant
  - Cmd+K opens the panel and focuses the input.
  - System prompt drops the read-only ceiling, adds confirm-before-write.
  - Read tools work (query_inbox, query_dockets, query_projects,
    query_deliveries, today_site_activity, get_project_forecast).
  - Write tools work (monday_approve_po, monday_set_po_allocation).

## What needs an env var

| Var | What it unlocks | Notes |
|---|---|---|
| `AIOS_USER_MONDAY_ID=73750162` | PO assignee filter (approvals page + inbox). Without it both show all pending POs assigned to anyone. | Already documented in 5a |
| `POSTGRES_URL` | Decision log persistence, supplier learning suggestions, push dedupe. | See "Database" below. |
| `CRON_SECRET` | Optional bearer token for cron routes. If unset, routes accept any caller (Vercel Cron itself is the only thing hitting them in practice). | Generate any random string. Put it in both Vercel env and as `Authorization: Bearer <secret>` if you trigger manually. |

## Database (turns on persistent memory)

Without `POSTGRES_URL`, the decision log silently no-ops. The PO
approval flow still works, the assistant still answers, you just don't
get supplier learning, persistent assistant memory, or push dedupe.

To turn it on:

1. Provision Vercel Postgres on this project (or any compatible
   Postgres: Neon, Supabase, etc).
2. Vercel will set `POSTGRES_URL` automatically. Confirm it's in the
   Production env.
3. Run the migration once locally against the production DB:

   ```bash
   POSTGRES_URL="postgres://..." node scripts/migrate.mjs
   ```

   Migrations are idempotent; safe to re-run.

4. Trigger any PO approval through AIOS. Within seconds a row appears
   in the `decisions` table. Subsequent approvals from the same
   supplier will pre-fill the allocation pickers.

## Cron schedules

Defined in `vercel.json`:

- `30 20 * * *` UTC = 06:30 Sydney AEST (07:30 in DST)
  fires `/api/cron/morning-push`. Sends one Telegram digest per day.

- `*/15 21-23,0-7 * * 1-5` UTC = every 15 min Mon-Fri 7am-5pm Sydney
  fires `/api/cron/threshold-push`. Only sends if a new NOW-tier
  item from a high-signal source (PO, delivery) is present.

**Free Hobby plan only allows daily-cadence crons.** If the deploy
fails, remove the threshold-push entry from `vercel.json`. Morning push
still runs on Hobby.

## Migration files

- `db/migrations/001_decisions.sql` creates:
  - `decisions` table (the log)
  - `inbox_state` table (server mirror, optional)
  - `push_history` table (push dedupe)

## Smoke test sequence

Once the deploy lands:

1. Open `/dashboard` on phone. Inbox should render. Empty state shows
   "You're clear." if no items.
2. Tap the AI button (or hit Cmd+K on desktop). Type:
   "what's on the inbox right now"
   The assistant should answer from preloaded state without calling a
   tool.
3. From the inbox, tap the primary action on a PO row. You land on
   `/approvals`. Tap Approve, set allocation, Confirm.
4. Check Monday. The PO should show Approved with the allocations set.
5. If you've provisioned Postgres and run migrations, ask the assistant:
   "what did I approve in the last week"
   It should pull from the decision log and answer.
6. Tomorrow at 06:30 Sydney, expect a Telegram morning digest.

## Known issues / open

- The Quote Approvals card on the dashboard still works but has no
  Airtable table to read from yet, so it shows an empty list. Either
  build the Airtable table or hide the section.
- The Notion site diary card uses SDK v5's `dataSources.query`. If it
  errors on Vercel, the Notion client needs a fallback to
  `databases.query`. Test once live.
- Edge Runtime warnings in the build come from `next-auth`'s `jose`
  internals; pre-existing, not from Phase 5.
- The assistant doesn't currently have a tool for reading the
  decision log directly (it gets the last 7 days injected into the
  system prompt, which covers most "what did I do" questions). Add a
  `query_decisions` tool in Phase 6 if needed.
