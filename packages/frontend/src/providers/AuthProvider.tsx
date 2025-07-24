import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, AuthTokens } from '../types'
import apiClient from '../services/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (tokens: AuthTokens) => void
  logout: () => void
  updateUser: (user: User) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user

  // Check if user is already logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const accessToken = apiClient.getAccessToken()
        if (accessToken) {
          const response = await apiClient.get<{ user: User }>('/auth/me')
          setUser(response.user)
        }
      } catch (error) {
        // Token is invalid, clear it
        apiClient.clearTokens()
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = (tokens: AuthTokens) => {
    apiClient.setTokens(tokens)
    // User will be set by the calling component after getting user info
  }

  const logout = () => {
    apiClient.clearTokens()
    setUser(null)
    window.location.href = '/login'
  }

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser)
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
} 