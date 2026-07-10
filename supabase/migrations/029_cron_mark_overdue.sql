-- ============================================================================
-- Migration 029: Daily overdue-fee sweep
--
-- mark_overdue_fees() (migration 012) only ran when someone touched a row or
-- called it manually; fees quietly stayed 'pending' past their due date until
-- an edit. pg_cron flips them to 'overdue' every day at 17:00 UTC (0h giờ VN).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

SELECT cron.schedule(
  'mark-overdue-fees-daily',
  '0 17 * * *', -- 17:00 UTC = 00:00 giờ Việt Nam
  $$SELECT public.mark_overdue_fees()$$
);
