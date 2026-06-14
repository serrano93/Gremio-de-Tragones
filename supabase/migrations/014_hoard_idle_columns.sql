-- ============================================================================
-- GREMIO DE TRAGONES — Migración 014
-- Hoard idle game: persist level and last_claim in profiles
-- ============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS hoard_level INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS hoard_last_claim TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill existing rows: set hoard_last_claim to now() so they don't
-- accumulate retroactively on first load.
UPDATE profiles
SET hoard_last_claim = now()
WHERE hoard_last_claim IS NULL;

-- ============================================================================
-- FIN
-- ============================================================================
