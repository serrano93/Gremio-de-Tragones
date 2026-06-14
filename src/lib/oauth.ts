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
  flowType?: 'pkce' | 'implicit'
}

export function buildGoogleLoginUrl(options: GoogleLoginOptions = {}): string {
  const callback = options.redirectTo || getOAuthCallbackUrl()
  const params = new URLSearchParams({
    provider: 'google',
    redirect_to: callback,
    flow_type: options.flowType || 'pkce',
  })
  if (options.scopes) {
    params.set('scopes', options.scopes)
  }
  return `${supabaseUrlValue}/auth/v1/authorize?${params.toString()}`
}

export async function startGoogleLogin(options: GoogleLoginOptions = {}): Promise<void> {
  const useImplicit = isNativePlatform()
  const opts: GoogleLoginOptions = useImplicit ? { ...options, flowType: 'implicit' } : options
  const url = buildGoogleLoginUrl(opts)
  if (isNativePlatform()) {
    try {
      const capacitorBrowser = (await import(/* @vite-ignore */ '@capacitor/browser').catch(() => null)) as
        | { Browser?: { open: (opts: { url: string; windowName?: string; presentationStyle?: string }) => Promise<void> } }
        | null
      if (capacitorBrowser?.Browser) {
        await capacitorBrowser.Browser.open({
          url,
          windowName: '_self',
          presentationStyle: 'fullscreen',
        })
        return
      }
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
  return parseTokensFromParams(params)
}

export function parseOAuthSearch(search: string): OAuthCallbackResult | null {
  if (!search || search.length < 2) return null
  const trimmed = search.startsWith('?') ? search.slice(1) : search
  const params = new URLSearchParams(trimmed)
  return parseTokensFromParams(params)
}

function parseTokensFromParams(params: URLSearchParams): OAuthCallbackResult | null {
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

export function getOAuthErrorFromUrl(search: string): {
  error: string | null
  code: string | null
  description: string | null
} {
  const params = new URLSearchParams(search)
  return {
    error: params.get('error'),
    code: params.get('error_code'),
    description: params.get('error_description'),
  }
}

const GOOGLE_CLIENT_ID = '266112995901-e5tqa03g7rgte39bjnr8b5u3v4l5jl6e.apps.googleusercontent.com'

interface GoogleAccountsId {
  initialize: (config: { client_id: string; callback: (response: { credential?: string }) => void; auto_select?: boolean; cancel_on_tap_outside?: boolean; use_fedcm_for_prompt?: boolean }) => void
  prompt: (momentListener?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean; getNotDisplayedReason: () => string; getSkippedReason: () => string }) => void) => void
  renderButton: (parent: HTMLElement, options: { type?: string; theme?: string; size?: string; text?: string; shape?: string }) => void
}

interface GoogleAccounts {
  id: GoogleAccountsId
}

declare global {
  interface Window {
    google?: { accounts: GoogleAccounts }
  }
}

const GIS_LOAD_TIMEOUT_MS = 5000

export function isGoogleIdentityAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean(window.google?.accounts?.id)
}

export function waitForGoogleIdentity(timeoutMs: number = GIS_LOAD_TIMEOUT_MS): Promise<boolean> {
  return new Promise((resolve) => {
    if (isGoogleIdentityAvailable()) {
      resolve(true)
      return
    }
    const start = Date.now()
    const interval = window.setInterval(() => {
      if (isGoogleIdentityAvailable()) {
        window.clearInterval(interval)
        resolve(true)
        return
      }
      if (Date.now() - start >= timeoutMs) {
        window.clearInterval(interval)
        resolve(false)
      }
    }, 100)
  })
}

export interface IdTokenSignInResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at: number
  token_type: string
  user: StoredSession['user']
}

