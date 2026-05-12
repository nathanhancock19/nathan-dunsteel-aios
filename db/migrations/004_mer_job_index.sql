-- Add job_index column to mer_scopes (stores "V06", "Scope 1", etc. from sheet column 0)
-- Add this_month_value column to mer_claims (stores the thisMonth$ dollar amount from the sheet)
--
-- Run once against the Neon DB via the Neon SQL console:
--   https://console.neon.tech

ALTER TABLE mer_scopes ADD COLUMN IF NOT EXISTS job_index TEXT;
ALTER TABLE mer_claims ADD COLUMN IF NOT EXISTS this_month_value NUMERIC;
