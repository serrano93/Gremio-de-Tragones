import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextType {
  toast: (type: ToastType, message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

const icons: Record<ToastType, string> = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
}

const colors: Record<ToastType, string> = {
  success: 'border-secondary/40 bg-surface-container text-secondary',
  error: 'border-error/40 bg-surface-container text-error',
  warning: 'border-primary/40 bg-surface-container text-primary',
  info: 'border-secondary-fixed/40 bg-surface-container text-secondary-fixed',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, type, message, duration }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (type: ToastType, message: string, duration?: number) => {
      addToast(type, message, duration)
    },
    [addToast],
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed top-20 right-4 z-[100] flex flex-col gap-2 max-w-sm"
        aria-live="polite"
        aria-label="Notificaciones"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    if (t.duration && t.duration > 0) {
      const timer = setTimeout(onDismiss, t.duration)
      return () => clearTimeout(timer)
    }
  }, [t.duration, onDismiss])

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      className={`
        flex items-center gap-sm p-md rounded-lg border backdrop-blur-sm
        stone-block ${colors[t.type]}
      `}
      role="alert"
    >
      <span className="material-symbols-outlined text-xl shrink-0">{icons[t.type]}</span>
      <p className="font-label-lg text-label-lg flex-1">{t.message}</p>
      <button
        onClick={onDismiss}
        className="material-symbols-outlined text-lg text-outline hover:text-primary transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Descartar notificación"
      >
        close
      </button>
    </motion.div>
  )
}