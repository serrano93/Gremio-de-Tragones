-- ============================================================================
-- GREMIO DE TRAGONES — Migración 012
-- Sistema de minijuegos: tabla de scores + RPC para reclamar rewards
-- ============================================================================

-- Tabla: minigame_scores
-- Guarda el historial de partidas de cada usuario
CREATE TABLE IF NOT EXISTS minigame_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  minigame VARCHAR(20) NOT NULL CHECK (minigame IN ('roulette', 'flight', 'hoard')),
  score INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  gold_earned INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_minigame_scores_user ON minigame_scores(user_id, minigame);
CREATE INDEX IF NOT EXISTS idx_minigame_scores_leaderboard ON minigame_scores(minigame, score DESC);
CREATE INDEX IF NOT EXISTS idx_minigame_scores_created ON minigame_scores(created_at DESC);

-- RLS
ALTER TABLE minigame_scores ENABLE ROW LEVEL SECURITY;

-- Users pueden leer todos los scores (para leaderboard)
DROP POLICY IF EXISTS minigame_scores_select_all ON minigame_scores;
CREATE POLICY minigame_scores_select_all ON minigame_scores FOR SELECT USING (true);

-- Users insertan sus propios scores (validados por auth.uid())
DROP POLICY IF EXISTS minigame_scores_insert_own ON minigame_scores;
CREATE POLICY minigame_scores_insert_own ON minigame_scores FOR INSERT WITH CHECK (
  user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid())
);

-- Función: reclamar reward de minijuego (atómico)
-- Se usa desde el cliente del minijuego para sumar XP/oro
-- y guardar el score en una transacción
CREATE OR REPLACE FUNCTION claim_minigame_reward(
  p_minigame VARCHAR(20),
  p_xp INTEGER,
  p_gold INTEGER,
  p_score INTEGER DEFAULT 0,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_id UUID;
  v_user_id UUID;
  v_new_xp INTEGER;
  v_new_gold INTEGER;
  v_new_rank VARCHAR(1);
  v_score_id UUID;
BEGIN
  -- Get user_id and profile_id from auth
  SELECT u.id, p.id INTO v_user_id, v_profile_id
  FROM auth.users u
  JOIN profiles p ON p.auth_id = u.id
  WHERE u.id = auth.uid();

  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Perfil no encontrado');
  END IF;

  -- Validate inputs
  IF p_xp < 0 OR p_gold < 0 OR p_score < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Valores inválidos (negativos)');
  END IF;

  IF p_minigame NOT IN ('roulette', 'flight', 'hoard') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Minijuego inválido');
  END IF;

  -- Insert score
  INSERT INTO minigame_scores (user_id, minigame, score, xp_earned, gold_earned, metadata)
  VALUES (v_profile_id, p_minigame, p_score, p_xp, p_gold, p_metadata)
  RETURNING id INTO v_score_id;

  -- Award XP and gold
  UPDATE profiles
  SET xp = xp + p_xp, gold = gold + p_gold, updated_at = now()
  WHERE id = v_profile_id
  RETURNING xp, gold, rank INTO v_new_xp, v_new_gold, v_new_rank;

  RETURN jsonb_build_object(
    'success', true,
    'score_id', v_score_id,
    'xp_awarded', p_xp,
    'gold_awarded', p_gold,
    'new_xp', v_new_xp,
    'new_gold', v_new_gold,
    'new_rank', v_new_rank
  );
END;
$$;

-- Función: obtener highscore del usuario en un minijuego
CREATE OR REPLACE FUNCTION get_minigame_highscore(
  p_minigame VARCHAR(20)
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_highscore INTEGER := 0;
  v_user_id UUID;
BEGIN
  -- Get user_id from auth
  SELECT u.id INTO v_user_id
  FROM auth.users u
  JOIN profiles p ON p.auth_id = u.id
  WHERE u.id = auth.uid();

  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Get max score for this user and minigame
  SELECT COALESCE(MAX(score), 0) INTO v_highscore
  FROM minigame_scores
  WHERE user_id = v_user_id
    AND minigame = p_minigame;

  RETURN v_highscore;
END;
$$;

-- ============================================================================
-- FIN
-- ============================================================================
