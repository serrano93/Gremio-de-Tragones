-- ============================================================================
-- GREMIO DE TRAGONES — Migración 013
-- RPC para upgrades de Dragon's Hoard (compra con oro del usuario)
-- ============================================================================

CREATE OR REPLACE FUNCTION purchase_hoard_upgrade(
  p_target_level INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_id UUID;
  v_current_gold INTEGER;
  v_cost INTEGER := 0;
BEGIN
  -- Get profile_id from auth
  SELECT p.id, p.gold INTO v_profile_id, v_current_gold
  FROM profiles p
  WHERE p.auth_id = auth.uid();

  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Perfil no encontrado');
  END IF;

  -- Determine cost based on target level
  v_cost := CASE p_target_level
    WHEN 2 THEN 500
    WHEN 3 THEN 2000
    WHEN 4 THEN 5000
    WHEN 5 THEN 15000
    ELSE 0
  END;

  IF v_cost = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nivel inválido');
  END IF;

  IF v_current_gold < v_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Oro insuficiente');
  END IF;

  -- Deduct gold
  UPDATE profiles
  SET gold = gold - v_cost, updated_at = now()
  WHERE id = v_profile_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_level', p_target_level,
    'gold_spent', v_cost,
    'new_gold', v_current_gold - v_cost
  );
END;
$$;

GRANT EXECUTE ON FUNCTION purchase_hoard_upgrade(INTEGER) TO authenticated;

-- ============================================================================
-- FIN
-- ============================================================================
