import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import localforage from 'localforage'

const MUSIC_KEY = 'music_enabled'

export function BackgroundMusic() {
  const { user } = useAuth()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    localforage.getItem<boolean>(MUSIC_KEY).then((val) => {
      setEnabled(val ?? false)
      setReady(true)
    })
  }, [])

  useEffect(() => {
    if (!ready) return
    localforage.setItem(MUSIC_KEY, enabled)
    if (audioRef.current) {
      if (enabled) {
        audioRef.current.play().catch(() => {})
      } else {
        audioRef.current.pause()
      }
    }
  }, [enabled, ready])

  useEffect(() => {
    if (audioRef.current && enabled) {
      audioRef.current.play().catch(() => {})
    }
  }, [enabled])

  if (!user) return null

  return (
    <>
      <audio
        ref={audioRef}
        src="/Castles Under Crimson Skies.mp3"
        loop
        preload="auto"
      />
      <button
        onClick={() => setEnabled(!enabled)}
        className="fixed bottom-24 right-4 z-50 w-12 h-12 rounded-full bg-surface-container-high border border-primary/30 flex items-center justify-center shadow-lg"
        aria-label={enabled ? 'Silenciar música' : 'Activar música'}
      >
        <span className="material-symbols-outlined text-primary">
          {enabled ? 'volume_up' : 'volume_off'}
        </span>
      </button>
    </>
  )
}