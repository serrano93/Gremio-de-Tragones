import { useState, useEffect, useCallback } from 'react'
import { Geolocation, type Position } from '@capacitor/geolocation'
import { storage, generateId } from '../lib/storage'
import type { ParkingLocation, BluetoothDevice } from '../types'

export function useLocation() {
  const [currentLocation, setCurrentLocation] = useState<ParkingLocation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    storage.getCurrentLocation().then(setCurrentLocation)
  }, [])

  const getCurrentPosition = useCallback(async (): Promise<Position | null> => {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
      })
      return position
    } catch (err) {
      console.error('Error getting location:', err)
      setError('No se pudo obtener la ubicación')
      return null
    }
  }, [])

  const saveLocation = useCallback(async (deviceName: string): Promise<ParkingLocation | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const position = await getCurrentPosition()
      if (!position) {
        setIsLoading(false)
        return null
      }

      const newLocation: ParkingLocation = {
        id: generateId(),
        timestamp: Date.now(),
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        deviceName,
      }

      await storage.addLocation(newLocation)
      setCurrentLocation(newLocation)
      setIsLoading(false)
      return newLocation
    } catch (err) {
      console.error('Error saving location:', err)
      setError('Error al guardar la ubicación')
      setIsLoading(false)
      return null
    }
  }, [getCurrentPosition])

  return {
    currentLocation,
    isLoading,
    error,
    saveLocation,
    getCurrentPosition,
  }
}

export function useParkingHistory() {
  const [history, setHistory] = useState<ParkingLocation[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    storage.getHistory().then(setHistory)
  }, [])

  const refreshHistory = useCallback(async () => {
    setIsLoading(true)
    const h = await storage.getHistory()
    setHistory(h)
    setIsLoading(false)
  }, [])

  const clearHistory = useCallback(async () => {
    await storage.clearHistory()
    setHistory([])
  }, [])

  return {
    history,
    isLoading,
    refreshHistory,
    clearHistory,
  }
}

export function useBluetooth() {
  const [selectedDevice, setSelectedDevice] = useState<BluetoothDevice | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    storage.getSelectedDevice().then((device) => {
      setSelectedDevice(device)
    })
  }, [])

  const selectDevice = useCallback(async (device: BluetoothDevice) => {
    await storage.setSelectedDevice(device)
    setSelectedDevice(device)
    setError(null)
  }, [])

  const clearDevice = useCallback(async () => {
    await storage.setSelectedDevice(null)
    setSelectedDevice(null)
  }, [])

  return {
    selectedDevice,
    error,
    selectDevice,
    clearDevice,
  }
}