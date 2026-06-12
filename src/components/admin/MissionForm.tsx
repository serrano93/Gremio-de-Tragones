import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'
import { MISSION_REWARDS, canCreateMissionAtRank } from '../../lib/mission-rewards'
import { MISSION_TYPES, MISSION_TYPE_LABELS, MISSION_TYPE_ICONS } from '../../lib/constants'
import type { Establishment, Mission } from '../../types'

const offerTypes = [
  { value: 'free_item', label: 'Obsequio' },
  { value: 'discount', label: 'Descuento' },
  { value: 'exclusive', label: 'Exclusiva' },
  { value: 'other', label: 'Otra' },
]

const ranks = ['F', 'E', 'D', 'C', 'B', 'A', 'S']

interface MissionFormProps {
  establishments: Establishment[]
  preselectedEstId: string | null
  editingMission?: {
    id: string
    establishment_id: string
    title: string
    description: string | null
    xp_reward: number
    gold_reward: number
    required_min_rank: string
    mission_type: string
    is_active: boolean
  } | null
  readOnlyRewards?: boolean
  existingMissions?: Array<Pick<Mission, 'required_min_rank'>>
  onSuccess: () => void
}

export function MissionForm({
  establishments,
  preselectedEstId,
  editingMission,
  readOnlyRewards = false,
  existingMissions = [],
  onSuccess,
}: MissionFormProps) {
  const [form, setForm] = useState({
    establishment_id: editingMission?.establishment_id || preselectedEstId || '',
    title: editingMission?.title || '',
    description: editingMission?.description || '',
    xp_reward: editingMission?.xp_reward ?? MISSION_REWARDS.F.xp,
    gold_reward: editingMission?.gold_reward ?? MISSION_REWARDS.F.gold,
    required_min_rank: editingMission?.required_min_rank || 'F',
    mission_type: editingMission?.mission_type || 'reto',
  })
  const [loading, setLoading] = useState(false)
  const [limitError, setLimitError] = useState<string | null>(null)

  useEffect(() => {
    if (!readOnlyRewards) return
    if (editingMission) return
    const reward = MISSION_REWARDS[form.required_min_rank]
    if (reward) {
      setForm((p) => ({ ...p, xp_reward: reward.xp, gold_reward: reward.gold }))
    }
  }, [form.required_min_rank, readOnlyRewards, editingMission])

  useEffect(() => {
    if (editingMission) {
      setLimitError(null)
      return
    }
    if (!readOnlyRewards) {
      setLimitError(null)
      return
    }
    const check = canCreateMissionAtRank(existingMissions, form.required_min_rank)
    setLimitError(check.allowed ? null : check.reason || null)
  }, [existingMissions, form.required_min_rank, readOnlyRewards, editingMission])

  const handleSubmit = async () => {
    if (!form.establishment_id || !form.title) {
      setLimitError('Selecciona un establecimiento y un título.')
      return
    }
    if (limitError) return
    setLoading(true)
    setLimitError(null)

    try {
      if (editingMission) {
        const { error } = await supabase
          .from('missions')
          .update({
            establishment_id: form.establishment_id,
            title: form.title,
            description: form.description || null,
            xp_reward: form.xp_reward,
            gold_reward: form.gold_reward,
            required_min_rank: form.required_min_rank,
            mission_type: form.mission_type,
          })
          .eq('id', editingMission.id)
        if (error) {
          console.error('[MissionForm] update error:', error)
          setLimitError(error.message || 'Error al actualizar la misión.')
          setLoading(false)
          return
        }
      } else {
        const { error } = await supabase.from('missions').insert({
          establishment_id: form.establishment_id,
          title: form.title,
          description: form.description || null,
          xp_reward: form.xp_reward,
          gold_reward: form.gold_reward,
          required_min_rank: form.required_min_rank,
          mission_type: form.mission_type,
          is_active: true,
        })
        if (error) {
          console.error('[MissionForm] insert error:', error)
          setLimitError(error.message || 'Error al crear la misión.')
          setLoading(false)
          return
        }
      }
      setLoading(false)
      onSuccess()
    } catch (err: any) {
      console.error('[MissionForm] unexpected error:', err)
      setLimitError(err?.message || 'Error inesperado.')
      setLoading(false)
    }
  }

  const reward = MISSION_REWARDS[form.required_min_rank]
  const isRewardsDisabled = readOnlyRewards

  return (
    <div className="space-y-md">
      <div>
        <label className="block font-label-lg text-label-lg mb-xs text-on-surface-variant">Establecimiento</label>
        <select
          value={form.establishment_id}
          onChange={(e) => setForm((p) => ({ ...p, establishment_id: e.target.value }))}
          className="w-full px-md py-sm bg-surface-container border-2 border-outline-variant rounded-lg
                     text-on-surface font-label-lg focus:outline-none focus:border-primary-container min-h-[48px]"
        >
          <option value="">Seleccionar establecimiento</option>
          {establishments
            .filter((e) => e.is_active)
            .map((est) => (
              <option key={est.id} value={est.id}>
                {est.name}
              </option>
            ))}
        </select>
      </div>
      <div>
        <label className="block font-label-lg text-label-lg mb-xs text-on-surface-variant">Título de la misión</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          className="w-full px-md py-sm bg-surface-container border-2 border-outline-variant rounded-lg
                     text-on-surface placeholder:text-outline font-label-lg focus:outline-none focus:border-primary-container min-h-[48px]"
          placeholder="Visita la taberna y prueba la hidromiel"
        />
      </div>
      <div>
        <label className="block font-label-lg text-label-lg mb-xs text-on-surface-variant">Descripción</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          rows={2}
          className="w-full px-md py-sm bg-surface-container border-2 border-outline-variant rounded-lg
                     text-on-surface placeholder:text-outline font-label-lg focus:outline-none focus:border-primary-container resize-none min-h-[48px]"
        />
      </div>
      <div>
        <label className="block font-label-lg text-label-lg mb-xs text-on-surface-variant">Rango mínimo</label>
        <select
          value={form.required_min_rank}
          onChange={(e) => setForm((p) => ({ ...p, required_min_rank: e.target.value }))}
          className="w-full px-md py-sm bg-surface-container border-2 border-outline-variant rounded-lg
                     text-on-surface font-label-lg focus:outline-none focus:border-primary-container min-h-[48px]"
        >
          {ranks.map((r) => (
            <option key={r} value={r}>Rango {r}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className="block font-label-lg text-label-lg mb-xs text-on-surface-variant flex items-center gap-xs">
            Recompensa XP
            {isRewardsDisabled && (
              <span className="font-label-sm text-outline">🔒 Fijo</span>
            )}
          </label>
          <input
            type="number"
            value={form.xp_reward}
            onChange={(e) => setForm((p) => ({ ...p, xp_reward: Number(e.target.value) }))}
            min={0}
            disabled={isRewardsDisabled}
            className={`w-full px-md py-sm border-2 border-outline-variant rounded-lg
                       font-label-lg focus:outline-none focus:border-primary-container min-h-[48px]
                       ${isRewardsDisabled ? 'bg-surface text-on-surface-variant cursor-not-allowed' : 'bg-surface-container text-on-surface'}`}
          />
        </div>
        <div>
          <label className="block font-label-lg text-label-lg mb-xs text-on-surface-variant flex items-center gap-xs">
            Recompensa Oro
            {isRewardsDisabled && (
              <span className="font-label-sm text-outline">🔒 Fijo</span>
            )}
          </label>
          <input
            type="number"
            value={form.gold_reward}
            onChange={(e) => setForm((p) => ({ ...p, gold_reward: Number(e.target.value) }))}
            min={0}
            disabled={isRewardsDisabled}
            className={`w-full px-md py-sm border-2 border-outline-variant rounded-lg
                       font-label-lg focus:outline-none focus:border-primary-container min-h-[48px]
                       ${isRewardsDisabled ? 'bg-surface text-on-surface-variant cursor-not-allowed' : 'bg-surface-container text-on-surface'}`}
          />
        </div>
      </div>
      {isRewardsDisabled && reward && (
        <p className="font-label-sm text-outline">
          Recompensa fija para rango {form.required_min_rank}: {reward.xp} XP / {reward.gold} oro.
        </p>
      )}
      <div>
        <label className="block font-label-lg text-label-lg mb-xs text-on-surface-variant">Tipo de misión</label>
        <div className="grid grid-cols-2 gap-sm">
          {MISSION_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setForm((p) => ({ ...p, mission_type: t }))}
              className={`flex items-center justify-center gap-sm px-md py-sm rounded-lg border-2 min-h-[48px] font-label-lg text-label-lg transition-colors ${
                form.mission_type === t
                  ? 'bg-primary-container text-on-primary-container border-primary'
                  : 'bg-surface-container text-on-surface-variant border-outline-variant hover:border-primary/50'
              }`}
            >
              <span className="material-symbols-outlined text-base">{MISSION_TYPE_ICONS[t]}</span>
              <span>{MISSION_TYPE_LABELS[t]}</span>
            </button>
          ))}
        </div>
      </div>
      {limitError && (
        <div className="rounded-lg border-2 border-error bg-error-container/30 px-md py-sm">
          <p className="font-label-md text-error flex items-center gap-xs">
            <span className="material-symbols-outlined text-md">block</span>
            {limitError}
          </p>
        </div>
      )}
      <Button variant="gold" onClick={handleSubmit} isLoading={loading} disabled={!!limitError} className="w-full">
        {editingMission ? 'Guardar Cambios' : 'Crear Misión'}
      </Button>
    </div>
  )
}

