import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { StoneCard, GoldCard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { supabase } from '../lib/supabase'
import type { Establishment } from '../types'

export default function MerchantHomePage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ todayCount: 0, totalCount: 0 })

  const fetchData = useCallback(async () => {
    if (!user?.auth_id) return
    setLoading(true)
    try {
      const { data: estData, error: estError } = await supabase.rpc('get_merchant_establishments', {
        p_auth_id: user.auth_id,
      })
      if (estError) {
        toast('error', 'Error al cargar tus establecimientos')
      } else if (estData) {
        setEstablishments(estData as unknown as Establishment[])
      }

      // Stats simples: validaciones hoy y total
      try {
        const verifierId = user.id
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)

        const [visitsToday, visitsTotal] = await Promise.all([
          supabase
            .from('visits')
            .select('id', { count: 'exact', head: true })
            .eq('verified_by', verifierId)
            .gte('verified_at', todayStart.toISOString()),
          supabase
            .from('visits')
            .select('id', { count: 'exact', head: true })
            .eq('verified_by', verifierId),
        ])

        const today = (visitsToday.count || 0)
        const total = (visitsTotal.count || 0)
        setStats({ todayCount: today, totalCount: total })
      } catch {
        // Stats are nice-to-have, no fallar si falla
      }
    } catch (err) {
      console.error('Merchant home error:', err)
      toast('error', 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [user?.auth_id, user?.id, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (!user || (user.role !== 'merchant' && user.role !== 'admin')) {
    return (
      <div className="space-y-lg">
        <div className="flex items-center gap-md mb-base">
          <button onClick={() => navigate('/')} aria-label="Volver" className="p-2 -ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <span className="material-symbols-outlined text-on-surface">arrow_back</span>
          </button>
          <h1 className="font-display text-xl font-bold text-slate-100">Panel de Comerciante</h1>
        </div>

        <StoneCard className="text-center py-xl">
          <span className="material-symbols-outlined text-outline text-6xl mb-md">shield</span>
          <h2 className="font-title-lg text-title-lg text-outline mb-sm">Acceso Restringido</h2>
          <p className="font-body-md text-outline max-w-xs mx-auto">
            Esta sección es solo para comerciantes del Gremio.
          </p>
        </StoneCard>
      </div>
    )
  }

  return (
    <div className="space-y-lg">
      <div className="flex items-center gap-md mb-base">
        <button onClick={() => navigate('/')} aria-label="Volver" className="p-2 -ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
          <span className="material-symbols-outlined text-on-surface">arrow_back</span>
        </button>
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary">Panel de Comerciante</h1>
          <p className="font-label-sm text-outline">Bienvenido, {user.full_name || 'Comerciante'}</p>
        </div>
      </div>

      <GoldCard>
        <div className="text-center py-md">
          <span className="material-symbols-outlined text-primary text-5xl mb-sm ms-filled">qr_code_scanner</span>
          <h2 className="font-title-lg text-title-lg text-primary mb-sm">Escanear Código QR</h2>
          <p className="font-label-sm text-outline mb-md">
            Valida misiones y ofertas de los aventureros
          </p>
          <Button variant="gold" size="lg" onClick={() => navigate('/scan')} className="w-full">
            <span className="material-symbols-outlined">camera</span>
            Activar Escáner
          </Button>
        </div>
      </GoldCard>

      {loading ? (
        <div className="flex items-center justify-center py-xl">
          <span className="material-symbols-outlined text-primary text-5xl animate-spin">progress_activity</span>
        </div>
      ) : (
        <>
          <div>
            <div className="flex items-center gap-sm mb-md">
              <span className="material-symbols-outlined text-secondary">storefront</span>
              <h2 className="font-title-md text-title-md text-on-surface">Mis Establecimientos</h2>
            </div>
            {establishments.length === 0 ? (
              <StoneCard className="text-center py-lg">
                <span className="material-symbols-outlined text-outline text-5xl mb-sm">storefront</span>
                <p className="font-title-md text-title-md text-outline">Sin establecimientos</p>
                <p className="font-label-sm text-outline mt-xs">
                  Contacta al administrador para que te asigne uno o más.
                </p>
              </StoneCard>
            ) : (
              <div className="space-y-sm">
                {establishments.map((est) => (
                  <StoneCard key={est.id} className="p-md">
                    <div className="flex items-center gap-md">
                      <div className="w-12 h-12 rounded-lg bg-primary-container flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-primary text-2xl">storefront</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-title-md text-title-md text-on-surface">{est.name}</p>
                        {est.address && (
                          <p className="font-label-sm text-outline truncate">{est.address}</p>
                        )}
                      </div>
                    </div>
                  </StoneCard>
                ))}
              </div>
            )}
          </div>

          {stats.totalCount > 0 && (
            <div>
              <div className="flex items-center gap-sm mb-md">
                <span className="material-symbols-outlined text-secondary">analytics</span>
                <h2 className="font-title-md text-title-md text-on-surface">Estadísticas</h2>
              </div>
              <div className="grid grid-cols-2 gap-sm">
                <StoneCard className="p-md text-center">
                  <p className="font-display-lg text-display-lg text-primary">{stats.todayCount}</p>
                  <p className="font-label-sm text-outline">Validaciones hoy</p>
                </StoneCard>
                <StoneCard className="p-md text-center">
                  <p className="font-display-lg text-display-lg text-secondary">{stats.totalCount}</p>
                  <p className="font-label-sm text-outline">Validaciones totales</p>
                </StoneCard>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
