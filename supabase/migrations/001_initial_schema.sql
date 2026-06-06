-- ============================================================================
-- GREMIO DE TRAGONES — Migración Limpia
-- Solo crea cosas, no borra nada. Si existe, salta (IF NOT EXISTS)
-- ============================================================================

-- ============================================================================
-- EXTENSIONES
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUM TYPES (IF NOT EXISTS para evitar error si ya existen)
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('adventurer', 'merchant', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE mission_status AS ENUM ('pending', 'completed', 'verified');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE offer_type AS ENUM ('free_item', 'discount', 'exclusive', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- FUNCIÓN: Cálculo de rango
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_rank(xp INTEGER) RETURNS VARCHAR AS $$
BEGIN
  IF xp >= 2500 THEN RETURN 'S';
  ELSIF xp >= 1600 THEN RETURN 'A';
  ELSIF xp >= 1000 THEN RETURN 'B';
  ELSIF xp >= 600 THEN RETURN 'C';
  ELSIF xp >= 300 THEN RETURN 'D';
  ELSIF xp >= 100 THEN RETURN 'E';
  ELSE RETURN 'F';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- TABLAS (todas con CREATE TABLE IF NOT EXISTS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  full_name VARCHAR(255),
  role app_role DEFAULT 'adventurer',
  xp INTEGER DEFAULT 0 CHECK (xp >= 0),
  rank VARCHAR(1) DEFAULT 'F',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS establishments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  xp_reward INTEGER NOT NULL DEFAULT 10 CHECK (xp_reward > 0),
  required_min_rank VARCHAR(1) DEFAULT 'F',
  offer_type offer_type DEFAULT 'other',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  status mission_status DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, mission_id)
);

CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'discount',
  value VARCHAR(100),
  required_rank VARCHAR(1) DEFAULT 'F',
  valid_until DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ DEFAULT now(),
  qr_signature VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_auth_id ON profiles(auth_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_establishments_owner ON establishments(owner_id);
CREATE INDEX IF NOT EXISTS idx_establishments_active ON establishments(is_active);
CREATE INDEX IF NOT EXISTS idx_missions_establishment ON missions(establishment_id);
CREATE INDEX IF NOT EXISTS idx_missions_active ON missions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_missions_user ON user_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_mission ON user_missions(mission_id);
CREATE INDEX IF NOT EXISTS idx_offers_establishment ON offers(establishment_id);
CREATE INDEX IF NOT EXISTS idx_offers_active ON offers(is_active);
CREATE INDEX IF NOT EXISTS idx_visits_user ON visits(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_establishment ON visits(establishment_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_rank_trigger_fn() RETURNS TRIGGER AS $$
BEGIN
  NEW.rank := calculate_rank(NEW.xp);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_rank_trigger ON profiles;
CREATE TRIGGER update_rank_trigger
  BEFORE INSERT OR UPDATE OF xp ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_rank_trigger_fn();

CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (auth_id, email, full_name, role, xp, rank)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Aventurero Anónimo'),
    'adventurer',
    0,
    'F'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_all ON profiles;
DROP POLICY IF EXISTS profiles_select_own ON profiles;
DROP POLICY IF EXISTS profiles_update_own ON profiles;
DROP POLICY IF EXISTS profiles_insert_trigger ON profiles;
CREATE POLICY profiles_select_all ON profiles FOR SELECT USING (true);
CREATE POLICY profiles_select_own ON profiles FOR SELECT USING (true);
CREATE POLICY profiles_update_own ON profiles FOR UPDATE USING (true);
CREATE POLICY profiles_insert_trigger ON profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS establishments_select_all ON establishments;
CREATE POLICY establishments_select_all ON establishments FOR SELECT USING (true);

DROP POLICY IF EXISTS missions_select_all ON missions;
CREATE POLICY missions_select_all ON missions FOR SELECT USING (true);

DROP POLICY IF EXISTS user_missions_all_own ON user_missions;
CREATE POLICY user_missions_all_own ON user_missions FOR ALL USING (true);

DROP POLICY IF EXISTS offers_select_all ON offers;
CREATE POLICY offers_select_all ON offers FOR SELECT USING (true);

DROP POLICY IF EXISTS visits_select_own ON visits;
CREATE POLICY visits_select_own ON visits FOR SELECT USING (true);

-- ============================================================================
-- RPC: verify_and_complete_mission
-- ============================================================================
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
  v_new_xp INTEGER;
  v_new_rank VARCHAR;
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
  v_establishment_id := v_mission.est_id;

  INSERT INTO user_missions (user_id, mission_id, status, completed_at, verified_by)
  VALUES (v_user_id, v_mission_id, 'verified', now(), v_verifier_id)
  ON CONFLICT (user_id, mission_id)
  DO UPDATE SET status = 'verified', completed_at = now(), verified_by = v_verifier_id;

  INSERT INTO visits (user_id, establishment_id, mission_id, verified_at, qr_signature)
  VALUES (v_user_id, v_establishment_id, v_mission_id, now(), v_hash);

  UPDATE profiles
  SET xp = xp + v_xp_reward
  WHERE id = v_user_id
  RETURNING xp, rank INTO v_new_xp, v_new_rank;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Misión verificada y completada',
    'xp_awarded', v_xp_reward,
    'new_total_xp', v_new_xp,
    'new_rank', v_new_rank,
    'user_id', v_user_id,
    'mission_id', v_mission_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RPC: migrate_guest_progress
-- ============================================================================
CREATE OR REPLACE FUNCTION migrate_guest_progress(
  p_auth_id UUID,
  p_guest_xp INTEGER DEFAULT 0
) RETURNS JSONB AS $$
DECLARE
  v_profile_id UUID;
  v_new_xp INTEGER;
  v_new_rank VARCHAR;
BEGIN
  SELECT id, xp INTO v_profile_id, v_new_xp FROM profiles WHERE auth_id = p_auth_id;

  IF v_profile_id IS NULL THEN
    INSERT INTO profiles (auth_id, xp, rank, role)
    VALUES (p_auth_id, p_guest_xp, calculate_rank(p_guest_xp), 'adventurer')
    RETURNING id, xp, rank INTO v_profile_id, v_new_xp, v_new_rank;
    RETURN jsonb_build_object('success', true, 'profile_id', v_profile_id, 'xp', v_new_xp, 'rank', v_new_rank, 'migrated', true);
  END IF;

  IF p_guest_xp >= 100 AND v_new_xp < 100 THEN
    UPDATE profiles SET xp = 100 WHERE id = v_profile_id RETURNING xp, rank INTO v_new_xp, v_new_rank;
  ELSIF p_guest_xp > 0 THEN
    UPDATE profiles SET xp = xp + p_guest_xp WHERE id = v_profile_id RETURNING xp, rank INTO v_new_xp, v_new_rank;
  ELSE
    SELECT xp, rank INTO v_new_xp, v_new_rank FROM profiles WHERE id = v_profile_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'profile_id', v_profile_id, 'xp', v_new_xp, 'rank', v_new_rank, 'migrated', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- NUEVOS CAMPOS: Oro en profiles y missions
-- ============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gold INTEGER DEFAULT 0 CHECK (gold >= 0);
ALTER TABLE missions ADD COLUMN IF NOT EXISTS gold_reward INTEGER DEFAULT 0 CHECK (gold_reward >= 0);

-- ============================================================================
-- NUEVOS CAMPOS: Coste oro y frecuencia en offers
-- ============================================================================
ALTER TABLE offers ADD COLUMN IF NOT EXISTS gold_cost INTEGER DEFAULT 0 CHECK (gold_cost >= 0);
ALTER TABLE offers ADD COLUMN IF NOT EXISTS frequency VARCHAR(20) DEFAULT 'once' CHECK (frequency IN ('once', 'daily', 'weekly'));

-- ============================================================================
-- TABLA: promo_codes
-- ============================================================================
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

-- ============================================================================
-- TABLA: user_promo_codes
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  used_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, promo_code_id)
);

-- ============================================================================
-- TABLA: user_offers
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, offer_id)
);