interface OfferFormProps {
  establishments: Establishment[]
  preselectedEstId: string | null
  editingOffer?: {
    id: string
    establishment_id: string
    title: string
    description: string | null
    type: string
    value: string | null
    required_rank: string
    valid_until: string | null
    gold_cost: number
    frequency: 'once' | 'daily' | 'weekly'
  } | null
  onSuccess: () => void
}

export function OfferForm({ establishments, preselectedEstId, editingOffer, onSuccess }: OfferFormProps) {
  const [form, setForm] = useState({
    establishment_id: editingOffer?.establishment_id || preselectedEstId || '',
    title: editingOffer?.title || '',
    description: editingOffer?.description || '',
    type: editingOffer?.type || 'discount',
    value: editingOffer?.value || '',
    required_rank: editingOffer?.required_rank || 'F',
    valid_until: editingOffer?.valid_until || '',
    gold_cost: editingOffer?.gold_cost ?? 0,
    frequency: editingOffer?.frequency || 'once' as 'once' | 'daily' | 'weekly',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.establishment_id || !form.title) return
    setLoading(true)

    if (editingOffer) {
      const { error } = await supabase
        .from('offers')
        .update({
          establishment_id: form.establishment_id,
          title: form.title,
          description: form.description || null,
          type: form.type,
          value: form.value || null,
          required_rank: form.required_rank,
          valid_until: form.valid_until || null,
          gold_cost: form.gold_cost,
          frequency: form.frequency,
        })
        .eq('id', editingOffer.id)
      setLoading(false)
      if (error) { console.error(error); return }
    } else {
      const { error } = await supabase.from('offers').insert({
        establishment_id: form.establishment_id,
        title: form.title,
        description: form.description || null,
        type: form.type,
        value: form.value || null,
        required_rank: form.required_rank,
        valid_until: form.valid_until || null,
        is_active: true,
        gold_cost: form.gold_cost,
        frequency: form.frequency,
      })
      setLoading(false)
      if (error) { console.error(error); return }
    }
    onSuccess()
  }

  return (
    <div className="space-y-md">
      <div>
        <label className="block font-label-lg text-label-lg mb-xs text-on-surface-variant">Establecimiento</label>
        <select
          value={form.establishment_id}
          onChange={(e) => setForm((p) => ({ ...p, establishment_id: e.target.value }))}
          className="w-full px-md py-sm bg-surface-container border-2 border-outline-variant rounded-lg
                     text-on-surface font-label-lg focus:outline-none focus:border-primary-container min-h-[48px]"
        >
          <option value="">Seleccionar establecimiento</option>
          {establishments
            .filter((e) => e.is_active)
            .map((est) => (
              <option key={est.id} value={est.id}>{est.name}</option>
            ))}
        </select>
      </div>
      <div>
        <label className="block font-label-lg text-label-lg mb-xs text-on-surface-variant">Título</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          className="w-full px-md py-sm bg-surface-container border-2 border-outline-variant rounded-lg
                     text-on-surface placeholder:text-outline font-label-lg focus:outline-none focus:border-primary-container min-h-[48px]"
          placeholder="Hidromiel de bienvenida"
        />
      </div>
      <div>
        <label className="block font-label-lg text-label-lg mb-xs text-on-surface-variant">Descripción</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          rows={2}
          className="w-full px-md py-sm bg-surface-container border-2 border-outline-variant rounded-lg
                     text-on-surface placeholder:text-outline font-label-lg focus:outline-none focus:border-primary-container resize-none min-h-[48px]"
        />
      </div>
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className="block font-label-lg text-label-lg mb-xs text-on-surface-variant">Tipo</label>
          <select
            value={form.type}
            onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
            className="w-full px-md py-sm bg-surface-container border-2 border-outline-variant rounded-lg
                       text-on-surface font-label-lg focus:outline-none focus:border-primary-container min-h-[48px]"
          >
            {offerTypes.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-label-lg text-label-lg mb-xs text-on-surface-variant">Valor</label>
          <input
            type="text"
            value={form.value}
            onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
            className="w-full px-md py-sm bg-surface-container border-2 border-outline-variant rounded-lg
                       text-on-surface placeholder:text-outline font-label-lg focus:outline-none focus:border-primary-container min-h-[48px]"
            placeholder="-30% o 'Gratis'"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className="block font-label-lg text-label-lg mb-xs text-on-surface-variant">Rango requerido</label>
          <select
            value={form.required_rank}
            onChange={(e) => setForm((p) => ({ ...p, required_rank: e.target.value }))}
            className="w-full px-md py-sm bg-surface-container border-2 border-outline-variant rounded-lg
                       text-on-surface font-label-lg focus:outline-none focus:border-primary-container min-h-[48px]"
          >
            {ranks.map((r) => (
              <option key={r} value={r}>Rango {r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-label-lg text-label-lg mb-xs text-on-surface-variant">Coste Oro</label>
          <input
            type="number"
            value={form.gold_cost}
            onChange={(e) => setForm((p) => ({ ...p, gold_cost: Number(e.target.value) }))}
            min={0}
            className="w-full px-md py-sm bg-surface-container border-2 border-outline-variant rounded-lg
                       text-on-surface font-label-lg focus:outline-none focus:border-primary-container min-h-[48px]"
            placeholder="0 = gratis"
          />
        </div>
      </div>
      <div>
        <label className="block font-label-lg text-label-lg mb-xs text-on-surface-variant">Frecuencia</label>
        <select
          value={form.frequency}
          onChange={(e) => setForm((p) => ({ ...p, frequency: e.target.value as any }))}
          className="w-full px-md py-sm bg-surface-container border-2 border-outline-variant rounded-lg
                     text-on-surface font-label-lg focus:outline-none focus:border-primary-container min-h-[48px]"
        >
          <option value="once">Una vez</option>
          <option value="daily">Diario</option>
          <option value="weekly">Semanal</option>
        </select>
      </div>
      <div>
        <label className="block font-label-lg text-label-lg mb-xs text-on-surface-variant">Válido hasta</label>
        <input
          type="date"
          value={form.valid_until}
          onChange={(e) => setForm((p) => ({ ...p, valid_until: e.target.value }))}
          className="w-full px-md py-sm bg-surface-container border-2 border-outline-variant rounded-lg
                     text-on-surface font-label-lg focus:outline-none focus:border-primary-container min-h-[48px]"
        />
      </div>
      <Button variant="gold" onClick={handleSubmit} isLoading={loading} className="w-full">
        {editingOffer ? 'Guardar Cambios' : 'Crear Oferta'}
      </Button>
    </div>
  )
}