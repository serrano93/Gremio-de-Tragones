// ============================================================================
// GAME API — Cliente REST para los minijuegos
// NO usa el cliente Supabase JS (para no contaminar el bundle principal).
// Hace REST calls directos con la anon key + token del localStorage.
// ============================================================================

import {
  supabaseUrlValue as supabaseUrl,
  supabaseAnonKeyValue as supabaseAnonKey,
  getStoredSession,
} from './supabase'
import type { MinigameId } from './game-rewards'

export interface ClaimRewardResult {
  success: boolean
  score_id?: string
  xp_awarded?: number
  gold_awarded?: number
  new_xp?: number
  new_gold?: number
  new_rank?: string
  error?: string
}

export async function claimMinigameReward(
  minigame: MinigameId,
  xp: number,
  gold: number,
  score: number,
  metadata: Record<string, unknown> = {}
): Promise<ClaimRewardResult> {
  const session = getStoredSession()
  const headers: Record<string, string> = {
    'apikey': supabaseAnonKey,
    'Content-Type': 'application/json',
  }
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/claim_minigame_reward`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        p_minigame: minigame,
        p_xp: xp,
        p_gold: gold,
        p_score: score,
        p_metadata: metadata,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorBody.message || `HTTP ${response.status}`,
      }
    }

    return await response.json()
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error desconocido',
    }
  }
}

export async function getMinigameHighscore(minigame: MinigameId): Promise<number> {
  const session = getStoredSession()
  const headers: Record<string, string> = {
    'apikey': supabaseAnonKey,
    'Content-Type': 'application/json',
  }
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_minigame_highscore`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_minigame: minigame }),
    })

    if (!response.ok) return 0
    const data = await response.json()
    return typeof data === 'number' ? data : 0
  } catch {
    return 0
  }
}

export function isUserLoggedIn(): boolean {
  return getStoredSession() !== null
}

export function getCurrentUserId(): string | null {
  return getStoredSession()?.user.id ?? null
}

export async function getCurrentUserGold(): Promise<number> {
  const session = getStoredSession()
  if (session?.access_token && session.user?.id) {
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/profiles?select=gold&auth_id=eq.${session.user.id}&limit=1`,
        {
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )
      if (!response.ok) return 0
      const rows = (await response.json()) as Array<{ gold: number | null }>
      return rows[0]?.gold ?? 0
    } catch {
      return 0
    }
  }
  try {
    const localforage = (await import('localforage')).default
    const profile = (await localforage.getItem<{ xp: number; gold: number }>('guestProfile'))
    return profile?.gold ?? 0
  } catch {
    return 0
  }
}
