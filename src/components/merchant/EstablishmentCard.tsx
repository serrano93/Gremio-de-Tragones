import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { WaxSeal } from '../ui/WaxSeal'
import type { Establishment } from '../../types'

interface EstablishmentCardProps {
  establishment: Establishment
  onEdit?: (est: Establishment) => void
  onToggle?: (est: Establishment) => void
  showActions?: boolean
}

export function EstablishmentCard({ establishment, onEdit, onToggle, showActions = false }: EstablishmentCardProps) {
  return (
    <Card className="hover:bg-surface-container transition-colors group">
      <div className="flex items-center justify-between p-md">
        <div className="flex items-center gap-md">
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-2 border-[#2a2a2a] p-0.5 bg-[#121212]">
              <div className="w-full h-full rounded-full bg-surface-container flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-xl">storefront</span>
              </div>
            </div>
            <WaxSeal status={establishment.is_active ? 'online' : 'suspended'} className="absolute -bottom-1 -right-1" />
          </div>
          <div>
            <h4 className="font-title-lg text-title-lg text-on-surface">{establishment.name}</h4>
            {establishment.description && (
              <p className="font-label-sm text-outline line-clamp-1">{establishment.description}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className={`font-label-lg ${establishment.is_active ? 'text-secondary' : 'text-error'}`}>
            {establishment.is_active ? 'Open' : 'Suspended'}
          </span>
        </div>
      </div>

      {showActions && (
        <div className="flex gap-sm pt-sm border-t border-outline-variant">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(establishment)}>
              <span className="material-symbols-outlined text-lg">edit</span>
              Editar
            </Button>
          )}
          {onToggle && (
            <Button variant="ghost" size="sm" onClick={() => onToggle(establishment)}>
              <span className="material-symbols-outlined text-lg">power_settings_new</span>
              {establishment.is_active ? 'Desactivar' : 'Activar'}
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}