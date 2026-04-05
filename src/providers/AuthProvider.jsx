import { createContext, useContext, useEffect, useState } from 'react'

/** Dev-only: bypass login when VITE_SKIP_AUTH=true (never active in production builds). */
const DEV_SKIP_AUTH =
  import.meta.env.DEV && import.meta.env.VITE_SKIP_AUTH === 'true'

const DEV_SKIP_AUTH_USER = {
  id: 'dev-skip-auth',
  email: 'dev@local.skip',
}

/**
 * Auth Context
 * Provides authentication state and methods throughout the app
 */
const AuthContext = createContext(null)

/**
 * Hook to use auth context
 * @returns {Object} Auth state and methods
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/**
 * AuthProvider
 * Manages authentication state from Electron IPC
 *
 * @param {Object} props
 * @param {ReactNode} props.children - Child components
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Initialize auth state on mount
    const initializeAuth = async () => {
      try {
        setLoading(true)
        setError(null)

        if (DEV_SKIP_AUTH) {
          setUser(DEV_SKIP_AUTH_USER)
          setLoading(false)
          return
        }

        // Get current session
        const session = await window.electronAPI.getAuthSession()
        if (session?.user) {
          setUser(session.user)

          // Fetch subscription data
          const sub = await window.electronAPI.getSubscription()
          console.log('📊 Subscription data loaded:', sub)
          console.log('📊 Plan ID:', sub?.plan_id)
          console.log('📊 Status:', sub?.status)
          setSubscription(sub)
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err)
        setError('Failed to load authentication status')
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth state changes from main process
    window.electronAPI.onAuthStateChange((event, data) => {
      if (DEV_SKIP_AUTH) return
      console.log('Auth state changed:', data)
      setUser(data.user || null)

      // Refresh subscription when auth state changes
      if (data.user) {
        window.electronAPI.getSubscription().then((sub) => {
          console.log('📊 Subscription refreshed after auth change:', sub)
          console.log('📊 Plan ID:', sub?.plan_id)
          setSubscription(sub)
        })
      } else {
        setSubscription(null)
      }
    })

    return () => {
      // Cleanup listener if needed (Electron IPC doesn't have a standard cleanup)
    }
  }, [])

  /**
   * Sign out the current user
   */
  const signOut = async () => {
    if (DEV_SKIP_AUTH) {
      console.warn('Dev skip auth: signOut ignored')
      return
    }
    try {
      setLoading(true)
      await window.electronAPI.signOut()
      setUser(null)
      setSubscription(null)
    } catch (err) {
      console.error('Failed to sign out:', err)
      setError('Failed to sign out')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Open web browser for login
   */
  const openLogin = () => {
    if (DEV_SKIP_AUTH) {
      console.warn('Dev skip auth: openLogin ignored')
      return
    }
    window.electronAPI.openWebLogin()
  }

  /**
   * Refresh subscription data
   */
  const refreshSubscription = async () => {
    try {
      const sub = await window.electronAPI.refreshSubscription()
      setSubscription(sub)
      return sub
    } catch (err) {
      console.error('Failed to refresh subscription:', err)
      return null
    }
  }

  /**
   * Check if user is authenticated
   */
  const isAuthenticated = !!user

  /**
   * Check if user has an active subscription
   */
  const isSubscribed = subscription && ['active', 'trialing'].includes(subscription.status)

  /**
   * Get subscription tier
   */
  const subscriptionTier = subscription?.plan_id || null

  /**
   * Check if user has pro access
   */
  const hasProAccess = isSubscribed && ['pro', 'agent'].includes(subscriptionTier)

  /**
   * Check if user has agent access
   */
  const hasAgentAccess = isSubscribed && subscriptionTier === 'agent'

  const value = {
    user,
    subscription,
    loading,
    error,
    isAuthenticated,
    isSubscribed,
    subscriptionTier,
    hasProAccess,
    hasAgentAccess,
    signOut,
    openLogin,
    refreshSubscription,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
