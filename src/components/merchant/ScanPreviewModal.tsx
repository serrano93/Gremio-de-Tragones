import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../ui/Button'

export type ScanPayloadType = 'mission' | 'offer'

export interface ScanPreviewInfo {
  type: ScanPayloadType
  establishmentName: string
  title: string
  description?: string | null
  xpReward?: number
  goldReward?: number
  goldCost?: number
  isFree?: boolean
  adventurerName?: string
}

interface ScanPreviewModalProps {
  info: ScanPreviewInfo | null
  onConfirm: () => Promise<void> | void
  onCancel: () => void
  isProcessing: boolean
}

export function ScanPreviewModal({ info, onConfirm, onCancel, isProcessing }: ScanPreviewModalProps) {
  if (!info) return null

  const isMission = info.type === 'mission'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-margin-mobile bg-black/70 backdrop-blur-sm"
        onClick={isProcessing ? undefined : onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', duration: 0.4 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm stone-block rounded-xl p-xl"
          role="dialog"
          aria-modal="true"
        >
          <div className="text-center mb-lg">
            <div className="mb-md">
              <span className="material-symbols-outlined text-primary text-5xl">
                {isMission ? 'history_edu' : 'redeem'}
              </span>
            </div>
            <h2 className="font-headline-md text-headline-md text-primary mb-xs">
              {isMission ? 'Validar Misión' : 'Validar Oferta'}
            </h2>
            <p className="font-label-sm text-outline">
              Confirma la operación para el aventurero
            </p>
          </div>

          <div className="space-y-md mb-lg">
            <div className="parchment-texture p-md rounded-lg border-2 border-[#2a2a2a]">
              <p className="font-label-sm text-outline uppercase tracking-wider mb-xs">Establecimiento</p>
              <p className="font-title-md text-title-md text-on-primary">{info.establishmentName}</p>
            </div>

            <div className="parchment-texture p-md rounded-lg border-2 border-[#2a2a2a]">
              <p className="font-label-sm text-outline uppercase tracking-wider mb-xs">
                {isMission ? 'Misión' : 'Oferta'}
              </p>
              <p className="font-title-lg text-title-lg text-on-surface mb-sm">{info.title}</p>
              {info.description && (
                <p className="font-body-sm text-on-tertiary-container">{info.description}</p>
              )}
            </div>

            {isMission ? (
              <div className="grid grid-cols-2 gap-md">
                <div className="parchment-texture p-md rounded-lg border-2 border-[#2a2a2a] text-center">
                  <span className="material-symbols-outlined text-tertiary text-2xl ms-filled">military_tech</span>
                  <p className="font-label-sm text-outline uppercase mt-xs">XP</p>
                  <p className="font-display-lg text-display-lg text-tertiary">+{info.xpReward ?? 0}</p>
                </div>
                <div className="parchment-texture p-md rounded-lg border-2 border-[#2a2a2a] text-center">
                  <span className="material-symbols-outlined text-primary text-2xl ms-filled">payments</span>
                  <p className="font-label-sm text-outline uppercase mt-xs">Oro</p>
                  <p className="font-display-lg text-display-lg text-primary">+{info.goldReward ?? 0}</p>
                </div>
              </div>
            ) : (
              <div className="parchment-texture p-md rounded-lg border-2 border-[#2a2a2a] text-center">
                {info.isFree ? (
                  <>
                    <span className="material-symbols-outlined text-secondary text-3xl ms-filled">redeem</span>
                    <p className="font-title-md text-title-md text-secondary mt-xs">Gratuita</p>
                    <p className="font-label-sm text-outline">El aventurero no paga oro</p>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-primary text-3xl ms-filled">payments</span>
                    <p className="font-label-sm text-outline uppercase mt-xs">Coste</p>
                    <p className="font-display-lg text-display-lg text-primary">-{info.goldCost ?? 0}</p>
                    <p className="font-label-sm text-outline mt-xs">oro del aventurero</p>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-sm">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="gold"
              onClick={onConfirm}
              isLoading={isProcessing}
              className="flex-1"
            >
              <span className="material-symbols-outlined">check_circle</span>
              Confirmar
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
