import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'
import type { PromoCode } from '../../types'

interface PromoCodeFormProps {
  onSuccess: () => void
  editingCode?: PromoCode | null
}

export function PromoCodeForm({ onSuccess, editingCode }: PromoCodeFormProps) {
  const [form, setForm] = useState({
    code: editingCode?.code || '',
    type: editingCode?.type || 'gold' as 'gold' | 'xp',
    value: editingCode?.value || 50,
    max_uses: editingCode?.max_uses || 100,
    for_s_rank_only: editingCode?.for_s_rank_only || false,
    valid_until: editingCode?.valid_until || '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.code) return
    setLoading(true)

    const payload = {
      code: form.code.toUpperCase(),
      type: form.type,
      value: form.value,
      max_uses: form.max_uses,
      for_s_rank_only: form.for_s_rank_only,
      valid_until: form.valid_until || null,
      is_active: true,
    }

    const { error } = editingCode
      ? await supabase.from('promo_codes').update(payload).eq('id', editingCode.id)
      : await supabase.from('promo_codes').insert(payload)

    setLoading(false)
    if (error) {
      console.error(error)
      return
    }
    onSuccess()
  }

  return (
    <div className="space-y-md">
      <div>
        <label className="block font-label-lg text-label-lg mb-xs text-on-surface-variant">Código</label>
        <input
          type="text"
          value={form.code}
          onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
          className="w-full px-md py-sm bg-surface-container border-2 border-outline-variant rounded-lg
                     text-on-surface placeholder:text-outline font-label-lg
                     focus:outline-none focus:border-primary-container min-h-[48px]"
          placeholder="BIENVENIDO2024"
        />
      </div>
      <div className="grid grid-cols-2 gap-md">
        <div>
          <label className="block font-label-lg text-label-lg mb-xs text-on-surface-variant">Tipo</label>
          <select
            value={form.type}
            onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as any }))}
            className="w-full px-md py-sm bg-surface-container border-2 border-outline-variant rounded-lg
                       text-on-surface font-label-lg focus:outline-none focus:border-primary-container min-h-[48px]"
          >
            <option value="gold">Oro</option>
            <option value="xp">XP</option>
          </select>
        </div>
        <div>
          <label className="block font-label-lg text-label-lg mb-xs text-on-surface-variant">Valor</label>
          <input
            type="number"
            value={form.value}
            onChange={(e) => setForm((p) => ({ ...p, value: Number(e.target.value) }))}
            min={1}
            className="w-full px-md py-sm bg-surface-container border-2 border-outline-variant rounded-lg
                       text-on-surface font-label-lg focus:outline-none focus:border-primary-container min-h-[48px]"
          />
        </div>
      </div>
      <div>
        <label className="block font-label-lg text-label-lg mb-xs text-on-surface-variant">Usos máximos</label>
        <input
          type="number"
          value={form.max_uses}
          onChange={(e) => setForm((p) => ({ ...p, max_uses: Number(e.target.value) }))}
          min={1}
          className="w-full px-md py-sm bg-surface-container border-2 border-outline-variant rounded-lg
                     text-on-surface font-label-lg focus:outline-none focus:border-primary-container min-h-[48px]"
        />
      </div>
      <div>
        <label className="block font-label-lg text-label-lg mb-xs text-on-surface-variant">Caducidad (opcional)</label>
        <input
          type="date"
          value={form.valid_until}
          onChange={(e) => setForm((p) => ({ ...p, valid_until: e.target.value }))}
          className="w-full px-md py-sm bg-surface-container border-2 border-outline-variant rounded-lg
                     text-on-surface font-label-lg focus:outline-none focus:border-primary-container min-h-[48px]"
        />
      </div>
      <label className="flex items-center gap-sm font-label-lg text-on-surface-variant">
        <input
          type="checkbox"
          checked={form.for_s_rank_only}
          onChange={(e) => setForm((p) => ({ ...p, for_s_rank_only: e.target.checked }))}
          className="w-5 h-5 rounded accent-primary"
        />
        Solo para rangos S (Taberna Secreta)
      </label>
      <Button variant="gold" onClick={handleSubmit} isLoading={loading} className="w-full">
        {editingCode ? 'Guardar' : 'Crear Código'}
      </Button>
    </div>
  )
}