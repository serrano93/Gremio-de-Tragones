import localforage from 'localforage'
import type { BluetoothDevice, ParkingLocation } from '../types'

const STORAGE_KEYS = {
  SELECTED_DEVICE: 'selected_device',
  PARKING_HISTORY: 'parking_history',
  CURRENT_LOCATION: 'current_location',
} as const

export const storage = {
  async getSelectedDevice(): Promise<BluetoothDevice | null> {
    return localforage.getItem(STORAGE_KEYS.SELECTED_DEVICE)
  },

  async setSelectedDevice(device: BluetoothDevice | null): Promise<void> {
    await localforage.setItem(STORAGE_KEYS.SELECTED_DEVICE, device)
  },

  async getHistory(): Promise<ParkingLocation[]> {
    const history = await localforage.getItem<ParkingLocation[]>(STORAGE_KEYS.PARKING_HISTORY)
    return history || []
  },

  async addLocation(location: ParkingLocation): Promise<void> {
    const history = await this.getHistory()
    history.unshift(location)
    if (history.length > 10) {
      history.pop()
    }
    await localforage.setItem(STORAGE_KEYS.PARKING_HISTORY, history)
    await localforage.setItem(STORAGE_KEYS.CURRENT_LOCATION, location)
  },

  async getCurrentLocation(): Promise<ParkingLocation | null> {
    return localforage.getItem(STORAGE_KEYS.CURRENT_LOCATION)
  },

  async clearHistory(): Promise<void> {
    await localforage.setItem(STORAGE_KEYS.PARKING_HISTORY, [])
    await localforage.setItem(STORAGE_KEYS.CURRENT_LOCATION, null)
  },
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Hace un momento'
  if (diffMins < 60) return `Hace ${diffMins} minutos`
  if (diffHours < 24) return `Hace ${diffHours} horas`
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} días`

  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function openGoogleMaps(lat: number, lng: number): void {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  window.location.href = url
}

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}