-- ============================================================================
-- Fix Permanente 003: Eliminar recursión infinita en políticas de profiles
-- ============================================================================
-- Problema: profiles_admin_all hacia SELECT en profiles dentro de USING,
--           causando recursión infinita.
-- Solución: leer el role directamente del JWT (auth.jwt()).
-- Como el JWT por defecto no tiene role, usamos email como proxy de admin
-- (es la única cuenta admin, así que es seguro).
-- ============================================================================

DROP POLICY IF EXISTS profiles_admin_all ON profiles;
DROP POLICY IF EXISTS profiles_insert_own ON profiles;
DROP POLICY IF EXISTS profiles_update_own ON profiles;
DROP POLICY IF EXISTS profiles_select_all ON profiles;
DROP POLICY IF EXISTS profiles_select_own ON profiles;

-- SELECT: cualquiera puede leer profiles
CREATE POLICY profiles_select_all ON profiles FOR SELECT USING (true);

-- INSERT: usuario crea su propio profile
CREATE POLICY profiles_insert_own ON profiles FOR INSERT
  WITH CHECK (auth_id = auth.uid());

-- UPDATE: usuario actualiza su propio profile, o admin (email) actualiza cualquiera
CREATE POLICY profiles_update_all ON profiles FOR UPDATE
  USING (
    auth_id = auth.uid()
    OR auth.jwt() ->> 'email' = 'admin@gremio.com'
  )
  WITH CHECK (
    auth_id = auth.uid()
    OR auth.jwt() ->> 'email' = 'admin@gremio.com'
  );

-- DELETE: solo admin puede borrar profiles
CREATE POLICY profiles_delete_admin ON profiles FOR DELETE
  USING (auth.jwt() ->> 'email' = 'admin@gremio.com');

SELECT 'Fix 003 aplicado: recursión eliminada' AS resultado;
