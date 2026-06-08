import { useState, useEffect } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { motion } from 'framer-motion'
import { Modal } from '../ui/Modal'
import { generateOfferQRPayload, type OfferQRPayload } from '../../lib/qr-utils'
import { QR_EXPIRY_MS } from '../../lib/constants'
import type { Offer } from '../../types'

interface OfferQRGeneratorProps {
  offer: Offer | null
  userId: string
  isOpen: boolean
  onClose: () => void
}

export function OfferQRGenerator({ offer, userId, isOpen, onClose }: OfferQRGeneratorProps) {
  const [timeLeft, setTimeLeft] = useState(QR_EXPIRY_MS)
  const [payload, setPayload] = useState<OfferQRPayload | null>(null)

  useEffect(() => {
    if (isOpen && offer && userId) {
      let cancelled = false
      generateOfferQRPayload(userId, offer.id)
        .then((p) => {
          if (!cancelled) {
            setPayload(p)
            setTimeLeft(QR_EXPIRY_MS)
          }
        })
        .catch((err) => {
          console.error('Failed to generate offer QR payload:', err)
        })
      return () => { cancelled = true }
    }
  }, [isOpen, offer, userId])

  useEffect(() => {
    if (!isOpen) return
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1000) {
          onClose()
          return 0
        }
        return prev - 1000
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isOpen, onClose])

  const secondsLeft = Math.ceil(timeLeft / 1000)

  if (!offer || !payload) return null

  const qrString = JSON.stringify(payload)
  const estName = offer.establishment?.name || 'Establecimiento'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sello de Oferta" size="md">
      <div className="flex flex-col items-center gap-md">
        <p className="font-body-md text-on-surface-variant text-center max-w-md mx-auto mb-md">
          Presenta este glifo ante el Tabernero para reclamar tu oferta.
        </p>

        <div className="relative p-md bg-surface-container-high border-2 border-outline-variant">
          <div className="iron-bracket bracket-tl animate-flicker" />
          <div className="iron-bracket bracket-tr animate-flicker" />
          <div className="iron-bracket bracket-bl animate-flicker" />
          <div className="iron-bracket bracket-br animate-flicker" />

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="bg-white p-sm rounded-sm shadow-xl"
          >
            <QRCodeCanvas
              value={qrString}
              size={200}
              level="M"
              includeMargin
              aria-label={`Código QR para la oferta: ${offer.title}`}
            />
          </motion.div>
        </div>

        <div className="parchment-texture w-full max-w-md p-md rounded-lg border-2 border-[#2a2a2a] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-black/10" />
          <div className="flex justify-between items-start mb-sm">
            <div>
              <h3 className="font-title-lg text-title-lg text-on-tertiary font-bold">{estName}</h3>
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-tertiary-fixed-variant">Oferta de Gremio</span>
            </div>
            <div className="flex items-center gap-xs bg-black/10 px-sm py-xs rounded-full">
              <span className="material-symbols-outlined text-on-tertiary-container text-[18px]">hourglass_empty</span>
              <span className="font-mono font-bold text-on-tertiary-container">{String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}</span>
            </div>
          </div>
          <p className="font-body-md text-on-tertiary mb-md leading-relaxed">{offer.description || offer.title}</p>
          <div className="flex items-center gap-sm pt-sm border-t border-black/20">
            <span className="material-symbols-outlined text-on-tertiary">local_offer</span>
            <span className="font-label-lg text-label-lg text-on-tertiary">OFERTA: {offer.value || offer.title}</span>
          </div>
          {offer.gold_cost > 0 && (
            <div className="flex items-center gap-sm pt-sm border-t border-black/20">
              <span className="material-symbols-outlined text-on-tertiary">payments</span>
              <span className="font-label-lg text-label-lg text-on-tertiary">Coste: {offer.gold_cost} Oro</span>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="stone-button w-full max-w-md py-md flex items-center justify-center gap-sm group"
        >
          <span className="font-headline-md text-headline-md text-primary uppercase tracking-widest group-hover:text-shadow-gold transition-all">
            Regresar al Gremio
          </span>
          <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">keyboard_double_arrow_right</span>
        </button>
      </div>
    </Modal>
  )
}