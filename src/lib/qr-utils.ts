import { QR_EXPIRY_MS } from './constants'

export interface QRPayload {
  u: string
  m: string
  t: string
  h: string
}

export interface OfferQRPayload {
  u: string
  o: string
  t: string
  h: string
}

async function sha256(message: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    try {
      const data = new TextEncoder().encode(message)
      const buffer = await crypto.subtle.digest('SHA-256', data)
      const bytes = new Uint8Array(buffer)
      let hex = ''
      for (let i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, '0')
      }
      return hex
    } catch (err) {
      console.warn('crypto.subtle failed, falling back to server hash:', err)
    }
  }
  throw new Error('SHA-256 not available: requiere HTTPS o localhost. Si ves esto, avisa al admin.')
}

export async function generateQRPayload(userId: string, missionId: string): Promise<QRPayload> {
  const timestamp = new Date().toISOString()
  const hash = await sha256(`${userId}:${missionId}:${timestamp}`)

  return {
    u: userId,
    m: missionId,
    t: timestamp,
    h: hash,
  }
}

export function isQRExpired(payload: QRPayload): boolean {
  const ts = new Date(payload.t).getTime()
  const now = Date.now()
  return now - ts > QR_EXPIRY_MS
}

export function isOfferQRExpired(payload: OfferQRPayload): boolean {
  const ts = new Date(payload.t).getTime()
  const now = Date.now()
  return now - ts > QR_EXPIRY_MS
}

export async function verifyQRSignature(payload: QRPayload, userId: string, missionId: string): Promise<boolean> {
  const expected = await sha256(`${payload.u}:${payload.m}:${payload.t}`)
  return (
    payload.h === expected &&
    payload.u === userId &&
    payload.m === missionId &&
    !isQRExpired(payload)
  )
}

export async function verifyOfferQRSignature(payload: OfferQRPayload, userId: string, offerId: string): Promise<boolean> {
  const expected = await sha256(`${payload.u}:${payload.o}:${payload.t}`)
  return (
    payload.h === expected &&
    payload.u === userId &&
    payload.o === offerId &&
    !isOfferQRExpired(payload)
  )
}

export async function generateOfferQRPayload(userId: string, offerId: string): Promise<OfferQRPayload> {
  const timestamp = new Date().toISOString()
  const hash = await sha256(`${userId}:${offerId}:${timestamp}`)

  return {
    u: userId,
    o: offerId,
    t: timestamp,
    h: hash,
  }
}
