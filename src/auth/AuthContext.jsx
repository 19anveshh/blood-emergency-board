import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { authApi } from '../api/auth'
import { ApiError, readToken, removeToken, saveToken } from '../api/client'

const AuthContext = createContext(null)
const rolePaths = { DONOR: '/donor', HOSPITAL: '/hospital', ADMIN: '/admin' }
export const dashboardForRole = (role) => rolePaths[role] || '/'

const safeUser = (user) => {
  if (!user?.id || typeof user.name !== 'string' || typeof user.email !== 'string' || !rolePaths[user.role]) throw new ApiError('The server returned an invalid account. Please sign in again.', 401)
  return Object.fromEntries(['id', 'name', 'email', 'phone', 'role', 'bloodGroup', 'location', 'isAvailable', 'donorId', 'hospitalId', 'createdAt', 'updatedAt']
    .filter((key) => user[key] !== undefined).map((key) => [key, user[key]]))
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readToken)
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(() => Boolean(readToken()))
  const [authError, setAuthError] = useState('')
  const sessionVersion = useRef(0)

  useEffect(() => {
    const savedToken = readToken()
    if (!savedToken) { setIsLoading(false); return }
    const controller = new AbortController()
    const version = sessionVersion.current
    authApi.me(savedToken, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted && version === sessionVersion.current) {
          setCurrentUser(safeUser(data?.user))
          setToken(savedToken)
          setAuthError('')
        }
      })
      .catch((error) => {
        if (controller.signal.aborted || version !== sessionVersion.current) return
        setCurrentUser(null)
        if (error.status === 401 || error.status === 403) {
          removeToken()
          setToken(null)
          setAuthError('Your session has expired. Please sign in again.')
        } else {
          // A temporary network failure does not destroy an otherwise valid saved session.
          setAuthError(error.message || 'Unable to restore your session. Please sign in again.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted && version === sessionVersion.current) setIsLoading(false)
      })
    return () => controller.abort()
  }, [])

  const login = useCallback(async (credentials) => {
    const version = ++sessionVersion.current
    const data = await authApi.login(credentials)
    const user = safeUser(data?.user)
    if (typeof data?.token !== 'string' || !data.token) throw new ApiError('Sign-in did not return a valid session. Please try again.')
    if (version !== sessionVersion.current) throw new ApiError('Sign-in was cancelled.')
    saveToken(data.token)
    setToken(data.token)
    setCurrentUser(user)
    setAuthError('')
    setIsLoading(false)
    return user
  }, [])

  const register = useCallback(async (fields) => {
    const data = await authApi.register(fields)
    return safeUser(data?.user)
  }, [])

  const logout = useCallback(() => {
    ++sessionVersion.current
    removeToken()
    setToken(null)
    setCurrentUser(null)
    setAuthError('')
    setIsLoading(false)
  }, [])

  const value = useMemo(() => ({ currentUser, token, isAuthenticated: Boolean(token && currentUser), isLoading, authError, login, register, logout }),
    [currentUser, token, isLoading, authError, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth must be used within AuthProvider')
  return auth
}
