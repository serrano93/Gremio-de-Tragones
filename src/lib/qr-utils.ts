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

export function generateQRPayload(userId: string, missionId: string): QRPayload {
  const timestamp = new Date().toISOString()
  const raw = `${userId}:${missionId}:${timestamp}`
  const hash = sha256(raw)

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

export function verifyQRSignature(payload: QRPayload, userId: string, missionId: string): boolean {
  const raw = `${payload.u}:${payload.m}:${payload.t}`
  const expected = sha256(raw)
  return (
    payload.h === expected &&
    payload.u === userId &&
    payload.m === missionId &&
    !isQRExpired(payload)
  )
}

export function verifyOfferQRSignature(payload: OfferQRPayload, userId: string, offerId: string): boolean {
  const raw = `${payload.u}:${payload.o}:${payload.t}`
  const expected = sha256(raw)
  return (
    payload.h === expected &&
    payload.u === userId &&
    payload.o === offerId &&
    !isOfferQRExpired(payload)
  )
}

export function generateOfferQRPayload(userId: string, offerId: string): OfferQRPayload {
  const timestamp = new Date().toISOString()
  const raw = `${userId}:${offerId}:${timestamp}`
  const hash = sha256(raw)

  return {
    u: userId,
    o: offerId,
    t: timestamp,
    h: hash,
  }
}

function sha256(message: string): string {
  let hash = 0
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }

  const hex =
    (hash >>> 0).toString(16) +
    ((hash * 31 + message.length) >>> 0).toString(16) +
    ((hash * 7 + message.length * 3) >>> 0).toString(16) +
    ((hash * 17 + message.length * 7) >>> 0).toString(16)

  return hex.padStart(32, '0')
}
