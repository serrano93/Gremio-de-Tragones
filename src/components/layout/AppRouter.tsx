import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { TopBar } from './TopBar'
import { ToastProvider } from '../ui/Toast'
import { useAuth } from '../../hooks/useAuth'
import { Loader2 } from 'lucide-react'

const HomePage = lazy(() => import('../../pages/HomePage'))
const MissionsPage = lazy(() => import('../../pages/MissionsPage'))
const GuildPage = lazy(() => import('../../pages/GuildPage'))
const ProfilePage = lazy(() => import('../../pages/ProfilePage'))
const OffersPage = lazy(() => import('../../pages/OffersPage'))
const ScanPage = lazy(() => import('../../pages/ScanPage'))
const AdminPage = lazy(() => import('../../pages/AdminPage'))
const LoginPage = lazy(() => import('../../pages/LoginPage'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20" role="status">
      <span className="material-symbols-outlined text-primary text-5xl animate-spin">progress_activity</span>
    </div>
  )
}

const Layout = ({ children }: { children: ReactNode }) => (
  <div className="h-full bg-surface flex flex-col">
    <TopBar />
    <main
      className="flex-1 w-full max-w-[480px] mx-auto pt-20 pb-24 px-4 overflow-y-auto"
      style={{
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        touchAction: 'pan-y',
      }}
    >
      {children}
    </main>
    <BottomNav />
  </div>
)

function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    )
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}

export function AppRouter() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Layout><HomePage /></Layout>} />
            <Route path="/missions" element={<Layout><MissionsPage /></Layout>} />
            <Route path="/guild" element={<Layout><GuildPage /></Layout>} />
            <Route path="/profile" element={<Layout><ProfilePage /></Layout>} />
            <Route path="/offers" element={<Layout><OffersPage /></Layout>} />
            <Route path="/scan" element={<Layout><ScanPage /></Layout>} />
            <Route path="/admin" element={<AdminRoute><Layout><AdminPage /></Layout></AdminRoute>} />
            <Route path="/login" element={<Layout><LoginPage /></Layout>} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  )
}