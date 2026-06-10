import { supabaseUrlValue, supabaseAnonKeyValue, type StoredSession } from './supabase'

const PRODUCTION_ORIGIN = 'https://project-1qpk3.vercel.app'
const ANDROID_PACKAGE = 'com.gremio.tragones'

export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  return cap?.isNativePlatform?.() === true
}

export function getOAuthCallbackUrl(): string {
  if (isNativePlatform()) {
    return `${ANDROID_PACKAGE}://auth/callback`
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`
  }
  return `${PRODUCTION_ORIGIN}/auth/callback`
}

export interface GoogleLoginOptions {
  redirectTo?: string
  scopes?: string
}

export function buildGoogleLoginUrl(options: GoogleLoginOptions = {}): string {
  const callback = options.redirectTo || getOAuthCallbackUrl()
  const params = new URLSearchParams({
    provider: 'google',
    redirect_to: callback,
  })
  if (options.scopes) {
    params.set('scopes', options.scopes)
  }
  return `${supabaseUrlValue}/auth/v1/authorize?${params.toString()}`
}

export async function startGoogleLogin(options: GoogleLoginOptions = {}): Promise<void> {
  const url = buildGoogleLoginUrl(options)
  if (isNativePlatform()) {
    try {
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({
        url,
        windowName: '_self',
        presentationStyle: 'popover',
      })
      return
    } catch (err) {
      console.warn('@capacitor/browser not available, falling back to window.location:', err)
    }
  }
  window.location.href = url
}

export interface OAuthCallbackResult {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at: number
  token_type: string
  user: StoredSession['user']
}

export function parseOAuthFragment(hash: string): OAuthCallbackResult | null {
  if (!hash || hash.length < 2) return null
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash
  if (fragment.startsWith('/')) return null
  const params = new URLSearchParams(fragment)
  const access_token = params.get('access_token')
  const refresh_token = params.get('refresh_token')
  if (!access_token || !refresh_token) return null

  const expires_in = Number(params.get('expires_in') || '3600')
  const expires_at = Math.floor(Date.now() / 1000) + expires_in

  const userId = params.get('user_id') || params.get('sub') || ''
  const email = params.get('email') || ''
  const phone = params.get('phone') || undefined
  const provider = params.get('provider') || 'google'
  const providers = provider ? [provider] : ['google']

  const user: StoredSession['user'] = {
    id: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email: email || `${userId}@google.oauth`,
    email_confirmed_at: new Date().toISOString(),
    phone: phone || undefined,
    app_metadata: { provider, providers },
    user_metadata: {
      full_name: params.get('full_name') || params.get('name') || email || 'Aventurero',
      avatar_url: params.get('avatar_url') || params.get('picture') || undefined,
      email: email || undefined,
      provider,
    },
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return {
    access_token,
    refresh_token,
    expires_in,
    expires_at,
    token_type: params.get('token_type') || 'bearer',
    user,
  }
}

export function saveOAuthSession(result: OAuthCallbackResult): void {
  const session: StoredSession = {
    access_token: result.access_token,
    refresh_token: result.refresh_token,
    expires_in: result.expires_in,
    expires_at: result.expires_at,
    token_type: result.token_type,
    user: result.user,
  }
  localStorage.setItem('sb-xzgsjedajlyesnzciwva-auth-token', JSON.stringify(session))
}

export function getOAuthErrorFromUrl(search: string): string | null {
  const params = new URLSearchParams(search)
  const error = params.get('error') || params.get('error_description')
  return error
}

export const OAUTH_DEBUG = {
  supabaseUrl: supabaseUrlValue,
  hasAnonKey: Boolean(supabaseAnonKeyValue),
  callbackUrl: getOAuthCallbackUrl(),
}
