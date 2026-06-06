export interface BluetoothDevice {
  name: string
  address: string
}

export interface ParkingLocation {
  id: string
  timestamp: number
  latitude: number
  longitude: number
  deviceName: string
}

export interface AppState {
  selectedDevice: BluetoothDevice | null
  currentLocation: ParkingLocation | null
  history: ParkingLocation[]
  hasPermissions: boolean
  isServiceRunning: boolean
}