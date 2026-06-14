import { NavLink, useLocation } from 'react-router-dom'

const navItems = [
  { to: '/missions', icon: 'fort', label: 'Misiones' },
  { to: '/offers', icon: 'storefront', label: 'Mercado' },
  { to: '/games', icon: 'casino', label: 'Juegos' },
  { to: '/guild', icon: 'military_tech', label: 'Rangos' },
  { to: '/profile', icon: 'inventory_2', label: 'Baúl' },
]

export function BottomNav() {
  const location = useLocation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center h-20 px-2 bg-surface-container-low border-t-2 border-outline-variant wood-texture bg-repeat"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Navegación principal"
    >
      {navItems.map(({ to, icon, label }) => {
        const isActive = location.pathname === to || (to === '/games' && location.pathname.startsWith('/games'))
        return (
          <NavLink
            key={to}
            to={to}
            className={`
              flex flex-col items-center justify-center justify-center
              min-w-[44px] min-h-[44px] px-1 rounded-lg
              transition-all duration-200 font-label-sm text-label-sm
              ${isActive
                ? 'text-secondary arcane-glow active:scale-110'
                : 'text-outline hover:text-secondary-fixed transition-all active:scale-110 duration-200'
              }
            `}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
          >
            <span
              className="material-symbols-outlined text-2xl"
              style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}
            >
              {icon}
            </span>
            <span className="text-[10px] leading-tight">{label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}