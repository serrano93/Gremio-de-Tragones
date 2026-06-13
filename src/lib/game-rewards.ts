// ============================================================================
// GAME REWARDS — Tabla de recompensas para los minijuegos
// ============================================================================

export type MinigameId = 'roulette' | 'flight' | 'hoard'

export interface RouletteResult {
  id: string
  label: string
  xp: number
  gold: number
  weight: number
}

export const ROULETTE_RESULTS: RouletteResult[] = [
  { id: 'xp5',   label: '5 XP',         xp: 5,    gold: 0,    weight: 20 },
  { id: 'xp10',  label: '10 XP',        xp: 10,   gold: 0,    weight: 20 },
  { id: 'xp15',  label: '15 XP',        xp: 15,   gold: 0,    weight: 15 },
  { id: 'xp30',  label: '30 XP',        xp: 30,   gold: 0,    weight: 8 },
  { id: 'xp50',  label: '50 XP',        xp: 50,   gold: 0,    weight: 5 },
  { id: 'g50',   label: '50 oro',       xp: 0,    gold: 50,   weight: 15 },
  { id: 'g100',  label: '100 oro',      xp: 0,    gold: 100,  weight: 8 },
  { id: 'g200',  label: '200 oro',      xp: 0,    gold: 200,  weight: 5 },
  { id: 'g300',  label: '300 oro',      xp: 0,    gold: 300,  weight: 3 },
  { id: 'jp1k',  label: 'JACKPOT 1000', xp: 0,    gold: 1000, weight: 1 },
]

export const ROULETTE_SPIN_COST = 10

export const ROULETTE_COOLDOWN_MS = 5 * 60 * 1000

// Dragon's Flight: 5 XP por punto, 1 oro cada 5 puntos
export const FLIGHT_XP_PER_POINT = 5
export const FLIGHT_GOLD_PER_5_POINTS = 1
export const FLIGHT_BONUS_50_XP = 50
export const FLIGHT_BONUS_50_GOLD = 200
export const FLIGHT_BONUS_100_XP = 200
export const FLIGHT_BONUS_100_GOLD = 1000

// Dragon's Hoard: idle game con upgrades
export const HOARD_LEVELS: Array<{ level: number; cost: number; goldPerMin: number; label: string }> = [
  { level: 1, cost: 0,     goldPerMin: 1,  label: 'Cueva pequeña' },
  { level: 2, cost: 500,   goldPerMin: 3,  label: 'Cueva espaciosa' },
  { level: 3, cost: 2000,  goldPerMin: 7,  label: 'Caverna del Wyrm' },
  { level: 4, cost: 5000,  goldPerMin: 15, label: 'Guarida ancestral' },
  { level: 5, cost: 15000, goldPerMin: 30, label: 'Monte del Dragón' },
]

export const HOARD_MAX_OFFLINE_MS = 12 * 60 * 60 * 1000

export function calculateFlightReward(score: number): { xp: number; gold: number } {
  const xp = score * FLIGHT_XP_PER_POINT
  const gold = Math.floor(score / 5) * FLIGHT_GOLD_PER_5_POINTS
  let bonusXp = 0
  let bonusGold = 0
  if (score >= 100) {
    bonusXp = FLIGHT_BONUS_100_XP
    bonusGold = FLIGHT_BONUS_100_GOLD
  } else if (score >= 50) {
    bonusXp = FLIGHT_BONUS_50_XP
    bonusGold = FLIGHT_BONUS_50_GOLD
  }
  return { xp: xp + bonusXp, gold: gold + bonusGold }
}

export function pickRouletteResult(): RouletteResult {
  const totalWeight = ROULETTE_RESULTS.reduce((sum, r) => sum + r.weight, 0)
  let pick = Math.random() * totalWeight
  for (const result of ROULETTE_RESULTS) {
    pick -= result.weight
    if (pick <= 0) return result
  }
  return ROULETTE_RESULTS[ROULETTE_RESULTS.length - 1]
}
