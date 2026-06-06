import { useAuth } from '../hooks/useAuth'
import { AdminDashboard } from '../components/admin/AdminDashboard'
import { StoneCard } from '../components/ui/Card'

export default function AdminPage() {
  const { user } = useAuth()

  if (!user || user.role !== 'admin') {
    return (
      <div className="space-y-lg">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary">Panel de Administración</h1>
          <p className="font-label-sm text-outline">Gestiona el Gremio de Tragones</p>
        </div>

        <StoneCard className="text-center py-xl">
          <span className="material-symbols-outlined text-outline text-6xl mb-md">shield</span>
          <h2 className="font-title-lg text-title-lg text-outline mb-sm">Acceso Restringido</h2>
          <p className="font-body-md text-outline max-w-xs mx-auto">
            Solo los administradores del Gremio pueden acceder a este panel.
          </p>
        </StoneCard>
      </div>
    )
  }

  return (
    <div className="space-y-lg">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-primary">Panel de Administración</h1>
        <p className="font-label-sm text-outline">Gestiona el Gremio de Tragones</p>
      </div>

      <AdminDashboard user={user} />
    </div>
  )
}