export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          auth_id: string | null
          email: string | null
          full_name: string | null
          role: 'adventurer' | 'merchant' | 'admin'
          xp: number
          gold: number
          rank: string
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_id?: string | null
          email?: string | null
          full_name?: string | null
          role?: 'adventurer' | 'merchant' | 'admin'
          xp?: number
          gold?: number
          rank?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_id?: string | null
          email?: string | null
          full_name?: string | null
          role?: 'adventurer' | 'merchant' | 'admin'
          xp?: number
          gold?: number
          rank?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      establishments: {
        Row: {
          id: string
          name: string
          description: string | null
          image_url: string | null
          owner_id: string | null
          address: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          image_url?: string | null
          owner_id?: string | null
          address?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          image_url?: string | null
          owner_id?: string | null
          address?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      missions: {
        Row: {
          id: string
          establishment_id: string
          title: string
          description: string | null
          xp_reward: number
          gold_reward: number
          required_min_rank: string
          mission_type: 'bebida' | 'comida' | 'visita' | 'reto'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          establishment_id: string
          title: string
          description?: string | null
          xp_reward?: number
          gold_reward?: number
          required_min_rank?: string
          mission_type?: 'bebida' | 'comida' | 'visita' | 'reto'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          establishment_id?: string
          title?: string
          description?: string | null
          xp_reward?: number
          gold_reward?: number
          required_min_rank?: string
          mission_type?: 'bebida' | 'comida' | 'visita' | 'reto'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_missions: {
        Row: {
          id: string
          user_id: string
          mission_id: string
          status: 'pending' | 'completed' | 'verified'
          completed_at: string | null
          verified_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          mission_id: string
          status?: 'pending' | 'completed' | 'verified'
          completed_at?: string | null
          verified_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          mission_id?: string
          status?: 'pending' | 'completed' | 'verified'
          completed_at?: string | null
          verified_by?: string | null
          created_at?: string
        }
      }
      offers: {
        Row: {
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
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          establishment_id: string
          title: string
          description?: string | null
          type?: string
          value?: string | null
          required_rank?: string
          valid_until?: string | null
          is_active?: boolean
          gold_cost?: number
          frequency?: 'once' | 'daily' | 'weekly'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          establishment_id?: string
          title?: string
          description?: string | null
          type?: string
          value?: string | null
          required_rank?: string
          valid_until?: string | null
          is_active?: boolean
          gold_cost?: number
          frequency?: 'once' | 'daily' | 'weekly'
          created_at?: string
          updated_at?: string
        }
      }
      visits: {
        Row: {
          id: string
          user_id: string
          establishment_id: string
          mission_id: string | null
          verified_at: string
          qr_signature: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          establishment_id: string
          mission_id?: string | null
          verified_at?: string
          qr_signature?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          establishment_id?: string
          mission_id?: string | null
          verified_at?: string
          qr_signature?: string | null
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: {
      verify_and_complete_mission: {
        Args: { payload: Record<string, unknown>; verifier_auth_id: string }
        Returns: { success: boolean; error?: string; message?: string; xp_awarded?: number; gold_awarded?: number; new_total_xp?: number; new_total_gold?: number; new_rank?: string }
      }
      verify_and_redeem_offer: {
        Args: { payload: Record<string, unknown>; verifier_auth_id: string }
        Returns: { success: boolean; error?: string; message?: string; gold_spent?: number; remaining_gold?: number; offer_title?: string; required?: number; available?: number }
      }
      migrate_guest_progress: {
        Args: { p_auth_id: string; p_guest_xp?: number }
        Returns: { success: boolean; profile_id?: string; xp?: number; rank?: string; migrated?: boolean }
      }
      use_promo_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: { success: boolean; error?: string; type?: 'gold' | 'xp'; value?: number; message?: string }
      }
      redeem_offer: {
        Args: { payload: Record<string, unknown>; verifier_auth_id: string }
        Returns: { success: boolean; error?: string; message?: string; gold_spent?: number; remaining_gold?: number; offer_title?: string; required?: number; available?: number }
      }
      claim_welcome_bonus: {
        Args: { p_auth_id: string }
        Returns: { success: boolean; error?: string; xp_awarded?: number; new_total_xp?: number; new_rank?: string }
      }
      get_merchant_establishments: {
        Args: { p_auth_id: string }
        Returns: Array<{ id: string; name: string; description: string | null; address: string | null; image_url: string | null; is_active: boolean; created_at: string }>
      }
    }
    Enums: {
      app_role: 'adventurer' | 'merchant' | 'admin'
      mission_status: 'pending' | 'completed' | 'verified'
      offer_type: 'free_item' | 'discount' | 'exclusive' | 'other'
    }
  }
}

