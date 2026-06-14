import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { StoneCard } from '../components/ui/Card'

interface GameCardData {
  id: 'roulette' | 'flight' | 'hoard'
  title: string
  subtitle: string
  description: string
  icon: string
  color: string
  glow: string
  route: string
  costLabel?: string
}

const GAMES: GameCardData[] = [
  {
    id: 'roulette',
    title: 'Ruleta del Destino',
    subtitle: 'Gira y gana',
    description: 'Gasta 10 oro y gira la ruleta. Puedes ganar hasta 1000 oro.',
    icon: 'casino',
    color: 'from-amber-600 to-amber-900',
    glow: 'shadow-amber-500/30',
    route: '/games/roulette',
    costLabel: '10 oro / tirada',
  },
  {
    id: 'flight',
    title: "Dragon's Flight",
    subtitle: 'Vuela sin chocar',
    description: 'Controla al dragón y esquiva las columnas. Suma puntos, suma oro.',
    icon: 'flight_takeoff',
    color: 'from-sky-600 to-sky-900',
    glow: 'shadow-sky-500/30',
    route: '/games/flight',
  },
  {
    id: 'hoard',
    title: "Dragon's Hoard",
    subtitle: 'Genera oro pasivo',
    description: 'Cuida el tesoro del dragón. Genera oro aunque cierres la app.',
    icon: 'savings',
    color: 'from-emerald-600 to-emerald-900',
    glow: 'shadow-emerald-500/30',
    route: '/games/hoard',
  },
]

export default function GamesPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-lg">
      <div className="mb-base">
        <h1 className="font-display text-3xl font-bold text-primary">Juegos del Gremio</h1>
        <p className="font-label-md text-label-md text-outline mt-xs">
          Tres formas de ganar oro y subir de rango
        </p>
      </div>

      <div className="space-y-md">
        {GAMES.map((game, idx) => (
          <motion.button
            key={game.id}
            type="button"
            onClick={() => navigate(game.route)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.4 }}
            whileTap={{ scale: 0.98 }}
            className="w-full text-left"
            aria-label={`Jugar a ${game.title}`}
          >
            <StoneCard hover className={`p-md hover:${game.glow}`}>
              <div className="flex items-center gap-md">
                <div
                  className={`w-16 h-16 rounded-md bg-gradient-to-br ${game.color} flex items-center justify-center flex-shrink-0`}
                >
                  <span className="material-symbols-outlined text-3xl text-amber-100">
                    {game.icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-xl font-bold text-primary">
                    {game.title}
                  </h2>
                  <p className="font-label-sm text-amber-300">{game.subtitle}</p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant mt-xs line-clamp-2">
                    {game.description}
                  </p>
                  {game.costLabel && (
                    <p className="font-label-sm text-label-sm text-amber-400 mt-xs">
                      Coste: {game.costLabel}
                    </p>
                  )}
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">
                  chevron_right
                </span>
              </div>
            </StoneCard>
          </motion.button>
        ))}
      </div>

      <StoneCard className="p-md">
        <h3 className="font-title-md text-title-md text-on-surface mb-sm">Cómo ganar recompensas</h3>
        <ul className="space-y-xs font-label-sm text-label-sm text-on-surface-variant">
          <li>• <span className="text-amber-300">Ruleta</span>: hasta 1000 oro por tirada (1% jackpot)</li>
          <li>• <span className="text-sky-300">Dragon's Flight</span>: 5 XP por punto, 1 oro cada 5 puntos</li>
          <li>• <span className="text-emerald-300">Dragon's Hoard</span>: hasta 30 oro/minuto (nivel 5)</li>
        </ul>
      </StoneCard>
    </div>
  )
}
