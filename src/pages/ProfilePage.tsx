import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useRank } from '../hooks/useRank'
import { useGuestSync } from '../hooks/useGuestSync'
import { RankBadge } from '../components/guild/RankBadge'
import { StoneCard, GoldCard, Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { supabaseUrlValue, supabaseAnonKeyValue, AUTH_STORAGE_KEY, type StoredSession, restRpc } from '../lib/supabase'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, isGuest, refreshProfile, signOut, loadUserFromStoredSession } = useAuth()
  const { rank, rankName } = useRank(user?.xp || 0)
  const { migrateGuestProgress } = useGuestSync()
  const { toast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)

  const handleRegister = async () => {
    if (!email || !password) {
      toast('warning', 'Ingresa email y contraseña')
      return
    }
    if (loading || isRegistering || isLoggingIn) return
    setLoading(true)
    setIsRegistering(true)

    try {
      const res = await fetch(`${supabaseUrlValue}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKeyValue,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          data: { full_name: fullName || email.split('@')[0] },
        }),
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        const errMsg = errBody.msg || errBody.message || `HTTP ${res.status}`

        const isConflict = errBody.error_code === 'user_already_exists' ||
                           errMsg.toLowerCase().includes('already') ||
                           errMsg.toLowerCase().includes('registered')

        if (isConflict) {
          toast('warning', 'Ese email ya está registrado. Inicia sesión.')
        } else {
          toast('error', errMsg)
        }
        return
      }

      const data = await res.json() as { user: { id: string }; session: StoredSession | null }
      if (data.session) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data.session))
      }

      if (data.user?.id) {
        await migrateGuestProgress(data.user.id)
        await refreshProfile()
        toast('success', '¡Bienvenido al Gremio, aventurero!')
      }
    } catch (err: any) {
      toast('error', err?.message || 'Error al registrar')
    } finally {
      setLoading(false)
      setIsRegistering(false)
    }
  }

  const handleLogin = async () => {
    if (!email || !password) {
      toast('warning', 'Ingresa email y contraseña')
      return
    }
    if (loading || isRegistering || isLoggingIn) return
    setLoading(true)
    setIsLoggingIn(true)

    try {
      const res = await fetch(`${supabaseUrlValue}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKeyValue,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        const errMsg = errBody.msg || errBody.error_description || errBody.message || `HTTP ${res.status}`
        toast('error', errMsg)
        return
      }

      const session = await res.json() as StoredSession
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))

      const profileRes = await fetch(
        `${supabaseUrlValue}/rest/v1/profiles?select=*&auth_id=eq.${session.user.id}&limit=1`,
        {
          method: 'GET',
          headers: {
            'apikey': supabaseAnonKeyValue,
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      )

      if (profileRes.ok) {
        const profiles = await profileRes.json()
        if (Array.isArray(profiles) && profiles.length > 0) {
          await refreshProfile()
        }
      }

      window.location.reload()
    } catch (err: any) {
      toast('error', err?.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
      setIsLoggingIn(false)
    }
  }

  const handleGoogleLogin = async () => {
    if (loading) return
    setLoading(true)
    try {
      const { isNativePlatform, waitForGoogleIdentity, signInWithGoogleGIS, startGoogleLogin, getGoogleErrorHint } = await import('../lib/oauth')

      if (!isNativePlatform()) {
        const gisReady = await waitForGoogleIdentity(3000)
        if (gisReady) {
          try {
            await signInWithGoogleGIS()
            const { getStoredSession } = await import('../lib/supabase')
            const newSession = getStoredSession()
            if (newSession) {
              const ok = await loadUserFromStoredSession(newSession)
              if (ok) {
                toast('success', '¡Bienvenido al Gremio!')
                setLoading(false)
                return
              }
              toast('warning', 'Cuenta creada, perfil sincronizando...')
              setTimeout(() => window.location.reload(), 500)
              return
            }
            throw new Error('Session not saved after GIS login')
          } catch (gisErr: any) {
            console.warn('GIS flow failed, falling back to PKCE:', gisErr)
            toast('warning', `Método alternativo: ${getGoogleErrorHint(gisErr?.message || '') || gisErr?.message || 'cargando...'}`, 4000)
          }
        } else {
          console.warn('GIS script not loaded within 3s, falling back to PKCE')
        }
      }

      await startGoogleLogin()
    } catch (err: any) {
      toast('error', err?.message || 'Error con Google')
      setLoading(false)
    }
  }


  const handleLogout = async () => {
    await signOut()
    toast('info', 'Has salido del Gremio. Modo invitado activado.')
  }

  const handleRedeemPromo = async () => {
    if (!promoCode.trim() || !user?.id) return
    setPromoLoading(true)

    try {
      const { data, error } = await restRpc<{
        success: boolean
        error?: string
        type?: 'gold' | 'xp'
        value?: number
        message?: string
      }>('use_promo_code', {
        p_code: promoCode.trim().toUpperCase(),
        p_user_id: user.id,
      })

      setPromoLoading(false)

      if (error) {
        toast('error', 'Error al canjear código')
        return
      }

      if (data?.success) {
        toast('success', `¡Código canjeado! +${data.value} ${data.type === 'gold' ? 'oro' : 'XP'}`)
        setPromoCode('')
        await refreshProfile()
      } else {
        toast('error', data?.error || 'Error al canjear código')
      }
    } catch {
      setPromoLoading(false)
      toast('error', 'Error al canjear código')
    }
  }

  if (isGuest) {
    return (
      <div className="space-y-lg">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary">Baúl</h1>
          <p className="font-label-sm text-outline">Tu identidad en el Reino</p>
        </div>

        <GoldCard>
          <div className="text-center">
            <div className="flex justify-center mb-md">
              <RankBadge rank={rank} size="lg" />
            </div>
            <h2 className="font-title-lg text-title-lg text-on-surface mb-xs">Rango {rank} — Aventurero Invitado</h2>
            <p className="font-label-lg text-label-lg text-outline">{user?.xp || 0} XP</p>
          </div>
        </GoldCard>

        <Card>
          <h3 className="font-title-lg text-title-lg text-on-surface mb-lg text-center">
            Únete al Gremio de Aventureros
          </h3>

          <div className="space-y-md">
            <Button variant="outline" onClick={handleGoogleLogin} className="w-full">
              <span className="material-symbols-outlined">account_circle</span>
              Continuar con Google
            </Button>

            <div className="flex items-center gap-md">
              <div className="flex-1 h-px bg-outline-variant" />
              <span className="font-label-sm text-outline uppercase tracking-wider">o</span>
              <div className="flex-1 h-px bg-outline-variant" />
            </div>

            <div>
              <label className="block font-label-lg text-label-lg mb-xs text-on-surface-variant">Nombre (opcional)</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-md py-sm bg-surface-container border-2 border-outline-variant rounded-lg
                           text-on-surface placeholder:text-outline font-label-lg
                           focus:outline-none focus:border-primary-container min-h-[48px]"
                placeholder="Tu nombre de aventurero"
              />
            </div>
            <div>
              <label className="block font-label-lg text-label-lg mb-xs text-on-surface-variant">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-md py-sm bg-surface-container border-2 border-outline-variant rounded-lg
                           text-on-surface placeholder:text-outline font-label-lg
                           focus:outline-none focus:border-primary-container min-h-[48px]"
                placeholder="aventurero@reino.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block font-label-lg text-label-lg mb-xs text-on-surface-variant">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-md py-sm bg-surface-container border-2 border-outline-variant rounded-lg
                           text-on-surface placeholder:text-outline font-label-lg
                           focus:outline-none focus:border-primary-container min-h-[48px]"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <div className="flex gap-xs">
              <Button variant="gold" size="sm" onClick={handleRegister} isLoading={loading && isRegistering} className="flex-1 whitespace-nowrap">
                Regístrate
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogin} isLoading={loading && isLoggingIn} className="flex-1 whitespace-nowrap">
                Inicia Sesión
              </Button>
            </div>

            <p className="font-label-sm text-outline text-center">
              Al registrarte, tu progreso de invitado se sincronizará. Si tienes 100+ XP, obtendrás Rango E.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-lg">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-primary">Baúl</h1>
        <p className="font-label-sm text-outline">Tu identidad en el Reino</p>
      </div>

      <StoneCard className="p-lg">
        <div className="w-20 h-20 rounded-full border-2 border-primary flex items-center justify-center mb-md mx-auto bg-surface-container">
          <span className="material-symbols-outlined text-primary text-4xl">person</span>
        </div>
        <div className="text-center">
          <h2 className="font-title-lg text-title-lg text-on-surface">
            {user?.full_name || 'Aventurero'}
          </h2>
          <p className="font-label-lg text-outline flex items-center justify-center gap-xs mt-xs">
            <span className="material-symbols-outlined text-sm">mail</span>
            {user?.email || 'Sin email'}
          </p>
        </div>
      </StoneCard>

      <StoneCard className="p-lg">
        <div className="flex items-center gap-lg mb-md">
          <RankBadge rank={rank} size="md" />
          <div>
            <p className="font-title-lg text-title-lg text-on-surface">{rankName}</p>
            <p className="font-label-lg text-primary">{user?.xp || 0} XP</p>
          </div>
        </div>
        {rank === 'S' && (
          <div className="flex items-center gap-xs text-primary font-label-lg">
            <span className="material-symbols-outlined animate-flicker">star</span>
            Señor Dragón — Rango máximo
          </div>
        )}
      </StoneCard>

      <StoneCard className="p-lg">
        <div className="flex items-center justify-between mb-md">
          <span className="font-title-lg text-title-lg text-on-surface">Tu Oro</span>
          <span className="font-headline-lg text-headline-lg text-primary flex items-center gap-sm">
            <span className="material-symbols-outlined">payments</span>
            {user?.gold ?? 0}
          </span>
        </div>
      </StoneCard>

      <Card>
        <h3 className="font-title-lg text-title-lg text-on-surface mb-md">Canjear Código Promocional</h3>
        {isGuest || rank === 'F' ? (
          <p className="font-body-md text-outline">
            Los códigos promocionales son solo para aventureros registrados (Rango E o superior).
          </p>
        ) : (
          <div className="space-y-md">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              className="w-full px-md py-sm bg-surface-container border-2 border-outline-variant rounded-lg
                         text-on-surface placeholder:text-outline font-label-lg
                         focus:outline-none focus:border-primary-container min-h-[48px] uppercase"
              placeholder="Código (ej: BIENVENIDO2024)"
            />
            <Button variant="gold" onClick={handleRedeemPromo} isLoading={promoLoading} disabled={!promoCode.trim()} className="w-full">
              Canjear
            </Button>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-md">
        <Card hover onClick={() => navigate('/guild')}>
          <span className="material-symbols-outlined text-primary text-2xl mb-sm">military_tech</span>
          <p className="font-title-lg text-title-lg text-on-surface">Rangos</p>
          <p className="font-label-sm text-outline">Ver jerarquía</p>
        </Card>
        <Card hover onClick={() => navigate('/missions')}>
          <span className="material-symbols-outlined text-secondary text-2xl mb-sm">history</span>
          <p className="font-title-lg text-title-lg text-on-surface">Misiones</p>
          <p className="font-label-sm text-outline">Ver todas</p>
        </Card>
      </div>

      {user?.role === 'admin' && (
        <Card hover onClick={() => navigate('/admin')}>
          <span className="material-symbols-outlined text-error text-2xl mb-sm">admin_panel_settings</span>
          <p className="font-title-lg text-title-lg text-on-surface">Panel de Administración</p>
          <p className="font-label-sm text-outline">Gestionar el Gremio</p>
        </Card>
      )}

      {user?.role === 'merchant' && (
        <Card hover onClick={() => navigate('/merchant')}>
          <span className="material-symbols-outlined text-secondary text-2xl mb-sm">storefront</span>
          <p className="font-title-lg text-title-lg text-on-surface">Panel de Comerciante</p>
          <p className="font-label-sm text-outline">Validar QR y ver mis establecimientos</p>
        </Card>
      )}

      <Button variant="danger" onClick={handleLogout} className="w-full">
        <span className="material-symbols-outlined">logout</span>
        Abandonar el Gremio
      </Button>
    </div>
  )
}