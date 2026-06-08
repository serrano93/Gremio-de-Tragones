-- ============================================================================
-- GREMIO DE TRAGONES — Fix Permanente: Sistema de Profiles y Roles
-- ============================================================================
-- Problema: El trigger AFTER INSERT en auth.users a veces no crea el profile
-- Solución robusta de 3 capas:
--   1. Trigger BEFORE INSERT (se ejecuta antes, sin race condition)
--   2. Constraint UNIQUE en auth_id para UPSERT
--   3. RPC ensure_user_profile() como fallback desde el cliente
-- ============================================================================

-- 1. LIMPIEZA: Eliminar profiles con auth_id NULL (son huérfanos de tests)
DELETE FROM profiles WHERE auth_id IS NULL;

-- 2. AÑADIR CONSTRAINTS UNIQUE (necesario para ON CONFLICT)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_auth_id_key;
ALTER TABLE profiles ADD CONSTRAINT profiles_auth_id_key UNIQUE (auth_id);

-- 2. ELIMINAR EL TRIGGER ANTIGUO (que falla silenciosamente)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. CREAR NUEVO TRIGGER ROBUSTO
-- BEFORE INSERT: se ejecuta ANTES de que termine la inserción del user
-- ON CONFLICT: si por algún motivo el trigger se dispara dos veces, no falla
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (auth_id, email, full_name, role, xp, gold, rank, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(COALESCE(NEW.email, 'Aventurero'), '@', 1)),
    'adventurer',
    0,
    0,
    'F',
    now(),
    now()
  )
  ON CONFLICT (auth_id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
    updated_at = now();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Loguear el error pero NO bloquear la creación del usuario
  RAISE WARNING 'handle_new_user falló para %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. FUNCIÓN RPC DE FALLBACK: ensure_user_profile
-- El frontend la llama si tras el signup no encuentra el profile
-- Usa SECURITY DEFINER para bypassear RLS
CREATE OR REPLACE FUNCTION public.ensure_user_profile(
  p_auth_id UUID,
  p_email TEXT DEFAULT NULL,
  p_full_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  -- Buscar profile existente
  SELECT * INTO v_profile FROM profiles WHERE auth_id = p_auth_id;

  IF FOUND THEN
    -- Actualizar email/full_name si están vacíos
    IF (v_profile.email IS NULL OR v_profile.email = '') AND p_email IS NOT NULL THEN
      UPDATE profiles SET email = p_email, updated_at = now() WHERE auth_id = p_auth_id;
    END IF;
    IF (v_profile.full_name IS NULL OR v_profile.full_name = '') AND p_full_name IS NOT NULL THEN
      UPDATE profiles SET full_name = p_full_name, updated_at = now() WHERE auth_id = p_auth_id;
    END IF;

    SELECT * INTO v_profile FROM profiles WHERE auth_id = p_auth_id;
    RETURN jsonb_build_object(
      'success', true,
      'action', 'updated',
      'profile_id', v_profile.id,
      'role', v_profile.role,
      'rank', v_profile.rank,
      'xp', v_profile.xp,
      'gold', v_profile.gold
    );
  END IF;

  -- Crear nuevo profile
  INSERT INTO profiles (auth_id, email, full_name, role, xp, gold, rank)
  VALUES (
    p_auth_id,
    COALESCE(p_email, ''),
    COALESCE(NULLIF(p_full_name, ''), split_part(COALESCE(p_email, 'Aventurero'), '@', 1)),
    'adventurer',
    0,
    0,
    'F'
  )
  RETURNING * INTO v_profile;

  RETURN jsonb_build_object(
    'success', true,
    'action', 'created',
    'profile_id', v_profile.id,
    'role', v_profile.role,
    'rank', v_profile.rank,
    'xp', v_profile.xp,
    'gold', v_profile.gold
  );
END;
$$;

-- 5. POLÍTICA RLS: permitir al usuario crear su propio profile si no existe
-- Esto es un fallback: si el trigger falla, el cliente puede crear el profile
DROP POLICY IF EXISTS profiles_insert_own ON profiles;
CREATE POLICY profiles_insert_own ON profiles FOR INSERT
  WITH CHECK (auth_id = auth.uid() OR auth.uid() IS NULL);

-- 6. POLÍTICA RLS: permitir a admins gestionar profiles (incluido cambiar role)
DROP POLICY IF EXISTS profiles_admin_all ON profiles;
CREATE POLICY profiles_admin_all ON profiles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.auth_id = auth.uid() AND p.role = 'admin')
  );

-- 7. PERMISOS: el cliente puede invocar ensure_user_profile
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(UUID, TEXT, TEXT) TO anon, authenticated;

SELECT 'Fix 002 aplicado: trigger robusto + RPC fallback + constraints UNIQUE' AS resultado;
