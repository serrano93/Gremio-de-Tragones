import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { MerchantScanner } from '../components/merchant/MerchantScanner'
import { ScanPreviewModal, type ScanPreviewInfo, type ScanPayloadType } from '../components/merchant/ScanPreviewModal'
import { StoneCard, GoldCard } from '../components/ui/Card'
import { useToast } from '../components/ui/Toast'
import { restQuery, restRpc } from '../lib/supabase'
import type { Mission, Offer, Establishment } from '../types'

interface QrPayloadBase {
  u: string
  t: string
  h: string
}

interface MissionQrPayload extends QrPayloadBase {
  m: string
}

interface OfferQrPayload extends QrPayloadBase {
  o: string
}

type QrPayload = MissionQrPayload | OfferQrPayload

export default function ScanPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [preview, setPreview] = useState<ScanPreviewInfo | null>(null)
  const [rawPayload, setRawPayload] = useState<QrPayload | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [establishments, setEstablishments] = useState<Establishment[]>([])
  const [loadingEst, setLoadingEst] = useState(true)

  const fetchMerchantEstablishments = useCallback(async () => {
    if (!user?.auth_id) return
    setLoadingEst(true)
    try {
      const { data, error } = await restRpc<Establishment[]>('get_merchant_establishments', {
        p_auth_id: user.auth_id,
      })
      if (error) {
        console.error('Error fetching establishments:', error)
      } else if (data) {
        setEstablishments(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Exception fetching establishments:', err)
    } finally {
      setLoadingEst(false)
    }
  }, [user?.auth_id])

  useEffect(() => {
    if (user?.role === 'merchant') {
      fetchMerchantEstablishments()
    } else {
      setLoadingEst(false)
    }
  }, [user?.role, fetchMerchantEstablishments])

  const detectPayloadType = (payload: QrPayload): ScanPayloadType | null => {
    if ('m' in payload && payload.m) return 'mission'
    if ('o' in payload && payload.o) return 'offer'
    return null
  }

  const buildPreview = async (payload: QrPayload): Promise<ScanPreviewInfo | null> => {
    const type = detectPayloadType(payload)
    if (!type) return null

    if (type === 'mission') {
      const { data, error } = await restQuery<Mission & { establishment?: { name: string } | { name: string }[] }>('missions', {
        select: 'id, title, description, xp_reward, gold_reward, establishment_id, establishment:establishments(name)',
        filters: { id: `eq.${(payload as MissionQrPayload).m}` },
      })
      if (error || !data) {
        toast('error', 'Misión no encontrada')
        return null
      }
      const m = Array.isArray(data) ? data[0] : data
      if (!m) {
        toast('error', 'Misión no encontrada')
        return null
      }
      const estName = Array.isArray(m.establishment) ? m.establishment[0]?.name : m.establishment?.name
      return {
        type: 'mission',
        establishmentName: estName || 'Establecimiento',
        title: m.title,
        description: m.description,
        xpReward: m.xp_reward,
        goldReward: m.gold_reward,
      }
    } else {
      const { data, error } = await restQuery<Offer & { establishment?: { name: string } | { name: string }[] }>('offers', {
        select: 'id, title, description, gold_cost, establishment_id, establishment:establishments(name)',
        filters: { id: `eq.${(payload as OfferQrPayload).o}` },
      })
      if (error || !data) {
        toast('error', 'Oferta no encontrada')
        return null
      }
      const o = Array.isArray(data) ? data[0] : data
      if (!o) {
        toast('error', 'Oferta no encontrada')
        return null
      }
      const estName = Array.isArray(o.establishment) ? o.establishment[0]?.name : o.establishment?.name
      return {
        type: 'offer',
        establishmentName: estName || 'Establecimiento',
        title: o.title,
        description: o.description,
        goldCost: o.gold_cost,
        isFree: o.gold_cost === 0,
      }
    }
  }

  const handleScan = async (decoded: string) => {
    try {
      const payload = JSON.parse(decoded) as QrPayload

      if (!payload.u || !payload.t || !payload.h) {
        toast('error', 'Código QR inválido: estructura incorrecta')
        return
      }

      const type = detectPayloadType(payload)
      if (!type) {
        toast('error', 'No se pudo determinar el tipo (misión u oferta)')
        return
      }

      const info = await buildPreview(payload)
      if (!info) return

      setRawPayload(payload)
      setPreview(info)
    } catch {
      toast('error', 'QR no válido. El código debe ser un JSON firmado por el Gremio.')
    }
  }

  const handleConfirm = async () => {
    if (!preview || !rawPayload || !user?.auth_id) return

    setIsProcessing(true)
    try {
      const rpcName = preview.type === 'mission' ? 'verify_and_complete_mission' : 'verify_and_redeem_offer'

      const { data: result, error } = await restRpc<{
        success: boolean
        error?: string
        xp_awarded?: number
        gold_awarded?: number
        gold_spent?: number
        new_rank?: string
        offer_title?: string
      }>(rpcName, {
        payload: rawPayload as unknown as Record<string, unknown>,
        verifier_auth_id: user.auth_id,
      })

      // Cerrar el modal siempre antes de mostrar el resultado
      setPreview(null)
      setRawPayload(null)

      if (error) {
        toast('error', error.message)
        return
      }

      const r = result as {
        success: boolean
        error?: string
        xp_awarded?: number
        gold_awarded?: number
        gold_spent?: number
        new_rank?: string
        offer_title?: string
      }

      if (!r.success) {
        toast('error', r.error || 'Error al validar')
        return
      }

      if (preview.type === 'mission') {
        const xp = r.xp_awarded ?? 0
        const gold = r.gold_awarded ?? 0
        toast('success', `¡Misión validada! +${xp} XP y +${gold} oro para el aventurero`)
      } else {
        const gold = r.gold_spent ?? 0
        if (gold > 0) {
          toast('success', `¡Oferta canjeada! -${gold} oro del aventurero`)
        } else {
          toast('success', '¡Oferta canjeada!')
        }
      }
    } catch (err) {
      console.error('Confirm error:', err)
      setPreview(null)
      setRawPayload(null)
      toast('error', 'Error inesperado al validar')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = () => {
    if (isProcessing) return
    setPreview(null)
    setRawPayload(null)
  }

  if (!user || (user.role !== 'merchant' && user.role !== 'admin')) {
    return (
      <div className="space-y-lg">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary">Escanear Código</h1>
          <p className="font-label-sm text-outline">Verifica misiones y ofertas de aventureros</p>
        </div>

        <StoneCard className="text-center py-xl">
          <span className="material-symbols-outlined text-outline text-6xl mb-md">shield</span>
          <h2 className="font-title-lg text-title-lg text-outline mb-sm">Acceso Restringido</h2>
          <p className="font-body-md text-outline max-w-xs mx-auto">
            Solo los miembros del Gremio de Comerciantes pueden verificar códigos QR.
            Contacta al administrador si eres un comerciante.
          </p>
        </StoneCard>
      </div>
    )
  }

  return (
    <div className="space-y-lg">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-primary">Escanear Código</h1>
        <p className="font-label-sm text-outline">Verifica misiones y ofertas de aventureros</p>
      </div>

      {user.role === 'merchant' && (
        <GoldCard>
          <div className="flex items-center gap-md mb-md">
            <span className="material-symbols-outlined text-primary text-3xl ms-filled">storefront</span>
            <div>
              <h2 className="font-title-lg text-title-lg text-primary">Tus Establecimientos</h2>
              <p className="font-label-sm text-outline">
                Puedes validar cualquier QR de estos locales
              </p>
            </div>
          </div>
          {loadingEst ? (
            <div className="flex items-center justify-center py-md">
              <span className="material-symbols-outlined text-primary text-3xl animate-spin">progress_activity</span>
            </div>
          ) : establishments.length === 0 ? (
            <p className="font-label-lg text-outline text-center py-md">
              Aún no tienes establecimientos asignados. Contacta al administrador.
            </p>
          ) : (
            <div className="flex flex-wrap gap-sm">
              {establishments.map((est) => (
                <span
                  key={est.id}
                  className="px-md py-xs bg-primary-container text-on-primary-container font-label-md rounded-full flex items-center gap-xs"
                >
                  <span className="material-symbols-outlined text-sm">storefront</span>
                  {est.name}
                </span>
              ))}
            </div>
          )}
        </GoldCard>
      )}

      {user.role === 'admin' && (
        <StoneCard>
          <div className="flex items-center gap-md">
            <span className="material-symbols-outlined text-secondary text-3xl">admin_panel_settings</span>
            <div>
              <p className="font-title-md text-title-md text-on-surface">Modo Administrador</p>
              <p className="font-label-sm text-outline">
                Puedes validar cualquier código QR de cualquier establecimiento
              </p>
            </div>
          </div>
        </StoneCard>
      )}

      <MerchantScanner onScan={handleScan} />

      <ScanPreviewModal
        info={preview}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        isProcessing={isProcessing}
      />
    </div>
  )
}
