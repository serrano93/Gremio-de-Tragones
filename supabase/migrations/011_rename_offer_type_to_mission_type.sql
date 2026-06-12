-- ============================================================================
-- GREMIO DE TRAGONES — Migración 011
-- Renombrar missions.offer_type -> missions.mission_type con valores nuevos
-- Los nuevos valores son útiles para el jugador: bebida/comida/visita/reto
-- ============================================================================

-- Paso 1: Renombrar la columna
ALTER TABLE missions RENAME COLUMN offer_type TO mission_type;

-- Paso 2: Migrar los datos existentes a los nuevos valores
UPDATE missions SET mission_type = CASE mission_type
  WHEN 'free_item'  THEN 'bebida'
  WHEN 'discount'   THEN 'comida'
  WHEN 'exclusive'  THEN 'visita'
  WHEN 'other'      THEN 'reto'
  ELSE 'reto'
END;

-- Paso 3: Añadir constraint con los nuevos valores permitidos
ALTER TABLE missions DROP CONSTRAINT IF EXISTS missions_offer_type_check;
ALTER TABLE missions DROP CONSTRAINT IF EXISTS missions_mission_type_check;
ALTER TABLE missions ADD CONSTRAINT missions_mission_type_check
  CHECK (mission_type IN ('bebida', 'comida', 'visita', 'reto'));

-- Default: si por lo que sea queda null en alguna fila, asignar 'reto'
UPDATE missions SET mission_type = 'reto' WHERE mission_type IS NULL;
ALTER TABLE missions ALTER COLUMN mission_type SET DEFAULT 'reto';
ALTER TABLE missions ALTER COLUMN mission_type SET NOT NULL;

-- ============================================================================
-- FIN
-- ============================================================================
