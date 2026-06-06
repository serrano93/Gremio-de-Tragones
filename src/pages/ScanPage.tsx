import { useAuth } from '../hooks/useAuth'
import { MerchantScanner } from '../components/merchant/MerchantScanner'
import { StoneCard } from '../components/ui/Card'
import { useToast } from '../components/ui/Toast'
import { supabase } from '../lib/supabase'

export default function ScanPage() {
  const { user, refreshProfile } = useAuth()
  const { toast } = useToast()

  const handleScan = async (decoded: string) => {
    try {
      const payload = JSON.parse(decoded)

      if (!payload.u || !payload.m) {
        toast('error', 'Código QR inválido: estructura incorrecta')
        return
      }

      const { data: result, error } = await supabase.rpc('verify_and_complete_mission', {
        payload,
        verifier_auth_id: user?.auth_id,
      })

      if (error) {
        toast('error', error.message)
        return
      }

      const r = result as { success: boolean; error?: string; xp_awarded?: number; new_rank?: string }

      if (!r.success) {
        toast('error', r.error || 'Error al verificar misión')
        return
      }

      toast('success', `¡Misión verificada! +${r.xp_awarded} XP para el aventurero`)
      await refreshProfile()
    } catch {
      toast('error', 'QR no válido. El código debe ser un JSON firmado por el Gremio.')
    }
  }

  if (!user || (user.role !== 'merchant' && user.role !== 'admin')) {
    return (
      <div className="space-y-lg">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary">Escanear Código</h1>
          <p className="font-label-sm text-outline">Verifica misiones de aventureros</p>
        </div>

        <StoneCard className="text-center py-xl">
          <span className="material-symbols-outlined text-outline text-6xl mb-md">shield</span>
          <h2 className="font-title-lg text-title-lg text-outline mb-sm">Acceso Restringido</h2>
          <p className="font-body-md text-outline max-w-xs mx-auto">
            Solo los miembros del Gremio de Comerciantes pueden verificar misiones.
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
        <p className="font-label-sm text-outline">Verifica misiones de aventureros</p>
      </div>

      <MerchantScanner onScan={handleScan} />
    </div>
  )
}