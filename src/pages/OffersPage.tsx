import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useRank } from '../hooks/useRank'
import { useOffers } from '../hooks/useOffers'
import { OfferCard } from '../components/merchant/OfferCard'
import { OfferQRGenerator } from '../components/merchant/OfferQRGenerator'
import { GuestBanner } from '../components/layout/GuestBanner'
import { GoldCard } from '../components/ui/Card'
import type { Offer } from '../types'

export default function OffersPage() {
  const { user, isGuest } = useAuth()
  const { rank } = useRank(user?.xp || 0)
  const { offers, isLoading } = useOffers(rank)
  const [showAll, setShowAll] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null)
  const [showOfferQR, setShowOfferQR] = useState(false)

  const handleUseOffer = (offer: Offer) => {
    setSelectedOffer(offer)
    setShowOfferQR(true)
  }

  const normalOffers = offers.filter((o) => o.required_rank !== 'S')
  const sRankOffers = offers.filter((o) => o.required_rank === 'S')

  return (
    <div className="space-y-lg">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-primary">Plaza del mercado</h1>
        <p className="font-label-sm text-outline">Ofertas y recompensas del Reino</p>
      </div>

      <GuestBanner isGuest={isGuest} rank={rank} xp={user?.xp || 0} />

      {isGuest && (
        <div className="flex items-center gap-sm p-md bg-primary-container/10 border border-primary-container/20 rounded-xl text-primary font-label-lg">
          <span className="material-symbols-outlined">info</span>
          Regístrate para acceder a las ofertas de los comerciantes.
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <span className="material-symbols-outlined text-primary text-5xl animate-spin">progress_activity</span>
        </div>
      ) : (
        <>
          {sRankOffers.length > 0 && rank === 'S' && (
            <div>
              <GoldCard className="mb-md">
                <div className="flex items-center gap-sm mb-md">
                  <span className="material-symbols-outlined text-primary ms-filled">star</span>
                  <h2 className="font-headline-md text-headline-md text-primary">Taberna Secreta</h2>
                </div>
                <p className="font-label-sm text-outline mb-md">
                  Ofertas exclusivas para Señores Dragón. Solo los aventureros de Rango S pueden ver este tesoro.
                </p>
                <div className="space-y-md">
                  {sRankOffers.map((offer) => (
                    <OfferCard key={offer.id} offer={offer} isSpecial onUseOffer={!isGuest ? handleUseOffer : undefined} />
                  ))}
                </div>
              </GoldCard>
            </div>
          )}

          {sRankOffers.length > 0 && rank !== 'S' && (
            <div className="text-center py-lg bg-surface-container border-2 border-outline-variant rounded-xl">
              <span className="material-symbols-outlined text-outline text-6xl mb-md">star</span>
              <p className="font-title-lg text-title-lg text-outline">Alcanza Rango S para desbloquear la Taberna Secreta</p>
            </div>
          )}

          <div>
            <h3 className="font-label-lg text-label-lg text-outline uppercase tracking-wider mb-md">Ofertas del Reino</h3>
            {normalOffers.length === 0 ? (
              <div className="text-center py-lg stone-block rounded-xl">
                <span className="material-symbols-outlined text-outline text-6xl mb-md">redeem</span>
                <p className="font-title-lg text-title-lg text-outline">No hay ofertas disponibles para tu rango actual.</p>
                <p className="font-label-sm text-outline mt-sm">Sube de rango para desbloquear más recompensas.</p>
              </div>
            ) : (
              <>
                <div className="space-y-md">
                  {(showAll ? normalOffers : normalOffers.slice(0, 5)).map((offer) => (
                    <OfferCard key={offer.id} offer={offer} onUseOffer={!isGuest ? handleUseOffer : undefined} />
                  ))}
                </div>
                {normalOffers.length > 5 && !showAll && (
                  <button
                    onClick={() => setShowAll(true)}
                    className="w-full mt-md py-sm border-2 border-outline text-outline font-label-lg uppercase tracking-tighter hover:text-primary hover:border-primary transition-all active:scale-95"
                  >
                    Ver todas las ofertas ({normalOffers.length})
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}

      <OfferQRGenerator
        offer={selectedOffer}
        userId={user?.id || ''}
        isOpen={showOfferQR}
        onClose={() => {
          setShowOfferQR(false)
          setSelectedOffer(null)
        }}
      />
    </div>
  )
}