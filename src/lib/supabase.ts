import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://xzgsjedajlyesnzciwva.supabase.co'
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6Z3NqZWRhamx5ZXNuemNpd3ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMjYzMTIsImV4cCI6MjA5NDcwMjMxMn0.doSi_i5i8If1Px9G34BnveT0RdJHG5_MTeWaUVT6XaE'

export const supabaseUrlValue = supabaseUrl
export const supabaseAnonKeyValue = supabaseAnonKey

let supabaseInstance: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        flowType: 'implicit',
      },
    })
  }
  return supabaseInstance
}

export const supabase = getSupabase()

if (typeof window !== 'undefined') {
  ;(window as unknown as { __supabase: SupabaseClient }).__supabase = supabase
}

export const PROJECT_REF = 'xzgsjedajlyesnzciwva'
export const AUTH_STORAGE_KEY = 'sb-' + PROJECT_REF + '-auth-token'

export interface StoredSession {
  access_token: string
  refresh_token: string
  expires_at: number
  expires_in: number
  token_type: string
  user: {
    id: string
    aud: string
    role: string
    email: string
    email_confirmed_at?: string
    phone?: string
    app_metadata: Record<string, unknown>
    user_metadata: Record<string, unknown>
    identities?: unknown[]
    created_at: string
    updated_at: string
  }
}

export function getStoredSession(): StoredSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredSession
  } catch {
    return null
  }
}

export function clearStoredSession() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch {}
}

export interface RestError {
  message: string
  code?: string
}

export async function restQuery<T = unknown>(
  table: string,
  params: {
    select?: string
    filters?: Record<string, string>
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    body?: unknown
    prefer?: string
    signal?: AbortSignal
  } = {}
): Promise<{ data: T | null; error: RestError | null }> {
  const url = new URL(`${supabaseUrlValue}/rest/v1/${table}`)
  if (params.select) url.searchParams.set('select', params.select)
  if (params.filters) {
    for (const [k, v] of Object.entries(params.filters)) {
      url.searchParams.set(k, v)
    }
  }

  const session = getStoredSession()
  const headers: Record<string, string> = {
    'apikey': supabaseAnonKeyValue,
    'Content-Type': 'application/json',
  }
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  if (params.prefer) {
    headers['Prefer'] = params.prefer
  }

  const fetchOptions: RequestInit = {
    method: params.method || 'GET',
    headers,
  }
  if (params.signal) fetchOptions.signal = params.signal
  if (params.body) fetchOptions.body = JSON.stringify(params.body)

  try {
    const res = await fetch(url.toString(), fetchOptions)
    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}`
      try {
        const errBody = await res.json()
        errorMsg = errBody.message || errBody.error_description || errorMsg
      } catch {}
      return { data: null, error: { message: errorMsg, code: String(res.status) } }
    }
    if (res.status === 204) {
      return { data: null, error: null }
    }
    const data = await res.json()
    return { data: data as T, error: null }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { data: null, error: { message: 'Cancelado' } }
    }
    return { data: null, error: { message: (err as Error).message } }
  }
}

export async function restRpc<T = unknown>(
  functionName: string,
  args: Record<string, unknown> = {},
  signal?: AbortSignal
): Promise<{ data: T | null; error: RestError | null }> {
  const session = getStoredSession()
  const headers: Record<string, string> = {
    'apikey': supabaseAnonKeyValue,
    'Authorization': `Bearer ${session?.access_token || supabaseAnonKeyValue}`,
    'Content-Type': 'application/json',
  }

  try {
    const res = await fetch(`${supabaseUrlValue}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(args),
      signal,
    })
    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}`
      try {
        const errBody = await res.json()
        errorMsg = errBody.message || errBody.error_description || errorMsg
      } catch {}
      return { data: null, error: { message: errorMsg, code: String(res.status) } }
    }
    const data = await res.json()
    return { data: data as T, error: null }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { data: null, error: { message: 'Cancelado' } }
    }
    return { data: null, error: { message: (err as Error).message } }
  }
}
