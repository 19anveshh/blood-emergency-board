import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { dashboardForRole, useAuth } from './AuthContext'

export function AuthLoading() {
  return <div className="auth-loading" role="status" aria-live="polite"><span className="auth-spinner" aria-hidden="true" /><p>Restoring your session…</p></div>
}

export function ProtectedRoute({ roles }) {
  const { currentUser, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return <AuthLoading />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(currentUser.role)) return <Navigate to={dashboardForRole(currentUser.role)} replace />
  return <Outlet />
}

export function GuestRoute() {
  const { currentUser, isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <AuthLoading />
  if (isAuthenticated) return <Navigate to={dashboardForRole(currentUser.role)} replace />
  return <Outlet />
}
