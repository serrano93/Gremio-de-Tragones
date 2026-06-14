import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { TopBar } from './TopBar'
import { ToastProvider } from '../ui/Toast'
import { useAuth } from '../../hooks/useAuth'

const HomePage = lazy(() => import('../../pages/HomePage'))
const MissionsPage = lazy(() => import('../../pages/MissionsPage'))
const GuildPage = lazy(() => import('../../pages/GuildPage'))
const ProfilePage = lazy(() => import('../../pages/ProfilePage'))
const OffersPage = lazy(() => import('../../pages/OffersPage'))
const ScanPage = lazy(() => import('../../pages/ScanPage'))
const AdminPage = lazy(() => import('../../pages/AdminPage'))
const LoginPage = lazy(() => import('../../pages/LoginPage'))
const MerchantHomePage = lazy(() => import('../../pages/MerchantHomePage'))
const AuthCallbackPage = lazy(() => import('../../pages/AuthCallbackPage'))
const RoulettePage = lazy(() => import('../../pages/RoulettePage'))
const DragonFlightPage = lazy(() => import('../../pages/DragonFlightPage'))
const DragonHoardPage = lazy(() => import('../../pages/DragonHoardPage'))
const GamesPage = lazy(() => import('../../pages/GamesPage'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20" role="status">
      <span className="material-symbols-outlined text-primary text-5xl animate-spin">progress_activity</span>
    </div>
  )
}

const Layout = ({ children }: { children: ReactNode }) => (
  <div className="h-full w-full max-w-[480px] mx-auto bg-surface flex flex-col shrink-0">
    <TopBar />
    <main
      className="flex-1 w-full pt-20 pb-24 px-4 overflow-y-auto min-h-0"
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
    return <PageLoader />
  }
  if (!user) {
    return <Navigate to="/profile" replace />
  }
  if (user.role !== 'admin') {
    return <Navigate to="/" replace />
  }
  return children
}

function MerchantRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) {
    return <PageLoader />
  }
  if (!user) {
    return <Navigate to="/profile" replace />
  }
  if (user.role !== 'merchant' && user.role !== 'admin') {
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
            <Route path="/" element={<Navigate to="/profile" replace />} />
            <Route path="/home" element={<Layout><HomePage /></Layout>} />
            <Route path="/missions" element={<Layout><MissionsPage /></Layout>} />
            <Route path="/guild" element={<Layout><GuildPage /></Layout>} />
            <Route path="/profile" element={<Layout><ProfilePage /></Layout>} />
            <Route path="/offers" element={<Layout><OffersPage /></Layout>} />
            <Route path="/scan" element={<Layout><ScanPage /></Layout>} />
            <Route path="/admin" element={<AdminRoute><Layout><AdminPage /></Layout></AdminRoute>} />
            <Route path="/login" element={<Layout><LoginPage /></Layout>} />
            <Route path="/merchant" element={<MerchantRoute><Layout><MerchantHomePage /></Layout></MerchantRoute>} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/games" element={<Layout><GamesPage /></Layout>} />
            <Route path="/games/roulette" element={<Layout><RoulettePage /></Layout>} />
            <Route path="/games/flight" element={<Layout><DragonFlightPage /></Layout>} />
            <Route path="/games/hoard" element={<Layout><DragonHoardPage /></Layout>} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  )
}
