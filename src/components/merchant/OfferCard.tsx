import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import type { Offer } from '../../types'

interface OfferCardProps {
  offer: Offer
  isSpecial?: boolean
  onUseOffer?: (offer: Offer) => void
}

const typeLabels: Record<string, string> = {
  free_item: 'Gratis',
  discount: 'Descuento',
  exclusive: 'Exclusivo',
  other: 'Especial',
}

export function OfferCard({ offer, isSpecial = false, onUseOffer }: OfferCardProps) {
  const isValid = !offer.valid_until || new Date(offer.valid_until) >= new Date()

  return (
    <Card className={isSpecial ? 'border-primary/40' : ''}>
      <div className="flex items-start gap-md">
        <div className={`p-md rounded-lg shrink-0 ${isSpecial ? 'bg-primary/20' : 'bg-surface-container'}`}>
          <span className="material-symbols-outlined text-2xl text-primary">redeem</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-sm mb-xs flex-wrap">
            <h3 className="font-title-lg text-title-lg text-on-surface">{offer.title}</h3>
            <span className="px-sm py-xs bg-primary-container text-on-primary-container font-label-sm rounded-sm uppercase tracking-widest">
              {typeLabels[offer.type] || offer.type}
            </span>
            {offer.required_rank !== 'F' && (
              <span className="px-sm py-xs bg-surface-container text-outline font-label-sm rounded-sm uppercase tracking-widest">
                Rango {offer.required_rank}+
              </span>
            )}
          </div>
          {offer.description && (
            <p className="font-body-md text-on-surface-variant mb-sm line-clamp-2">{offer.description}</p>
          )}
          {offer.value && (
            <p className="font-display-lg text-headline-md text-primary">{offer.value}</p>
          )}
          <div className="flex items-center gap-md mt-sm font-label-sm text-outline">
            {offer.establishment?.name && (
              <span className="flex items-center gap-xs">
                <span className="material-symbols-outlined text-sm">storefront</span>
                {offer.establishment.name}
              </span>
            )}
            {offer.valid_until && (
              <span className="flex items-center gap-xs">
                <span className="material-symbols-outlined text-sm">schedule</span>
                Hasta {new Date(offer.valid_until).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
              </span>
            )}
            {!isValid && (
              <span className="px-sm py-xs bg-error-container text-on-error-container font-label-sm rounded-sm uppercase tracking-widest">
                Expirada
              </span>
            )}
          </div>
          {offer.gold_cost > 0 && (
            <div className="flex items-center gap-xs mt-sm font-label-lg text-primary">
              <span className="material-symbols-outlined text-lg">payments</span>
              <span>{offer.gold_cost} Oro</span>
            </div>
          )}
        </div>
      </div>
      {onUseOffer && isValid && (
        <div className="mt-md">
          <Button variant="gold" size="sm" onClick={() => onUseOffer(offer)} className="w-full">
            <span className="material-symbols-outlined text-lg">qr_code</span>
            Usar Oferta
          </Button>
        </div>
      )}
    </Card>
  )
}