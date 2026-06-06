-- ============================================================================
-- GREMIO DE TRAGONES — Actualización de Economía
-- Ejecuta este script en: Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. Añadir columna gold a profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gold INTEGER DEFAULT 0;

-- 2. Añadir columna gold_reward a missions
ALTER TABLE missions ADD COLUMN IF NOT EXISTS gold_reward INTEGER DEFAULT 0;

-- 3. Añadir columnas gold_cost y frequency a offers
ALTER TABLE offers ADD COLUMN IF NOT EXISTS gold_cost INTEGER DEFAULT 0;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS frequency VARCHAR(20) DEFAULT 'once' CHECK (frequency IN ('once', 'daily', 'weekly'));

-- 4. Crear tabla promo_codes
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('gold', 'xp')),
  value INTEGER NOT NULL,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  valid_until TIMESTAMPTZ,
  for_s_rank_only BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Crear tabla user_promo_codes
CREATE TABLE IF NOT EXISTS user_promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, promo_code_id)
);

-- 6. Crear tabla user_offers
CREATE TABLE IF NOT EXISTS user_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, offer_id)
);

-- 7. Habilitar RLS en nuevas tablas
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_offers ENABLE ROW LEVEL SECURITY;

-- 8. Políticas RLS para promo_codes
DROP POLICY IF EXISTS promo_codes_select ON promo_codes;
CREATE POLICY promo_codes_select ON promo_codes FOR SELECT USING (true);

DROP POLICY IF EXISTS promo_codes_insert ON promo_codes;
CREATE POLICY promo_codes_insert ON promo_codes FOR INSERT WITH CHECK (true);

-- 9. Políticas RLS para user_promo_codes
DROP POLICY IF EXISTS user_promo_codes_all ON user_promo_codes;
CREATE POLICY user_promo_codes_all ON user_promo_codes FOR ALL USING (true);

-- 10. Políticas RLS para user_offers
DROP POLICY IF EXISTS user_offers_all ON user_offers;
CREATE POLICY user_offers_all ON user_offers FOR ALL USING (true);

