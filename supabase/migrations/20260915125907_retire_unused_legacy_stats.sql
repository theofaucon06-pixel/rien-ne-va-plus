-- The discarded parallel implementation is not used by this application.
-- Close its browser-facing access without deleting historical data.
revoke all on function public.casino_stats() from public, anon, authenticated;
revoke all on table public.nights from public, anon, authenticated;
