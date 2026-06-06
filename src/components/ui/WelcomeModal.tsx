import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Button } from './Button'
import localforage from 'localforage'

const WELCOME_KEY = 'welcome_shown'

export function WelcomeModal() {
  const { user, isGuest, refreshProfile } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!user || isGuest) return

    const checkWelcome = async () => {
      const shown = (await localforage.getItem<string[]>(WELCOME_KEY)) ?? []
      if (!user.auth_id || shown.includes(user.auth_id)) {
        setChecked(true)
        return
      }
      if (user.rank === 'F') {
        setIsOpen(true)
        await localforage.setItem(WELCOME_KEY, [...shown, user.auth_id])
      }
      setChecked(true)
    }
    checkWelcome()
  }, [user, isGuest])

  const handleAccept = async () => {
    if (!user?.auth_id) return
    setLoading(true)
    const { data } = await supabase.rpc('claim_welcome_bonus', {
      p_auth_id: user.auth_id,
    })
    setLoading(false)
    if (data?.success) {
      setIsOpen(false)
      await refreshProfile()
    }
  }

  if (!checked) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-margin-mobile">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="relative z-10 w-full max-w-sm stone-block rounded-xl p-xl text-center"
            role="dialog"
            aria-modal="true"
            aria-label="Bienvenido al Gremio"
          >
            <div className="mb-lg">
              <span className="material-symbols-outlined text-primary text-5xl">emoji_events</span>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-primary mb-md">
              Bienvenido Forastero
            </h2>
            <p className="font-body-md text-on-surface-variant mb-xl leading-relaxed">
              Nos alegra que hayas decidido inscribirte en el Gremio. Aquí tienes tu primera recompensa como agradecimiento.
            </p>
            <div className="mb-lg">
              <span className="font-display text-3xl text-secondary font-bold">+100 XP</span>
            </div>
            <Button variant="gold" size="lg" onClick={handleAccept} isLoading={loading} className="w-full">
              ACEPTAR
            </Button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}