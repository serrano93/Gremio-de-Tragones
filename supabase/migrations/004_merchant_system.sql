-- ============================================================================
-- GREMIO DE TRAGONES — Sistema de Comerciantes
-- ============================================================================
-- 1. Crear cuenta de comerciante de prueba
-- 2. Función: obtener establecimientos del comerciante
-- 3. RPC: verificar y canjear oferta (mismo flujo que verify_and_complete_mission)
-- ============================================================================

-- 1. Crear usuario comerciante en auth.users
-- La contraseña es 3000hanover (hasheada con crypt, gen_salt bf)
DO $$
DECLARE
  v_user_id UUID;
  v_profile_id UUID;
BEGIN
  -- Solo crear si no existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'comerciante@gremio.com') THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'comerciante@gremio.com',
      crypt('3000hanover', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Comerciante de Prueba"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    -- Crear identity para que el login funcione
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      v_user_id::text,
      format('{"sub":"%s","email":"comerciante@gremio.com","email_verified":false}', v_user_id)::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    -- El trigger handle_new_user creará el profile automáticamente con role='adventurer'
    -- Lo actualizamos a merchant
    UPDATE profiles
    SET role = 'merchant', full_name = 'Comerciante de Prueba', updated_at = now()
    WHERE auth_id = v_user_id;
  END IF;
END $$;

-- 2. Función: obtener establecimientos asignados a un comerciante
CREATE OR REPLACE FUNCTION get_merchant_establishments(p_auth_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  address TEXT,
  image_url TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT e.id, e.name, e.description, e.address, e.image_url, e.is_active, e.created_at
  FROM establishments e
  JOIN profiles p ON p.id = e.owner_id
  WHERE p.auth_id = p_auth_id
  AND e.is_active = true
  ORDER BY e.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC: verificar y canjear OFERTA
CREATE OR REPLACE FUNCTION verify_and_redeem_offer(
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
  v_establishment_id UUID;
  v_existing_redeem RECORD;
  v_profile RECORD;
  v_timestamp_ms BIGINT;
  v_today DATE;
  v_this_week DATE;
  v_gold_cost INTEGER;
BEGIN
  -- Extraer y validar campos del payload
  v_user_id := (payload->>'u')::UUID;
  v_offer_id := (payload->>'o')::UUID;
  v_timestamp := payload->>'t';
  v_hash := payload->>'h';

  IF v_user_id IS NULL OR v_offer_id IS NULL OR v_timestamp IS NULL OR v_hash IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payload incompleto');
  END IF;

  -- Validar expiración (2 minutos)
  v_timestamp_ms := EXTRACT(EPOCH FROM v_timestamp::TIMESTAMPTZ) * 1000;
  IF EXTRACT(EPOCH FROM now()) * 1000 - v_timestamp_ms > 120000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código QR expirado (>2 min)');
  END IF;

  -- Validar firma
  IF v_hash != encode(digest(v_user_id::text || ':' || v_offer_id::text || ':' || v_timestamp, 'sha256'), 'hex') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Firma QR inválida');
  END IF;

  -- Verificar al validador
  SELECT id, role INTO v_verifier_id, v_verifier_role
  FROM profiles WHERE auth_id = verifier_auth_id;

  IF v_verifier_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Verificador no encontrado');
  END IF;

  IF v_verifier_role NOT IN ('admin', 'merchant') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo comerciantes o administradores pueden verificar');
  END IF;

  -- Obtener oferta con su establecimiento
  SELECT o.*, e.id AS est_id, e.owner_id AS est_owner_id
  INTO v_offer
  FROM offers o
  JOIN establishments e ON o.establishment_id = e.id
  WHERE o.id = v_offer_id AND o.is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Oferta no encontrada o inactiva');
  END IF;

  -- Verificar propiedad del establecimiento
  IF v_verifier_role = 'merchant' AND v_offer.est_owner_id != v_verifier_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'No eres dueño de este establecimiento');
  END IF;

  v_establishment_id := v_offer.est_id;
  v_gold_cost := COALESCE(v_offer.gold_cost, 0);

  -- Verificar frecuencia
  IF v_offer.frequency = 'once' THEN
    SELECT * INTO v_existing_redeem FROM user_offers
    WHERE user_id = v_user_id AND offer_id = v_offer_id;
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

  -- Obtener perfil del aventurero
  SELECT * INTO v_profile FROM profiles WHERE id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;

  -- Verificar oro suficiente (si la oferta cuesta)
  IF v_gold_cost > 0 AND v_profile.gold < v_gold_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Oro insuficiente',
      'required', v_gold_cost,
      'available', v_profile.gold
    );
  END IF;

  -- Descontar oro y registrar canje
  UPDATE profiles SET gold = gold - v_gold_cost WHERE id = v_user_id;
  INSERT INTO user_offers (user_id, offer_id) VALUES (v_user_id, v_offer_id);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Oferta canjeada con éxito',
    'gold_spent', v_gold_cost,
    'remaining_gold', v_profile.gold - v_gold_cost,
    'offer_title', v_offer.title
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Política RLS: comerciantes pueden ver las ofertas y misiones de SUS establecimientos
DROP POLICY IF EXISTS merchants_select_own_offers ON offers;
CREATE POLICY merchants_select_own_offers ON offers FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM establishments e
    JOIN profiles p ON p.id = e.owner_id
    WHERE e.id = offers.establishment_id
    AND p.auth_id = auth.uid()
  )
  OR is_active = true
);

DROP POLICY IF EXISTS merchants_insert_own_offers ON offers;
CREATE POLICY merchants_insert_own_offers ON offers FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM establishments e
    JOIN profiles p ON p.id = e.owner_id
    WHERE e.id = offers.establishment_id
    AND p.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS merchants_update_own_offers ON offers;
CREATE POLICY merchants_update_own_offers ON offers FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM establishments e
    JOIN profiles p ON p.id = e.owner_id
    WHERE e.id = offers.establishment_id
    AND p.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS merchants_delete_own_offers ON offers;
CREATE POLICY merchants_delete_own_offers ON offers FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM establishments e
    JOIN profiles p ON p.id = e.owner_id
    WHERE e.id = offers.establishment_id
    AND p.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS merchants_select_own_missions ON missions;
CREATE POLICY merchants_select_own_missions ON missions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM establishments e
    JOIN profiles p ON p.id = e.owner_id
    WHERE e.id = missions.establishment_id
    AND p.auth_id = auth.uid()
  )
  OR is_active = true
);

DROP POLICY IF EXISTS merchants_insert_own_missions ON missions;
CREATE POLICY merchants_insert_own_missions ON missions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM establishments e
    JOIN profiles p ON p.id = e.owner_id
    WHERE e.id = missions.establishment_id
    AND p.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS merchants_update_own_missions ON missions;
CREATE POLICY merchants_update_own_missions ON missions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM establishments e
    JOIN profiles p ON p.id = e.owner_id
    WHERE e.id = missions.establishment_id
    AND p.auth_id = auth.uid()
  )
);

DROP POLICY IF EXISTS merchants_delete_own_missions ON missions;
CREATE POLICY merchants_delete_own_missions ON missions FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM establishments e
    JOIN profiles p ON p.id = e.owner_id
    WHERE e.id = missions.establishment_id
    AND p.auth_id = auth.uid()
  )
);

SELECT 'Migración 004 aplicada: comerciante de prueba + RPC ofertas + RLS' AS resultado;
