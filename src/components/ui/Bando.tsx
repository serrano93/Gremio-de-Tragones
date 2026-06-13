import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './Button'

const BANDO_SEEN_KEY = 'gremio_bando_seen'

interface BandoProps {
  isGuest: boolean
}

export function Bando({ isGuest }: BandoProps) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isGuest) return
    if (typeof window === 'undefined') return
    const seen = window.localStorage.getItem(BANDO_SEEN_KEY)
    if (!seen) setIsOpen(true)
  }, [isGuest])

  if (!isGuest) {
    return null
  }

  const handleClose = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(BANDO_SEEN_KEY, '1')
    }
    setIsOpen(false)
    navigate('/profile', { replace: true })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="min-h-screen flex flex-col">
            <div className="flex-1 flex items-start justify-center px-margin-mobile py-xxl">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', duration: 0.5, bounce: 0.2 }}
                className="w-full max-w-lg scroll-unroll rounded-xl overflow-hidden mt-xxl"
              >
                <div className="p-xl text-center">
                  <motion.h2
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="font-display text-headline-lg text-[#8b5e3c] mb-lg tracking-wider"
                  >
                    PROCLAMA DEL GREMIO DE TRAGONES
                  </motion.h2>

                  <div className="space-y-md text-left">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="font-body-md text-[#3d2b1f] leading-relaxed"
                    >
                      Sabed, honorables viajeros, que este Gremio ha abierto sus puertas a valientes aventureros del comercio local.
                    </motion.p>

                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="font-body-md text-[#3d2b1f] leading-relaxed"
                    >
                      El Gremio de Tragones es una hermandad que conecta a los comerciantes de la tierra — taberneros, artesanos, mercaderes y herreros de nuestros propios lares — con aquellos que buscan completar misiones y ganar recompensas.
                    </motion.p>

                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="font-body-md text-[#3d2b1f] leading-relaxed"
                    >
                      Aquí no encontrarás cadenas de otros reinos ni franquicias de tierras lejanas. Solo el calor del hogar, la calidad de lo cercano y el orgullo de apoyar a quienes nos rodean.
                    </motion.p>

                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="font-body-md text-[#3d2b1f] leading-relaxed"
                    >
                      Únete, completa misiones, gana XP y asciende en rangos. Pero sobre todo: consume local y apoya a tu reino.
                    </motion.p>
                  </div>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-xl font-body-md text-[#5a4030] italic text-right"
                  >
                    — Cámara del Rey, por la gloria del comercio de proximidad —
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="mt-xl"
                  >
                    <Button
                      variant="stone"
                      onClick={handleClose}
                      className="w-full"
                    >
                      Enterrar el Bando
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}
