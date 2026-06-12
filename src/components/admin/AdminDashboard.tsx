import { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { Card, StoneCard } from '../ui/Card'
import { Modal } from '../ui/Modal'
import { MissionForm, OfferForm } from './MissionForm'
import { PromoCodeForm } from './PromoCodeForm'
import { useEstablishments } from '../../hooks/useEstablishments'
import { useToast } from '../ui/Toast'
import { supabase } from '../../lib/supabase'
import type { Establishment, Profile, PromoCode, Mission, Offer } from '../../types'

interface AdminDashboardProps {
  user: Profile
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const { establishments, isLoading, createEstablishment, updateEstablishment } = useEstablishments(user.id, 'admin')
  const { toast } = useToast()

  const [showEstForm, setShowEstForm] = useState(false)
  const [editingEst, setEditingEst] = useState<Establishment | null>(null)
  const [showMissionForm, setShowMissionForm] = useState(false)
  const [showOfferForm, setShowOfferForm] = useState(false)
  const [selectedEstId, setSelectedEstId] = useState<string | null>(null)
  const [showPromoForm, setShowPromoForm] = useState(false)
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null)
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [missions, setMissions] = useState<Mission[]>([])
  const [editingMission, setEditingMission] = useState<Mission | null>(null)
  const [offers, setOffers] = useState<Offer[]>([])
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null)

  const [estForm, setEstForm] = useState({
    name: '',
    description: '',
    address: '',
    image_url: '',
    is_active: true,
    owner_id: null as string | null,
  })

  const [merchants, setMerchants] = useState<Array<{ id: string; full_name: string | null; email: string | null }>>([])

  const fetchMerchants = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'merchant')
      .order('full_name')
    if (data) setMerchants(data)
  }

  const fetchPromoCodes = async () => {
    const { data } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false })
    if (data) setPromoCodes(data)
  }

  const fetchMissions = async () => {
    const { data } = await supabase
      .from('missions')
      .select('*, establishments(name)')
      .order('created_at', { ascending: false })
    if (data) setMissions(data)
  }

  const fetchOffers = async () => {
    const { data } = await supabase
      .from('offers')
      .select('*, establishments(name)')
      .order('created_at', { ascending: false })
    if (data) setOffers(data)
  }

  useEffect(() => {
    fetchPromoCodes()
    fetchMissions()
    fetchOffers()
    fetchMerchants()
  }, [])

  const handleTogglePromoActive = async (promo: PromoCode) => {
    await supabase.from('promo_codes').update({ is_active: !promo.is_active }).eq('id', promo.id)
    toast('success', promo.is_active ? 'Código desactivado' : 'Código activado')
    fetchPromoCodes()
  }

  const handleDeletePromo = async (promo: PromoCode) => {
    if (!confirm(`¿Eliminar el código "${promo.code}"?`)) return
    const { error } = await supabase.from('promo_codes').delete().eq('id', promo.id)
    if (error) {
      console.error('[AdminDashboard] delete promo error:', error)
      toast('error', `Error al eliminar: ${error.message}`)
      return
    }
    toast('success', 'Código eliminado')
    fetchPromoCodes()
  }

  const handleToggleMissionActive = async (mission: Mission) => {
    const { error } = await supabase.from('missions').update({ is_active: !mission.is_active }).eq('id', mission.id)
    if (error) {
      console.error('[AdminDashboard] toggle mission error:', error)
      toast('error', `Error al cambiar estado: ${error.message}`)
      return
    }
    toast('success', mission.is_active ? 'Misión desactivada' : 'Misión activada')
    fetchMissions()
  }

  const handleDeleteMission = async (mission: Mission) => {
    if (!confirm(`¿Eliminar la misión "${mission.title}"?`)) return
    const { error } = await supabase.from('missions').delete().eq('id', mission.id)
    if (error) {
      console.error('[AdminDashboard] delete mission error:', error)
      toast('error', `Error al eliminar: ${error.message}`)
      return
    }
    toast('success', 'Misión eliminada')
    fetchMissions()
  }

  const handleEditMission = (mission: Mission) => {
    setEditingMission(mission)
    setShowMissionForm(true)
  }

  const handleNewMission = () => {
    setEditingMission(null)
    setShowMissionForm(true)
  }

  const handleToggleOfferActive = async (offer: Offer) => {
    const { error } = await supabase.from('offers').update({ is_active: !offer.is_active }).eq('id', offer.id)
    if (error) {
      console.error('[AdminDashboard] toggle offer error:', error)
      toast('error', `Error al cambiar estado: ${error.message}`)
      return
    }
    toast('success', offer.is_active ? 'Oferta desactivada' : 'Oferta activada')
    fetchOffers()
  }

  const handleDeleteOffer = async (offer: Offer) => {
    if (!confirm(`¿Eliminar la oferta "${offer.title}"?`)) return
    const { error } = await supabase.from('offers').delete().eq('id', offer.id)
    if (error) {
      console.error('[AdminDashboard] delete offer error:', error)
      toast('error', `Error al eliminar: ${error.message}`)
      return
    }
    toast('success', 'Oferta eliminada')
    fetchOffers()
  }

  const handleEditOffer = (offer: Offer) => {
    setEditingOffer(offer)
    setShowOfferForm(true)
  }

  const handleNewOffer = () => {
    setEditingOffer(null)
    setShowOfferForm(true)
  }

  const handleCreateEst = async () => {
    try {
      await createEstablishment({
        ...estForm,
        owner_id: estForm.owner_id || null,
        is_active: estForm.is_active,
      })
      setShowEstForm(false)
      setEstForm({ name: '', description: '', address: '', image_url: '', is_active: true, owner_id: null })
      toast('success', 'Establecimiento creado con éxito')
    } catch {
      toast('error', 'Error al crear establecimiento')
    }
  }

  const handleToggleActive = async (est: Establishment) => {
    try {
      await updateEstablishment(est.id, { is_active: !est.is_active })
      toast('success', `Establecimiento ${est.is_active ? 'desactivado' : 'activado'}`)
    } catch {
      toast('error', 'Error al cambiar estado')
    }
  }

  const handleEditEst = (est: Establishment) => {
    setEditingEst(est)
    setEstForm({
      name: est.name,
      description: est.description || '',
      address: est.address || '',
      image_url: est.image_url || '',
      is_active: est.is_active,
      owner_id: est.owner_id || null,
    })
    setShowEstForm(true)
  }

  const handleSaveEdit = async () => {
    if (!editingEst) return
    try {
      await updateEstablishment(editingEst.id, {
        name: estForm.name,
        description: estForm.description,
        address: estForm.address,
        image_url: estForm.image_url,
        is_active: estForm.is_active,
        owner_id: estForm.owner_id || null,
      })
      setShowEstForm(false)
      setEditingEst(null)
      toast('success', 'Establecimiento actualizado')
    } catch {
      toast('error', 'Error al actualizar')
    }
  }

  const stats = {
    total: establishments.length,
    active: establishments.filter((e) => e.is_active).length,
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="material-symbols-outlined text-primary text-5xl animate-spin">progress_activity</span>
      </div>
    )
  }

  return (
    <div className="space-y-lg">
      <div className="grid grid-cols-2 gap-md">
        <StoneCard className="p-md">
          <span className="material-symbols-outlined text-primary text-3xl mb-xs ms-filled">storefront</span>
          <p className="font-display-lg text-display-lg text-on-surface">{stats.total}</p>
          <p className="font-label-lg text-label-lg text-outline">Establecimientos</p>
        </StoneCard>
        <StoneCard className="p-md">
          <span className="material-symbols-outlined text-secondary text-3xl mb-xs ms-filled">check_circle</span>
          <p className="font-display-lg text-display-lg text-secondary">{stats.active}</p>
          <p className="font-label-lg text-label-lg text-outline">Activos</p>
        </StoneCard>
      </div>

      <div className="flex flex-wrap gap-sm">
        <Button variant="gold" size="sm" onClick={() => { setEditingEst(null); setEstForm({ name: '', description: '', address: '', image_url: '', is_active: true, owner_id: null }); setShowEstForm(true) }}>
          <span className="material-symbols-outlined text-lg">add</span>
          Nuevo Establecimiento
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMissionForm(true)}
          disabled={establishments.length === 0}
        >
          <span className="material-symbols-outlined text-lg">history_edu</span>
          Nueva Misión
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowOfferForm(true)}
          disabled={establishments.length === 0}
        >
          <span className="material-symbols-outlined text-lg">redeem</span>
          Nueva Oferta
        </Button>
      </div>

      <div>
        <h3 className="font-label-lg text-label-lg text-outline uppercase tracking-wider mb-md">Establecimientos</h3>
        <div className="space-y-sm">
          {establishments.map((est) => {
            const assignedMerchant = merchants.find((m) => m.id === est.owner_id)
            return (
            <Card key={est.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-md min-w-0 flex-1">
                  <span className="material-symbols-outlined text-secondary text-2xl shrink-0">storefront</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-title-lg text-title-lg text-on-surface">{est.name}</p>
                    <p className="font-label-sm text-outline">
                      {est.is_active ? 'Activo' : 'Inactivo'}
                      {est.address && ` | ${est.address}`}
                    </p>
                    {assignedMerchant ? (
                      <p className="font-label-sm text-primary mt-xs flex items-center gap-xs">
                        <span className="material-symbols-outlined text-sm">storefront</span>
                        Comerciante: {assignedMerchant.full_name || assignedMerchant.email}
                      </p>
                    ) : (
                      <p className="font-label-sm text-outline mt-xs flex items-center gap-xs">
                        <span className="material-symbols-outlined text-sm">person_off</span>
                        Sin comerciante asignado
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-xs shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => handleEditEst(est)}>
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleToggleActive(est)}>
                    {est.is_active ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedEstId(est.id); setShowMissionForm(true) }}>
                    +Misión
                  </Button>
                </div>
              </div>
            </Card>
            )
          })}
          {establishments.length === 0 && (
            <p className="text-center text-outline py-xl font-label-lg">No hay establecimientos. Crea el primero.</p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-md">
          <h3 className="font-label-lg text-label-lg text-outline uppercase tracking-wider">Misiones</h3>
          <Button variant="outline" size="sm" onClick={handleNewMission}>
            <span className="material-symbols-outlined text-lg">add</span>
            Nueva Misión
          </Button>
        </div>
        <div className="space-y-sm">
          {missions.map((mission) => (
            <Card key={mission.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-md">
                  <span className="material-symbols-outlined text-secondary text-2xl">history_edu</span>
                  <div>
                    <p className="font-title-lg text-title-lg text-on-surface">{mission.title}</p>
                    <p className="font-label-sm text-outline">
                      {mission.is_active ? 'Activa' : 'Inactiva'}
                      {' | '}XP: {mission.xp_reward} | Oro: {mission.gold_reward}
                      {mission.offer_type && ` | ${mission.offer_type.replace('_', ' ')}`}
                      {' | '}Mín: {mission.required_min_rank}
                      {(mission as any).establishments?.name && ` | ${(mission as any).establishments.name}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-xs">
                  <Button variant="ghost" size="sm" onClick={() => handleEditMission(mission)}>
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleToggleMissionActive(mission)}>
                    {mission.is_active ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteMission(mission)}>
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {missions.length === 0 && (
            <p className="text-center text-outline py-xl font-label-lg">No hay misiones. Crea la primera.</p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-md">
          <h3 className="font-label-lg text-label-lg text-outline uppercase tracking-wider">Ofertas</h3>
          <Button variant="outline" size="sm" onClick={handleNewOffer}>
            <span className="material-symbols-outlined text-lg">add</span>
            Nueva Oferta
          </Button>
        </div>
        <div className="space-y-sm">
          {offers.map((offer) => (
            <Card key={offer.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-md">
                  <span className="material-symbols-outlined text-secondary text-2xl">redeem</span>
                  <div>
                    <p className="font-title-lg text-title-lg text-on-surface">{offer.title}</p>
                    <p className="font-label-sm text-outline">
                      {offer.is_active ? 'Activa' : 'Inactiva'}
                      {' | '}{offer.type.replace('_', ' ')}
                      {offer.value && ` | ${offer.value}`}
                      {' | '}Oro: {offer.gold_cost}
                      {' | '}Frec: {offer.frequency}
                      {(offer as any).establishments?.name && ` | ${(offer as any).establishments.name}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-xs">
                  <Button variant="ghost" size="sm" onClick={() => handleEditOffer(offer)}>
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleToggleOfferActive(offer)}>
                    {offer.is_active ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteOffer(offer)}>
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {offers.length === 0 && (
            <p className="text-center text-outline py-xl font-label-lg">No hay ofertas. Crea la primera.</p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-md">
          <h3 className="font-label-lg text-label-lg text-outline uppercase tracking-wider">Códigos Promocionales</h3>
          <Button variant="outline" size="sm" onClick={() => { setEditingPromo(null); setShowPromoForm(true) }}>
            <span className="material-symbols-outlined text-lg">add</span>
            Nuevo Código
          </Button>
        </div>
        <div className="space-y-sm">
          {promoCodes.map((promo) => (
            <Card key={promo.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-md">
                  <span className={`material-symbols-outlined text-2xl ${promo.type === 'gold' ? 'text-primary' : 'text-tertiary'}`}>
                    {promo.type === 'gold' ? 'payments' : 'star'}
                  </span>
                  <div>
                    <p className="font-title-lg text-title-lg text-on-surface">{promo.code}</p>
                    <p className="font-label-sm text-outline">
                      {promo.type === 'gold' ? `${promo.value} de oro` : `${promo.value} XP`}
                      {promo.for_s_rank_only && ' | Solo S-rank'}
                      {' | '}{promo.current_uses}/{promo.max_uses} usos
                    </p>
                  </div>
                </div>
                <div className="flex gap-xs">
                  <Button variant="ghost" size="sm" onClick={() => handleTogglePromoActive(promo)}>
                    {promo.is_active ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeletePromo(promo)}>
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {promoCodes.length === 0 && (
            <p className="text-center text-outline py-xl font-label-lg">No hay códigos promocionales. Crea el primero.</p>
          )}
        </div>
      </div>

      <Modal
        isOpen={showEstForm}
        onClose={() => { setShowEstForm(false); setEditingEst(null) }}
        title={editingEst ? 'Editar Establecimiento' : 'Nuevo Establecimiento'}
      >
        <div className="space-y-md">
          <div>
            <label className="block font-label-lg text-label-lg mb-xs text-on-surface-variant">Nombre</label>
            <input
              type="text"
              value={estForm.name}
              onChange={(e) => setEstForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full px-md py-sm bg-surface-container border-2 border-outline-variant rounded-lg
                         text-on-surface placeholder:text-outline font-label-lg
                         focus:outline-none focus:border-primary-container min-h-[48px]"
              placeholder="Taberna del Dragón"
            />
          </div>
          <div>
            <label className="block font-label-lg text-label-lg mb-xs text-on-surface-variant">Descripción</label>
            <textarea
              value={estForm.description}
              onChange={(e) => setEstForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-md py-sm bg-surface-container border-2 border-outline-variant rounded-lg
                         text-on-surface placeholder:text-outline font-label-lg
                         focus:outline-none focus:border-primary-container resize-none min-h-[48px]"
              placeholder="La mejor taberna del reino..."
            />
          </div>
          <div>
            <label className="block font-label-lg text-label-lg mb-xs text-on-surface-variant">Dirección</label>
            <input
              type="text"
              value={estForm.address}
              onChange={(e) => setEstForm((prev) => ({ ...prev, address: e.target.value }))}
              className="w-full px-md py-sm bg-surface-container border-2 border-outline-variant rounded-lg
                         text-on-surface placeholder:text-outline font-label-lg
                         focus:outline-none focus:border-primary-container min-h-[48px]"
              placeholder="Calle del Reino 123"
            />
          </div>
          <label className="flex items-center gap-sm font-label-lg text-on-surface-variant">
            <input
              type="checkbox"
              checked={estForm.is_active}
              onChange={(e) => setEstForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              className="w-5 h-5 rounded accent-primary"
            />
            Establecimiento activo
          </label>
          <div>
            <label className="block font-label-lg text-label-lg mb-xs text-on-surface-variant">
              Comerciante asignado
            </label>
            <select
              value={estForm.owner_id || ''}
              onChange={(e) => setEstForm((prev) => ({ ...prev, owner_id: e.target.value || null }))}
              className="w-full px-md py-sm bg-surface-container border-2 border-outline-variant rounded-lg
                         text-on-surface font-label-lg
                         focus:outline-none focus:border-primary-container min-h-[48px]"
            >
              <option value="">— Sin asignar —</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name || m.email || 'Comerciante'}
                </option>
              ))}
            </select>
            <p className="font-label-sm text-outline mt-xs">
              Solo este comerciante podrá validar misiones y ofertas de este establecimiento.
            </p>
          </div>
          <Button variant="gold" onClick={editingEst ? handleSaveEdit : handleCreateEst} className="w-full">
            {editingEst ? 'Guardar Cambios' : 'Crear Establecimiento'}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={showMissionForm} onClose={() => { setShowMissionForm(false); setEditingMission(null) }} title={editingMission ? 'Editar Misión' : 'Nueva Misión'}>
        <MissionForm
          establishments={establishments}
          preselectedEstId={selectedEstId}
          editingMission={editingMission}
          onSuccess={() => {
            setShowMissionForm(false)
            setEditingMission(null)
            setSelectedEstId(null)
            fetchMissions()
            toast('success', editingMission ? 'Misión actualizada' : 'Misión creada con éxito')
          }}
        />
      </Modal>

      <Modal isOpen={showOfferForm} onClose={() => { setShowOfferForm(false); setEditingOffer(null) }} title={editingOffer ? 'Editar Oferta' : 'Nueva Oferta'}>
        <OfferForm
          establishments={establishments}
          preselectedEstId={selectedEstId}
          editingOffer={editingOffer}
          onSuccess={() => {
            setShowOfferForm(false)
            setEditingOffer(null)
            setSelectedEstId(null)
            fetchOffers()
            toast('success', editingOffer ? 'Oferta actualizada' : 'Oferta creada con éxito')
          }}
        />
      </Modal>

      <Modal isOpen={showPromoForm} onClose={() => setShowPromoForm(false)} title="Código Promocional">
        <PromoCodeForm
          editingCode={editingPromo}
          onSuccess={() => {
            setShowPromoForm(false)
            setEditingPromo(null)
            fetchPromoCodes()
            toast('success', editingPromo ? 'Código actualizado' : 'Código creado')
          }}
        />
      </Modal>
    </div>
  )
}