-- ============================================================================
-- GREMIO DE TRAGONES — Migración 009
-- Límite de misiones por comerciante: 3 rango F-C, 2 rango B-A, 1 rango S
-- (Validación server-side via trigger BEFORE INSERT)
-- ============================================================================

CREATE OR REPLACE FUNCTION check_merchant_mission_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id UUID;
  v_owner_role TEXT;
  v_rank TEXT;
  v_tier TEXT;
  v_count INT;
  v_limit INT;
  v_tier_label TEXT;
BEGIN
  -- Obtener el owner del establecimiento
  SELECT e.owner_id, p.role
    INTO v_owner_id, v_owner_role
    FROM establishments e
    LEFT JOIN profiles p ON p.id = e.owner_id
   WHERE e.id = NEW.establishment_id;

  -- Si no hay owner, dejar pasar (no aplica la regla)
  IF v_owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Si el owner no es merchant, dejar pasar (admin puede crear sin límite)
  IF v_owner_role IS DISTINCT FROM 'merchant' THEN
    RETURN NEW;
  END IF;

  v_rank := NEW.required_min_rank;

  IF v_rank IN ('F', 'E', 'D', 'C') THEN
    v_tier := 'low';
    v_limit := 3;
    v_tier_label := 'F-C';
  ELSIF v_rank IN ('B', 'A') THEN
    v_tier := 'mid';
    v_limit := 2;
    v_tier_label := 'B-A';
  ELSIF v_rank = 'S' THEN
    v_tier := 'high';
    v_limit := 1;
    v_tier_label := 'S';
  ELSE
    RETURN NEW;
  END IF;

  -- Contar misiones activas del merchant en este tier (a través de sus establecimientos)
  SELECT COUNT(*) INTO v_count
    FROM missions m
    JOIN establishments e ON e.id = m.establishment_id
   WHERE e.owner_id = v_owner_id
     AND m.required_min_rank IN (
       CASE v_tier
         WHEN 'low' THEN 'F,E,D,C'
         WHEN 'mid' THEN 'B,A'
         WHEN 'high' THEN 'S'
       END
     );

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Límite alcanzado: máximo % mision(es) de rango % por comerciante. Ya tienes %.', v_limit, v_tier_label, v_count
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_merchant_mission_limit ON missions;

CREATE TRIGGER trg_check_merchant_mission_limit
  BEFORE INSERT ON missions
  FOR EACH ROW
  EXECUTE FUNCTION check_merchant_mission_limit();

-- ============================================================================
-- FIN
-- ============================================================================
