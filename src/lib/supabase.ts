import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || ''
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || ''

console.log('🔑 Supabase URL:', supabaseUrl ? 'SET' : 'MISSING')
console.log('🔑 Supabase Key:', supabaseAnonKey ? 'SET (' + supabaseAnonKey.substring(0, 20) + '...)' : 'MISSING')

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
