-- ============================================================================
-- Fix 001: Arreglar tipo de retorno de get_merchant_establishments
-- ============================================================================
-- El problema: establishments.name es VARCHAR(255) pero la función declara TEXT
-- Solución: usar %TYPE para que coincida con el tipo exacto de la columna
-- ============================================================================

DROP FUNCTION IF EXISTS get_merchant_establishments(UUID);

CREATE OR REPLACE FUNCTION get_merchant_establishments(p_auth_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
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

SELECT 'Fix 001 aplicado' AS resultado;
