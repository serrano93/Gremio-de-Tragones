import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { StoneCard, GoldCard, Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { useToast } from '../components/ui/Toast'
import { MissionForm, OfferForm } from '../components/admin/MissionForm'
import { useMerchantMissions, useMerchantOffers } from '../hooks/useMerchantMissions'
import { restRpc, supabaseUrlValue, supabaseAnonKeyValue, getStoredSession } from '../lib/supabase'
import { computeMissionLimits, MISSION_REWARDS } from '../lib/mission-rewards'
import type { Establishment, Mission, Offer } from '../types'

export default function MerchantHomePage() {
  const { user, isLoading } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ todayCount: 0, totalCount: 0 })

  const [selectedEstId, setSelectedEstId] = useState<string | null>(null)
  const [showMissionForm, setShowMissionForm] = useState(false)
  const [editingMission, setEditingMission] = useState<Mission | null>(null)
  const [showOfferForm, setShowOfferForm] = useState(false)
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null)

  const establishmentIds = useMemo(() => establishments.map((e) => e.id), [establishments])
  const { missions, refetch: refetchMissions, deleteMission, toggleActive: toggleMissionActive } = useMerchantMissions(establishmentIds)
  const { offers, refetch: refetchOffers, deleteOffer, toggleActive: toggleOfferActive } = useMerchantOffers(establishmentIds)

  const limits = useMemo(() => computeMissionLimits(missions), [missions])

  const fetchData = useCallback(async () => {
    if (!user?.auth_id) return
    setLoading(true)
    try {
      const { data: estData, error: estError } = await restRpc<Establishment[]>('get_merchant_establishments', {
        p_auth_id: user.auth_id,
      })
      if (estError) {
        toast('error', 'Error al cargar tus establecimientos')
      } else if (estData) {
        const arr = Array.isArray(estData) ? estData : []
        setEstablishments(arr)
        if (arr.length > 0 && !selectedEstId) {
          setSelectedEstId(arr[0].id)
        }
      }

      try {
        const verifierId = user.id
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)

        const session = getStoredSession()
        const authHeader = `Bearer ${session?.access_token || supabaseAnonKeyValue}`
        const baseHeaders = { 'apikey': supabaseAnonKeyValue, 'Authorization': authHeader }

        const [visitsTodayRes, visitsTotalRes] = await Promise.all([
          fetch(`${supabaseUrlValue}/rest/v1/visits?id=eq.${verifierId}&verified_at=gte.${todayStart.toISOString()}&select=id`, {
            method: 'HEAD',
            headers: baseHeaders,
          }),
          fetch(`${supabaseUrlValue}/rest/v1/visits?id=eq.${verifierId}&select=id`, {
            method: 'HEAD',
            headers: baseHeaders,
          }),
        ])

        const getCountFromContentRange = (res: Response) => {
          const cr = res.headers.get('content-range')
          if (!cr) return 0
          const match = cr.match(/\/(\d+)/)
          return match ? Number(match[1]) : 0
        }

        const today = getCountFromContentRange(visitsTodayRes)
        const total = getCountFromContentRange(visitsTotalRes)
        setStats({ todayCount: today, totalCount: total })
      } catch {
        // Stats are nice-to-have
      }
    } catch (err) {
      console.error('Merchant home error:', err)
      toast('error', 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [user?.auth_id, user?.id, selectedEstId, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDeleteMission = async (mission: Mission) => {
    if (!confirm(`¿Eliminar la misión "${mission.title}"?`)) return
    try {
      await deleteMission(mission.id)
      toast('success', 'Misión eliminada')
    } catch (err: any) {
      toast('error', err?.message || 'Error al eliminar')
    }
  }

  const handleToggleMission = async (mission: Mission) => {
    try {
      await toggleMissionActive(mission.id, !mission.is_active)
      toast('success', mission.is_active ? 'Misión desactivada' : 'Misión activada')
    } catch (err: any) {
      toast('error', err?.message || 'Error al cambiar estado')
    }
  }

  const handleDeleteOffer = async (offer: Offer) => {
    if (!confirm(`¿Eliminar la oferta "${offer.title}"?`)) return
    try {
      await deleteOffer(offer.id)
      toast('success', 'Oferta eliminada')
    } catch (err: any) {
      toast('error', err?.message || 'Error al eliminar')
    }
  }

  const handleToggleOffer = async (offer: Offer) => {
    try {
      await toggleOfferActive(offer.id, !offer.is_active)
      toast('success', offer.is_active ? 'Oferta desactivada' : 'Oferta activada')
    } catch (err: any) {
      toast('error', err?.message || 'Error al cambiar estado')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20" role="status">
        <span className="material-symbols-outlined text-primary text-5xl animate-spin">progress_activity</span>
      </div>
    )
  }

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

  const selectedEst = establishments.find((e) => e.id === selectedEstId) || null
  const estMissions = selectedEstId ? missions.filter((m) => m.establishment_id === selectedEstId) : []
  const estOffers = selectedEstId ? offers.filter((o) => o.establishment_id === selectedEstId) : []

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
              <>
                <div className="space-y-sm mb-md">
                  {establishments.map((est) => (
                    <Card
                      key={est.id}
                      hover
                      onClick={() => setSelectedEstId(est.id)}
                      className={selectedEstId === est.id ? 'p-md border-2 border-primary' : 'p-md'}
                    >
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
                        {selectedEstId === est.id && (
                          <span className="material-symbols-outlined text-primary">check_circle</span>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>

                {selectedEst && (
                  <div className="space-y-md">
                    <StoneCard className="p-md">
                      <div className="flex items-center gap-xs mb-sm">
                        <span className="material-symbols-outlined text-primary">info</span>
                        <h3 className="font-title-md text-title-md text-on-surface">Límites de misiones por comerciante</h3>
                      </div>
                      <p className="font-label-sm text-outline mb-md">
                        Cada comerciante puede crear un máximo de:
                      </p>
                      <div className="grid grid-cols-3 gap-sm text-center">
                        <div className="rounded-lg bg-surface-container p-sm">
                          <p className="font-display text-2xl text-on-surface">{limits.low.used}/{limits.low.limit}</p>
                          <p className="font-label-sm text-outline">Rango F-C</p>
                        </div>
                        <div className="rounded-lg bg-surface-container p-sm">
                          <p className="font-display text-2xl text-on-surface">{limits.mid.used}/{limits.mid.limit}</p>
                          <p className="font-label-sm text-outline">Rango B-A</p>
                        </div>
                        <div className="rounded-lg bg-surface-container p-sm">
                          <p className="font-display text-2xl text-on-surface">{limits.high.used}/{limits.high.limit}</p>
                          <p className="font-label-sm text-outline">Rango S</p>
                        </div>
                      </div>
                    </StoneCard>

                    <div>
                      <div className="flex items-center justify-between mb-md">
                        <h3 className="font-title-md text-title-md text-on-surface flex items-center gap-xs">
                          <span className="material-symbols-outlined text-primary">flag</span>
                          Misiones ({estMissions.length})
                        </h3>
                        <Button
                          variant="gold"
                          size="sm"
                          onClick={() => {
                            setEditingMission(null)
                            setShowMissionForm(true)
                          }}
                        >
                          <span className="material-symbols-outlined">add</span>
                          Crear
                        </Button>
                      </div>

                      {estMissions.length === 0 ? (
                        <StoneCard className="text-center py-md">
                          <p className="font-label-lg text-label-lg text-outline">
                            Sin misiones. Crea la primera para este establecimiento.
                          </p>
                        </StoneCard>
                      ) : (
                        <div className="space-y-sm">
                          {estMissions.map((m) => {
                            const reward = MISSION_REWARDS[m.required_min_rank]
                            return (
                              <StoneCard key={m.id} className="p-md">
                                <div className="flex items-start gap-md">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-xs mb-xs">
                                      <p className="font-title-md text-title-md text-on-surface truncate">{m.title}</p>
                                      <span className="font-label-sm text-primary bg-primary-container px-sm py-xs rounded-md">
                                        {m.required_min_rank}
                                      </span>
                                      {!m.is_active && (
                                        <span className="font-label-sm text-outline bg-surface-container px-sm py-xs rounded-md">
                                          Inactiva
                                        </span>
                                      )}
                                    </div>
                                    {m.description && (
                                      <p className="font-label-sm text-outline mb-sm line-clamp-2">{m.description}</p>
                                    )}
                                    <p className="font-label-sm text-outline">
                                      Recompensa: {reward?.xp ?? m.xp_reward} XP / {reward?.gold ?? m.gold_reward} oro
                                    </p>
                                  </div>
                                  <div className="flex flex-col gap-xs shrink-0">
                                    <button
                                      onClick={() => {
                                        setEditingMission(m)
                                        setShowMissionForm(true)
                                      }}
                                      className="p-2 rounded-md hover:bg-surface-container min-w-[36px] min-h-[36px] flex items-center justify-center"
                                      aria-label="Editar"
                                    >
                                      <span className="material-symbols-outlined text-on-surface text-lg">edit</span>
                                    </button>
                                    <button
                                      onClick={() => handleToggleMission(m)}
                                      className="p-2 rounded-md hover:bg-surface-container min-w-[36px] min-h-[36px] flex items-center justify-center"
                                      aria-label={m.is_active ? 'Desactivar' : 'Activar'}
                                    >
                                      <span className="material-symbols-outlined text-on-surface text-lg">
                                        {m.is_active ? 'visibility_off' : 'visibility'}
                                      </span>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMission(m)}
                                      className="p-2 rounded-md hover:bg-error-container min-w-[36px] min-h-[36px] flex items-center justify-center"
                                      aria-label="Eliminar"
                                    >
                                      <span className="material-symbols-outlined text-error text-lg">delete</span>
                                    </button>
                                  </div>
                                </div>
                              </StoneCard>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-md">
                        <h3 className="font-title-md text-title-md text-on-surface flex items-center gap-xs">
                          <span className="material-symbols-outlined text-secondary">redeem</span>
                          Ofertas ({estOffers.length})
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingOffer(null)
                            setShowOfferForm(true)
                          }}
                        >
                          <span className="material-symbols-outlined">add</span>
                          Crear
                        </Button>
                      </div>

                      {estOffers.length === 0 ? (
                        <StoneCard className="text-center py-md">
                          <p className="font-label-lg text-label-lg text-outline">
                            Sin ofertas. Crea la primera para este establecimiento.
                          </p>
                        </StoneCard>
                      ) : (
                        <div className="space-y-sm">
                          {estOffers.map((o) => (
                            <StoneCard key={o.id} className="p-md">
                              <div className="flex items-start gap-md">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-xs mb-xs">
                                    <p className="font-title-md text-title-md text-on-surface truncate">{o.title}</p>
                                    <span className="font-label-sm text-secondary bg-secondary-container px-sm py-xs rounded-md">
                                      {o.type}
                                    </span>
                                    {!o.is_active && (
                                      <span className="font-label-sm text-outline bg-surface-container px-sm py-xs rounded-md">
                                        Inactiva
                                      </span>
                                    )}
                                  </div>
                                  {o.value && (
                                    <p className="font-label-sm text-outline mb-sm">{o.value}</p>
                                  )}
                                  <p className="font-label-sm text-outline">
                                    Rango {o.required_rank} • {o.gold_cost} oro
                                  </p>
                                </div>
                                <div className="flex flex-col gap-xs shrink-0">
                                  <button
                                    onClick={() => {
                                      setEditingOffer(o)
                                      setShowOfferForm(true)
                                    }}
                                    className="p-2 rounded-md hover:bg-surface-container min-w-[36px] min-h-[36px] flex items-center justify-center"
                                    aria-label="Editar"
                                  >
                                    <span className="material-symbols-outlined text-on-surface text-lg">edit</span>
                                  </button>
                                  <button
                                    onClick={() => handleToggleOffer(o)}
                                    className="p-2 rounded-md hover:bg-surface-container min-w-[36px] min-h-[36px] flex items-center justify-center"
                                    aria-label={o.is_active ? 'Desactivar' : 'Activar'}
                                  >
                                    <span className="material-symbols-outlined text-on-surface text-lg">
                                      {o.is_active ? 'visibility_off' : 'visibility'}
                                    </span>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteOffer(o)}
                                    className="p-2 rounded-md hover:bg-error-container min-w-[36px] min-h-[36px] flex items-center justify-center"
                                    aria-label="Eliminar"
                                  >
                                    <span className="material-symbols-outlined text-error text-lg">delete</span>
                                  </button>
                                </div>
                              </div>
                            </StoneCard>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
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

      <Modal isOpen={showMissionForm} onClose={() => setShowMissionForm(false)} title={editingMission ? 'Editar Misión' : 'Nueva Misión'}>
        <MissionForm
          establishments={establishments}
          preselectedEstId={selectedEstId}
          editingMission={editingMission ? {
            id: editingMission.id,
            establishment_id: editingMission.establishment_id,
            title: editingMission.title,
            description: editingMission.description,
            xp_reward: editingMission.xp_reward,
            gold_reward: editingMission.gold_reward,
            required_min_rank: editingMission.required_min_rank,
            mission_type: editingMission.mission_type,
            is_active: editingMission.is_active,
          } : null}
          readOnlyRewards={user.role === 'merchant'}
          existingMissions={missions}
          onSuccess={async () => {
            setShowMissionForm(false)
            setEditingMission(null)
            await refetchMissions()
          }}
        />
      </Modal>

      <Modal isOpen={showOfferForm} onClose={() => setShowOfferForm(false)} title={editingOffer ? 'Editar Oferta' : 'Nueva Oferta'}>
        <OfferForm
          establishments={establishments}
          preselectedEstId={selectedEstId}
          editingOffer={editingOffer ? {
            id: editingOffer.id,
            establishment_id: editingOffer.establishment_id,
            title: editingOffer.title,
            description: editingOffer.description,
            type: editingOffer.type,
            value: editingOffer.value,
            required_rank: editingOffer.required_rank,
            valid_until: editingOffer.valid_until,
            gold_cost: editingOffer.gold_cost,
            frequency: editingOffer.frequency,
          } : null}
          onSuccess={async () => {
            setShowOfferForm(false)
            setEditingOffer(null)
            await refetchOffers()
          }}
        />
      </Modal>
    </div>
  )
}
