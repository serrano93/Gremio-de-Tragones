import { useAuth } from '../../hooks/useAuth'

export function TopBar() {
  const { user } = useAuth()

  return (
    <header
      className="bg-surface-dim flex justify-between items-center w-full h-16 px-4 border-b-2 border-outline-variant fixed top-0 z-50"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-primary overflow-hidden flex items-center justify-center bg-surface-container-high shrink-0">
          {user?.avatar_url ? (
            <img
              alt="Adventurer Sigil"
              src={user.avatar_url}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="material-symbols-outlined text-primary">person</span>
          )}
        </div>
        <span className="font-display-lg text-xl text-primary text-gradient-primary truncate max-w-[180px] sm:max-w-none">
          Gremio de Tragones
        </span>
      </div>
      {user && user.auth_id && (
        <div className="flex items-center gap-1 bg-surface-container-high px-md py-xs rounded-full border border-primary/30">
          <span className="material-symbols-outlined text-primary text-lg">payments</span>
          <span className="font-label-lg text-primary">{user.gold ?? 0}</span>
        </div>
      )}
    </header>
  )
}