-- 11. RPC: use_promo_code
CREATE OR REPLACE FUNCTION use_promo_code(
  p_code TEXT,
  p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_promo RECORD;
  v_profile RECORD;
  v_is_s_rank BOOLEAN;
  v_existing_use RECORD;
BEGIN
  SELECT * INTO v_promo FROM promo_codes
  WHERE code = p_code AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código no encontrado o inactivo');
  END IF;

  IF v_promo.valid_until IS NOT NULL AND v_promo.valid_until < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código caducado');
  END IF;

  IF v_promo.current_uses >= v_promo.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código agotado');
  END IF;

  SELECT * INTO v_existing_use FROM user_promo_codes
  WHERE user_id = p_user_id AND promo_code_id = v_promo.id;

  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ya has usado este código');
  END IF;

  SELECT *, (rank = 'S') AS is_s INTO v_profile FROM profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;

  IF v_promo.for_s_rank_only AND NOT v_profile.is_s THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este código es solo para miembros de la Taberna Secreta (Rango S)');
  END IF;

  IF v_promo.type = 'gold' THEN
    UPDATE profiles SET gold = gold + v_promo.value WHERE id = p_user_id;
  ELSIF v_promo.type = 'xp' THEN
    UPDATE profiles SET xp = xp + v_promo.value WHERE id = p_user_id;
  END IF;

  INSERT INTO user_promo_codes (user_id, promo_code_id) VALUES (p_user_id, v_promo.id);
  UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = v_promo.id;

  RETURN jsonb_build_object(
    'success', true,
    'type', v_promo.type,
    'value', v_promo.value,
    'message', CASE WHEN v_promo.type = 'gold' THEN 'Oro añadido' ELSE 'XP añadida' END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. RPC: redeem_offer
CREATE OR REPLACE FUNCTION redeem_offer(
  payload JSONB,
  verifier_auth_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_offer_id UUID;
  v_timestamp TEXT;
  v_hash TEXT;
  v_verifier_id UUID;
  v_verifier_role TEXT;
  v_offer RECORD;
  v_profile RECORD;
  v_timestamp_ms BIGINT;
  v_existing_redeem RECORD;
  v_today DATE;
  v_this_week DATE;
BEGIN
  v_user_id := (payload->>'u')::UUID;
  v_offer_id := (payload->>'o')::UUID;
  v_timestamp := payload->>'t';
  v_hash := payload->>'h';

  IF v_user_id IS NULL OR v_offer_id IS NULL OR v_timestamp IS NULL OR v_hash IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payload incompleto');
  END IF;

  v_timestamp_ms := EXTRACT(EPOCH FROM v_timestamp::TIMESTAMPTZ) * 1000;
  IF EXTRACT(EPOCH FROM now()) * 1000 - v_timestamp_ms > 120000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código QR expirado (>2 min)');
  END IF;

  IF v_hash != encode(digest(v_user_id::text || ':' || v_offer_id::text || ':' || v_timestamp, 'sha256'), 'hex') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Firma QR inválida');
  END IF;

  SELECT id, role INTO v_verifier_id, v_verifier_role FROM profiles WHERE auth_id = verifier_auth_id;

  IF v_verifier_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Verificador no encontrado');
  END IF;

  IF v_verifier_role NOT IN ('admin', 'merchant') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo comerciantes o administradores pueden verificar');
  END IF;

  SELECT * INTO v_offer FROM offers WHERE id = v_offer_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Oferta no encontrada o inactiva');
  END IF;

  IF v_offer.frequency = 'once' THEN
    SELECT * INTO v_existing_redeem FROM user_offers WHERE user_id = v_user_id AND offer_id = v_offer_id;
    IF FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Ya has canjeado esta oferta');
    END IF;
  ELSIF v_offer.frequency = 'daily' THEN
    v_today := CURRENT_DATE;
    SELECT * INTO v_existing_redeem FROM user_offers
    WHERE user_id = v_user_id AND offer_id = v_offer_id
    AND DATE(redeemed_at) = v_today;
    IF FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Ya has canjeado esta oferta hoy');
    END IF;
  ELSIF v_offer.frequency = 'weekly' THEN
    v_this_week := DATE_TRUNC('week', CURRENT_DATE);
    SELECT * INTO v_existing_redeem FROM user_offers
    WHERE user_id = v_user_id AND offer_id = v_offer_id
    AND DATE_TRUNC('week', redeemed_at) = v_this_week;
    IF FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Ya has canjeado esta oferta esta semana');
    END IF;
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;

  IF v_profile.gold < v_offer.gold_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Oro insuficiente', 'required', v_offer.gold_cost, 'available', v_profile.gold);
  END IF;

  UPDATE profiles SET gold = gold - v_offer.gold_cost WHERE id = v_user_id;
  INSERT INTO user_offers (user_id, offer_id) VALUES (v_user_id, v_offer_id);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Oferta canjeada con éxito',
    'gold_spent', v_offer.gold_cost,
    'remaining_gold', v_profile.gold - v_offer.gold_cost,
    'offer_title', v_offer.title
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Actualizar verify_and_complete_mission para dar oro también
CREATE OR REPLACE FUNCTION verify_and_complete_mission(
  payload JSONB,
  verifier_auth_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_mission_id UUID;
  v_timestamp TEXT;
  v_hash TEXT;
  v_verifier_id UUID;
  v_verifier_role TEXT;
  v_mission RECORD;
  v_existing RECORD;
  v_establishment_id UUID;
  v_xp_reward INTEGER;
  v_gold_reward INTEGER;
  v_new_xp INTEGER;
  v_new_rank VARCHAR;
  v_new_gold INTEGER;
  v_timestamp_ms BIGINT;
BEGIN
  v_user_id := (payload->>'u')::UUID;
  v_mission_id := (payload->>'m')::UUID;
  v_timestamp := payload->>'t';
  v_hash := payload->>'h';

  IF v_user_id IS NULL OR v_mission_id IS NULL OR v_timestamp IS NULL OR v_hash IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payload incompleto');
  END IF;

  v_timestamp_ms := EXTRACT(EPOCH FROM v_timestamp::TIMESTAMPTZ) * 1000;
  IF EXTRACT(EPOCH FROM now()) * 1000 - v_timestamp_ms > 120000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código QR expirado (>2 min)');
  END IF;

  IF v_hash != encode(digest(v_user_id::text || ':' || v_mission_id::text || ':' || v_timestamp, 'sha256'), 'hex') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Firma QR inválida');
  END IF;

  SELECT id, role INTO v_verifier_id, v_verifier_role FROM profiles WHERE auth_id = verifier_auth_id;

  IF v_verifier_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Verificador no encontrado');
  END IF;

  IF v_verifier_role NOT IN ('admin', 'merchant') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo comerciantes o administradores pueden verificar');
  END IF;

  SELECT m.*, e.id AS est_id INTO v_mission
  FROM missions m
  JOIN establishments e ON m.establishment_id = e.id
  WHERE m.id = v_mission_id AND m.is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Misión no encontrada o inactiva');
  END IF;

  IF v_verifier_role = 'merchant' THEN
    IF NOT EXISTS (SELECT 1 FROM establishments WHERE id = v_mission.est_id AND owner_id = v_verifier_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'No eres dueño de este establecimiento');
    END IF;
  END IF;

  SELECT * INTO v_existing FROM user_missions
  WHERE user_id = v_user_id AND mission_id = v_mission_id AND status IN ('completed', 'verified');

  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este aventurero ya completó esta misión');
  END IF;

  v_xp_reward := v_mission.xp_reward;
  v_gold_reward := COALESCE(v_mission.gold_reward, 0);
  v_establishment_id := v_mission.est_id;

  INSERT INTO user_missions (user_id, mission_id, status, completed_at, verified_by)
  VALUES (v_user_id, v_mission_id, 'verified', now(), v_verifier_id)
  ON CONFLICT (user_id, mission_id)
  DO UPDATE SET status = 'verified', completed_at = now(), verified_by = v_verifier_id;

  INSERT INTO visits (user_id, establishment_id, mission_id, verified_at, qr_signature)
  VALUES (v_user_id, v_establishment_id, v_mission_id, now(), v_hash);

  UPDATE profiles
  SET xp = xp + v_xp_reward, gold = gold + v_gold_reward
  WHERE id = v_user_id
  RETURNING xp, gold, rank INTO v_new_xp, v_new_gold, v_new_rank;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Misión verificada y completada',
    'xp_awarded', v_xp_reward,
    'gold_awarded', v_gold_reward,
    'new_total_xp', v_new_xp,
    'new_total_gold', v_new_gold,
    'new_rank', v_new_rank,
    'user_id', v_user_id,
    'mission_id', v_mission_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Crear códigos de prueba
INSERT INTO promo_codes (code, type, value, max_uses, for_s_rank_only, is_active) VALUES
  ('BIENVENIDO', 'gold', 100, 1000, false, true),
  ('WELCOME', 'xp', 50, 1000, false, true),
  ('SECRETO', 'gold', 500, 10, true, true)
ON CONFLICT (code) DO NOTHING;

SELECT '¡Actualización completada!' as resultado;