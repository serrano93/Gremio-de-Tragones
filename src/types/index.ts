import type { AppRole, MissionStatus, OfferType } from '../lib/constants'

export type { AppRole, MissionStatus, OfferType }

export interface Profile {
  id: string
  auth_id: string | null
  email: string | null
  full_name: string | null
  role: AppRole
  xp: number
  gold: number
  rank: string
  avatar_url: string | null
  created_at: string
}

export interface Establishment {
  id: string
  name: string
  description: string | null
  image_url: string | null
  owner_id: string | null
  address: string | null
  is_active: boolean
  created_at: string
}

export interface Mission {
  id: string
  establishment_id: string
  title: string
  description: string | null
  xp_reward: number
  gold_reward: number
  required_min_rank: string
  offer_type: OfferType
  is_active: boolean
  created_at: string
  establishment?: Pick<Establishment, 'id' | 'name'>
}

export interface UserMission {
  id: string
  user_id: string
  mission_id: string
  status: MissionStatus
  completed_at: string | null
  verified_by: string | null
  created_at: string
}

export interface Offer {
  id: string
  establishment_id: string
  title: string
  description: string | null
  type: string
  value: string | null
  required_rank: string
  valid_until: string | null
  is_active: boolean
  gold_cost: number
  frequency: 'once' | 'daily' | 'weekly'
  establishment?: Pick<Establishment, 'id' | 'name'>
}

export interface Visit {
  id: string
  user_id: string
  establishment_id: string
  mission_id: string | null
  verified_at: string
  qr_signature: string | null
}

export interface PromoCode {
  id: string
  code: string
  type: 'gold' | 'xp'
  value: number
  max_uses: number
  current_uses: number
  valid_until: string | null
  for_s_rank_only: boolean
  is_active: boolean
  created_at: string
}

export interface UserPromoCode {
  id: string
  user_id: string
  promo_code_id: string
  used_at: string
}

export interface UserOffer {
  id: string
  user_id: string
  offer_id: string
  redeemed_at: string
}

export interface AuthState {
  user: Profile | null
  session: import('@supabase/supabase-js').Session | null
  isLoading: boolean
  isGuest: boolean
}