export async function exchangeIdTokenForSession(idToken: string): Promise<IdTokenSignInResponse> {
  const response = await fetch(`${supabaseUrlValue}/auth/v1/token?grant_type=id_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKeyValue,
    },
    body: JSON.stringify({
      provider: 'google',
      id_token: idToken,
    }),
  })

  const text = await response.text()
  if (!response.ok) {
    let errorBody: { error_description?: string; msg?: string; error?: string } = {}
    try {
      errorBody = text ? JSON.parse(text) : {}
    } catch {
      errorBody = { msg: text }
    }
    const message = errorBody.error_description || errorBody.msg || errorBody.error || `HTTP ${response.status}`
    throw new Error(`signInWithIdToken failed: ${message}`)
  }

  const data = text ? JSON.parse(text) : {}
  const userId = data.user?.id || ''
  const email = data.user?.email || ''
  const provider = (data.user?.app_metadata?.provider as string) || 'google'

  const user: StoredSession['user'] = {
    id: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email: email || `${userId}@google.oauth`,
    email_confirmed_at: new Date().toISOString(),
    app_metadata: { provider, providers: [provider] },
    user_metadata: {
      full_name: data.user?.user_metadata?.full_name || data.user?.user_metadata?.name || email || 'Aventurero',
      avatar_url: data.user?.user_metadata?.avatar_url || data.user?.user_metadata?.picture || undefined,
      email: email || undefined,
      provider,
    },
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in || 3600,
    expires_at: data.expires_at || Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    token_type: data.token_type || 'bearer',
    user,
  }
}

export function saveIdTokenSession(result: IdTokenSignInResponse): void {
  saveOAuthSession({
    access_token: result.access_token,
    refresh_token: result.refresh_token,
    expires_in: result.expires_in,
    expires_at: result.expires_at,
    token_type: result.token_type,
    user: result.user,
  })
}

export async function signInWithGoogleGIS(): Promise<IdTokenSignInResponse> {
  if (isNativePlatform()) {
    throw new Error('GIS not available on native platform; use startGoogleLogin instead')
  }

  const ready = await waitForGoogleIdentity()
  if (!ready || !window.google?.accounts?.id) {
    throw new Error('Google Identity Services failed to load. Check ad-blocker or network.')
  }

  return new Promise((resolve, reject) => {
    try {
      window.google!.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          if (!response.credential) {
            reject(new Error('No credential returned from Google'))
            return
          }
          try {
            const session = await exchangeIdTokenForSession(response.credential)
            saveIdTokenSession(session)
            resolve(session)
          } catch (err) {
            reject(err instanceof Error ? err : new Error(String(err)))
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true,
      })

      window.google!.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          const reason = notification.getNotDisplayedReason()
          reject(new Error(`GIS prompt not displayed: ${reason}`))
          return
        }
        if (notification.isSkippedMoment()) {
          const reason = notification.getSkippedReason()
          reject(new Error(`GIS skipped: ${reason}`))
        }
      })
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)))
    }
  })
}

export function getGoogleErrorHint(errorCode: string | null): string {
  if (!errorCode) return ''
  const code = errorCode.toLowerCase()
  if (code.includes('4/0a') || code.includes('unable to exchange')) {
    return 'Google no pudo validar la app. Verifica que el Client ID esté correctamente configurado en Supabase y Google Cloud.'
  }
  if (code.includes('redirect_uri_mismatch')) {
    return 'URL de callback no registrada. Añade la URL de callback en Google Cloud → Credentials → Authorized redirect URIs.'
  }
  if (code.includes('invalid_client') || code.includes('invalid_client_secret')) {
    return 'Client ID o Secret incorrecto. Verifica la configuración en Supabase Dashboard → Authentication → Providers → Google.'
  }
  if (code.includes('access_denied')) {
    return 'Acceso denegado por el usuario. Intenta de nuevo aceptando los permisos.'
  }
  if (code.includes('idpiframe_error') || code.includes('popup_closed')) {
    return 'La ventana de Google se cerró antes de completar el login. Intenta de nuevo.'
  }
  return 'Error desconocido de Google OAuth. Revisa la consola del navegador para más detalles.'
}

export const OAUTH_DEBUG = {
  supabaseUrl: supabaseUrlValue,
  hasAnonKey: Boolean(supabaseAnonKeyValue),
  callbackUrl: getOAuthCallbackUrl(),
}
