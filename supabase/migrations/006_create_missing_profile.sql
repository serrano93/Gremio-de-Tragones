-- Fix para crear el profile del aventurero de prueba que el trigger no creó
INSERT INTO profiles (auth_id, email, full_name, role, xp, gold, rank)
VALUES (
  'a46d157f-c0e5-4b4f-9434-900aa800afd1',
  'aventurero@test.com',
  'Aventurero Test',
  'adventurer',
  50,
  200,
  'F'
)
ON CONFLICT (auth_id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  xp = EXCLUDED.xp,
  gold = EXCLUDED.gold;

SELECT 'Profile de aventurero creado' AS resultado;
