-- ============================================================================
-- GREMIO DE TRAGONES — Migración 010
-- Policies admin ALL para missions, offers, establishments, user_missions, visits
-- Sin esto, el admin no podía INSERT/UPDATE/DELETE (solo SELECT)
-- ============================================================================

-- Helper: is_admin() inline check
-- (La policy 007 ya tiene profiles_admin_all con USING role='admin')

-- Missions: admin puede hacer todo
DROP POLICY IF EXISTS missions_admin_all ON missions;
CREATE POLICY missions_admin_all ON missions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE auth_id = auth.uid() AND role = 'admin')
  );

-- Offers: admin puede hacer todo
DROP POLICY IF EXISTS offers_admin_all ON offers;
CREATE POLICY offers_admin_all ON offers FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE auth_id = auth.uid() AND role = 'admin')
  );

-- Establishments: admin puede hacer todo
DROP POLICY IF EXISTS establishments_admin_all ON establishments;
CREATE POLICY establishments_admin_all ON establishments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE auth_id = auth.uid() AND role = 'admin')
  );

-- User missions: admin puede ver/modificar todo
DROP POLICY IF EXISTS user_missions_admin_all ON user_missions;
CREATE POLICY user_missions_admin_all ON user_missions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE auth_id = auth.uid() AND role = 'admin')
  );

-- Visits: admin puede ver/insertar todo
DROP POLICY IF EXISTS visits_admin_all ON visits;
CREATE POLICY visits_admin_all ON visits FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE auth_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE auth_id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- FIN
-- ============================================================================
