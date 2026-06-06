import localforage from 'localforage'

localforage.config({
  name: 'GremioDragones',
  storeName: 'guest_progress',
  description: 'Progreso local para usuarios invitados',
})

export interface GuestProgress {
  guestId: string
  xp: number
  completedMissions: string[]
  createdAt: string
}

function generateGuestId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'guest_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

export async function getOrCreateGuestProfile(): Promise<GuestProgress> {
  const existing = await localforage.getItem<GuestProgress>('guestProfile')
  if (existing) return existing

  const profile: GuestProgress = {
    guestId: generateGuestId(),
    xp: 0,
    completedMissions: [],
    createdAt: new Date().toISOString(),
  }

  await localforage.setItem('guestProfile', profile)
  return profile
}

export async function updateGuestXP(missionId: string, xpReward: number): Promise<GuestProgress> {
  const profile = await getOrCreateGuestProfile()
  if (profile.completedMissions.includes(missionId)) {
    return profile
  }

  profile.xp += xpReward
  profile.completedMissions.push(missionId)
  await localforage.setItem('guestProfile', profile)
  return profile
}

export async function clearGuestProfile(): Promise<void> {
  await localforage.removeItem('guestProfile')
}

export async function getGuestProfile(): Promise<GuestProgress | null> {
  return localforage.getItem<GuestProgress>('guestProfile')
}

const appSettingsStore = localforage.createInstance({
  name: 'GremioDragones',
  storeName: 'app_settings',
  description: 'Configuración de la aplicación',
})

export async function getHasSeenBando(): Promise<boolean> {
  return (await appSettingsStore.getItem<boolean>('hasSeenBando')) ?? false
}

export async function setHasSeenBando(value: boolean): Promise<void> {
  await appSettingsStore.setItem('hasSeenBando', value)
}
