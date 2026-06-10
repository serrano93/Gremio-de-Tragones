import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { StoneCard } from '../components/ui/Card'
import { useToast } from '../components/ui/Toast'
import { processOAuthCallback } from '../hooks/useAuth'
import { getOAuthErrorFromUrl, isNativePlatform } from '../lib/oauth'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const process = async () => {
      const errorParam = getOAuthErrorFromUrl(location.search)
      if (errorParam) {
        setStatus('error')
        setErrorMsg(errorParam)
        return
      }

      const hash = location.hash || ''
      const search = location.search || ''

      const hasTokens = hash.includes('access_token=') || (search && new URLSearchParams(search).get('fragment')?.includes('access_token='))

      if (!hasTokens) {
        setStatus('error')
        setErrorMsg('No se recibieron tokens de autenticación.')
        return
      }

      try {
        const profile = await processOAuthCallback(search, hash)
        if (cancelled) return

        if (profile) {
          setStatus('success')
          toast('success', `¡Bienvenido al Gremio, ${profile.full_name || 'aventurero'}!`)
          setTimeout(() => navigate('/missions', { replace: true }), 800)
        } else {
          setStatus('error')
          setErrorMsg('No se pudo crear/cargar el perfil. Intenta de nuevo.')
        }
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        setErrorMsg(err instanceof Error ? err.message : 'Error desconocido')
      }
    }

    process()

    return () => {
      cancelled = true
    }
  }, [location, navigate, toast])

  return (
    <div className="flex items-center justify-center min-h-[60vh] py-xl">
      <StoneCard className="max-w-sm w-full text-center">
        {status === 'processing' && (
          <>
            <span className="material-symbols-outlined text-primary text-6xl mb-md animate-spin inline-block">
              progress_activity
            </span>
            <h2 className="font-title-lg text-title-lg text-on-surface mb-sm">
              {isNativePlatform() ? 'Volviendo a la app…' : 'Iniciando sesión…'}
            </h2>
            <p className="font-label-lg text-label-lg text-outline">
              Procesando autenticación
            </p>
          </>
        )}
        {status === 'success' && (
          <>
            <span className="material-symbols-outlined text-secondary text-6xl mb-md ms-filled">
              check_circle
            </span>
            <h2 className="font-title-lg text-title-lg text-on-surface mb-sm">Listo!</h2>
            <p className="font-label-lg text-label-lg text-outline">Redirigiendo…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <span className="material-symbols-outlined text-error text-6xl mb-md ms-filled">
              error
            </span>
            <h2 className="font-title-lg text-title-lg text-error mb-sm">Error de autenticación</h2>
            <p className="font-label-lg text-label-lg text-outline mb-lg">{errorMsg}</p>
            <button
              onClick={() => navigate('/profile', { replace: true })}
              className="px-lg py-md bg-primary text-on-primary rounded-xl font-label-lg"
            >
              Volver al Baul
            </button>
          </>
        )}
      </StoneCard>
    </div>
  )
}
