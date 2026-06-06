import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://xzgsjedajlyesnzciwva.supabase.co'
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6Z3NqZWRhamx5ZXNuemNpd3ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMjYzMTIsImV4cCI6MjA5NDcwMjMxMn0.doSi_i5i8If1Px9G34BnveT0RdJHG5_MTeWaUVT6XaE'

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Supabase env vars not set, using fallback values')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
})