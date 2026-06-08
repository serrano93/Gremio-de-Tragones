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
  const showCost = !isMission && !info.isFree && (info.goldCost ?? 0) > 0
  const showFree = !isMission && info.isFree

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={isProcessing ? undefined : onCancel}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ type: 'spring', duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm max-h-[85vh] flex flex-col stone-block rounded-t-xl sm:rounded-xl overflow-hidden"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center gap-md p-md border-b border-outline-variant/30 shrink-0">
            <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary text-2xl">
                {isMission ? 'history_edu' : 'redeem'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-title-md text-title-md text-primary leading-tight">
                {isMission ? 'Validar Misión' : 'Validar Oferta'}
              </h2>
              <p className="font-label-sm text-label-sm text-outline truncate">{info.establishmentName}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-md space-y-sm">
            <div>
              <p className="font-label-sm text-label-sm text-outline uppercase tracking-wider mb-xs">
                {isMission ? 'Misión' : 'Oferta'}
              </p>
              <p className="font-title-md text-title-md text-on-surface leading-snug break-words">{info.title}</p>
              {info.description && (
                <p className="font-body-sm text-body-sm text-on-tertiary-container mt-xs line-clamp-3 break-words">
                  {info.description}
                </p>
              )}
            </div>

            {isMission ? (
              <div className="grid grid-cols-2 gap-sm pt-sm border-t border-outline-variant/20">
                <div className="flex items-center gap-sm bg-primary-container/20 px-sm py-xs rounded-md">
                  <span className="material-symbols-outlined text-tertiary text-xl ms-filled">military_tech</span>
                  <div>
                    <p className="font-label-sm text-label-sm text-outline leading-none">XP</p>
                    <p className="font-title-md text-title-md text-tertiary leading-tight">+{info.xpReward ?? 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-sm bg-primary-container/20 px-sm py-xs rounded-md">
                  <span className="material-symbols-outlined text-primary text-xl ms-filled">payments</span>
                  <div>
                    <p className="font-label-sm text-label-sm text-outline leading-none">Oro</p>
                    <p className="font-title-md text-title-md text-primary leading-tight">+{info.goldReward ?? 0}</p>
                  </div>
                </div>
              </div>
            ) : showFree ? (
              <div className="flex items-center gap-sm bg-secondary-container/20 px-sm py-xs rounded-md pt-sm border-t border-outline-variant/20">
                <span className="material-symbols-outlined text-secondary text-xl ms-filled">redeem</span>
                <p className="font-label-lg text-label-lg text-secondary">Oferta gratuita</p>
              </div>
            ) : showCost ? (
              <div className="flex items-center gap-sm bg-primary-container/20 px-sm py-xs rounded-md pt-sm border-t border-outline-variant/20">
                <span className="material-symbols-outlined text-primary text-xl ms-filled">payments</span>
                <div>
                  <p className="font-label-sm text-label-sm text-outline leading-none">Coste</p>
                  <p className="font-title-md text-title-md text-primary leading-tight">-{info.goldCost ?? 0} oro</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-sm bg-primary-container/20 px-sm py-xs rounded-md pt-sm border-t border-outline-variant/20">
                <span className="material-symbols-outlined text-primary text-xl ms-filled">payments</span>
                <p className="font-label-lg text-label-lg text-primary">-{info.goldCost ?? 0} oro</p>
              </div>
            )}
          </div>

          <div className="flex gap-sm p-md border-t border-outline-variant/30 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="gold"
              size="sm"
              onClick={onConfirm}
              isLoading={isProcessing}
              className="flex-1"
            >
              <span className="material-symbols-outlined text-base">check_circle</span>
              Confirmar
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