-- ============================================================================
-- ÍNDICES para nuevas tablas
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_user_promo_codes_user ON user_promo_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_offers_user ON user_offers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_offers_offer ON user_offers(offer_id);

-- ============================================================================
-- RLS para nuevas tablas
-- ============================================================================
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS promo_codes_select ON promo_codes;
CREATE POLICY promo_codes_select ON promo_codes FOR SELECT USING (true);

DROP POLICY IF EXISTS promo_codes_insert_admin ON promo_codes;
CREATE POLICY promo_codes_insert_admin ON promo_codes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS user_promo_codes_own ON user_promo_codes;
CREATE POLICY user_promo_codes_own ON user_promo_codes FOR ALL USING (true);

DROP POLICY IF EXISTS user_offers_own ON user_offers;
CREATE POLICY user_offers_own ON user_offers FOR ALL USING (true);

-- ============================================================================
-- RPC: use_promo_code
-- ============================================================================
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
  -- Buscar el código
  SELECT * INTO v_promo FROM promo_codes
  WHERE code = p_code AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código no encontrado o inactivo');
  END IF;

  -- Verificar caducidad
  IF v_promo.valid_until IS NOT NULL AND v_promo.valid_until < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código caducado');
  END IF;

  -- Verificar usos disponibles
  IF v_promo.current_uses >= v_promo.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código agotado');
  END IF;

  -- Verificar si el usuario ya usó este código
  SELECT * INTO v_existing_use FROM user_promo_codes
  WHERE user_id = p_user_id AND promo_code_id = v_promo.id;

  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ya has usado este código');
  END IF;

  -- Obtener perfil del usuario y verificar rango S
  SELECT *, (rank = 'S') AS is_s INTO v_profile FROM profiles WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;

  -- Verificar restricción S-rank
  IF v_promo.for_s_rank_only AND NOT v_profile.is_s THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este código es solo para miembros de la Taberna Secreta (Rango S)');
  END IF;

  -- Aplicar recompensa
  IF v_promo.type = 'gold' THEN
    UPDATE profiles SET gold = gold + v_promo.value WHERE id = p_user_id;
  ELSIF v_promo.type = 'xp' THEN
    UPDATE profiles SET xp = xp + v_promo.value WHERE id = p_user_id;
  END IF;

  -- Registrar uso
  INSERT INTO user_promo_codes (user_id, promo_code_id) VALUES (p_user_id, v_promo.id);

  -- Incrementar contador
  UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = v_promo.id;

  RETURN jsonb_build_object(
    'success', true,
    'type', v_promo.type,
    'value', v_promo.value,
    'message', CASE WHEN v_promo.type = 'gold' THEN 'Oro añadido' ELSE 'XP añadida' END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RPC: redeem_offer
-- ============================================================================
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

  -- Verificar verificador
  SELECT id, role INTO v_verifier_id, v_verifier_role FROM profiles WHERE auth_id = verifier_auth_id;

  IF v_verifier_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Verificador no encontrado');
  END IF;

  IF v_verifier_role NOT IN ('admin', 'merchant') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solo comerciantes o administradores pueden verificar');
  END IF;

  -- Obtener oferta
  SELECT * INTO v_offer FROM offers WHERE id = v_offer_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Oferta no encontrada o inactiva');
  END IF;

  -- Verificar si el usuario ya canjeó esta oferta
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

  -- Obtener perfil y verificar oro
  SELECT * INTO v_profile FROM profiles WHERE id = v_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;

  IF v_profile.gold < v_offer.gold_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Oro insuficiente', 'required', v_offer.gold_cost, 'available', v_profile.gold);
  END IF;

  -- Descontar oro
  UPDATE profiles SET gold = gold - v_offer.gold_cost WHERE id = v_user_id;

  -- Registrar uso
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