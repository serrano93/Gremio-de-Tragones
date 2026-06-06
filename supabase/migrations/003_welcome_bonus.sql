-- ============================================================================
-- GREMIO DE TRAGONES — Migración 003
-- Welcome bonus: 100 XP one-time for new registered adventurers (rank F)
-- ============================================================================

-- RPC: Claim welcome bonus (100 XP, only once per user)
CREATE OR REPLACE FUNCTION claim_welcome_bonus(p_auth_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
BEGIN
  -- Get profile by auth_id
  SELECT * INTO v_profile FROM profiles WHERE auth_id = p_auth_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Perfil no encontrado');
  END IF;

  -- Only rank F gets the bonus
  IF v_profile.rank != 'F' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ya no eres elegible para el bonus de bienvenida');
  END IF;

  -- Check if already claimed (xp >= 100 means they already got it, since bonus is exactly 100)
  IF v_profile.xp >= 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ya reclamaste tu bonus de bienvenida');
  END IF;

  -- Award 100 XP (this will also trigger rank update via update_rank_trigger_fn)
  UPDATE profiles
  SET xp = xp + 100, updated_at = now()
  WHERE auth_id = p_auth_id;

  -- Return new state
  SELECT * INTO v_profile FROM profiles WHERE auth_id = p_auth_id;

  RETURN jsonb_build_object(
    'success', true,
    'xp_awarded', 100,
    'new_total_xp', v_profile.xp,
    'new_rank', v_profile.rank
  );
END;
$$;

-- ============================================================================
-- FIN
-- ============================================================================