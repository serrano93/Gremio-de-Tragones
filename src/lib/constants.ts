export const RANK_THRESHOLDS: Record<string, number> = {
  F: 0,
  E: 100,
  D: 300,
  C: 600,
  B: 1000,
  A: 1600,
  S: 2500,
} as const

export const RANK_NAMES: Record<string, string> = {
  F: 'Forastero',
  E: 'Explorador',
  D: 'Defensor',
  C: 'Capitán',
  B: 'Barón',
  A: 'Archimago',
  S: 'Señor Dragón',
} as const

export const RANKS_ASC: string[] = ['F', 'E', 'D', 'C', 'B', 'A', 'S']

export const RANK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  F: { bg: 'bg-slate-700', text: 'text-slate-300', border: 'border-slate-500' },
  E: { bg: 'bg-forest', text: 'text-emerald', border: 'border-emerald/40' },
  D: { bg: 'bg-blue-900', text: 'text-blue-400', border: 'border-blue-400/40' },
  C: { bg: 'bg-purple-900', text: 'text-purple-400', border: 'border-purple-400/40' },
  B: { bg: 'bg-amber-900', text: 'text-amber-400', border: 'border-amber-400/40' },
  A: { bg: 'bg-red-900', text: 'text-red-400', border: 'border-red-400/40' },
  S: { bg: 'bg-yellow-600', text: 'text-yellow-100', border: 'border-yellow-300' },
}

export const ROLES = ['adventurer', 'merchant', 'admin'] as const
export type AppRole = (typeof ROLES)[number]

export const MISSION_STATUSES = ['pending', 'completed', 'verified'] as const
export type MissionStatus = (typeof MISSION_STATUSES)[number]

export const MISSION_TYPES = ['bebida', 'comida', 'visita', 'reto'] as const
export type MissionType = (typeof MISSION_TYPES)[number]

export const MISSION_TYPE_LABELS: Record<string, string> = {
  bebida: 'Bebida',
  comida: 'Comida',
  visita: 'Visita',
  reto: 'Reto',
}

export const MISSION_TYPE_ICONS: Record<string, string> = {
  bebida: 'local_bar',
  comida: 'restaurant',
  visita: 'storefront',
  reto: 'emoji_events',
}

export const MISSION_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  bebida: { bg: 'bg-amber-900/40', text: 'text-amber-300', border: 'border-amber-700/50' },
  comida: { bg: 'bg-orange-900/40', text: 'text-orange-300', border: 'border-orange-700/50' },
  visita: { bg: 'bg-emerald-900/40', text: 'text-emerald-300', border: 'border-emerald-700/50' },
  reto:   { bg: 'bg-purple-900/40', text: 'text-purple-300', border: 'border-purple-700/50' },
}

export const QR_EXPIRY_MS = 2 * 60 * 1000

export const GUEST_RANK = 'F'
export const MIGRATION_XP_THRESHOLD = 100

export const NAV_ITEMS = [
  { label: 'Inicio', path: '/', icon: 'Home' },
  { label: 'Misiones', path: '/missions', icon: 'ScrollText' },
  { label: 'Gremio', path: '/guild', icon: 'Shield' },
  { label: 'Perfil', path: '/profile', icon: 'User' },
] as const
