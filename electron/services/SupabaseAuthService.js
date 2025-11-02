const { createClient } = require('@supabase/supabase-js')
const { safeStorage } = require('electron')
const fs = require('fs').promises
const path = require('path')
const { app } = require('electron')
const { SUPABASE_CONFIG } = require('../utils/Constants')

/**
 * SupabaseAuthService
 * Manages user authentication sessions with Supabase
 * - Stores tokens securely using Electron's safeStorage API
 * - Handles session creation from web deep links
 * - Auto-refreshes tokens when app is active
 * - Provides auth state change listeners
 */
class SupabaseAuthService {
  constructor() {
    this.supabase = null
    this.isInitialized = false
    this.authStateCallbacks = []
    this.autoRefreshEnabled = false
    this.tokenFilePath = path.join(app.getPath('userData'), 'auth-session.enc')
  }

  /**
   * Initialize the Supabase client
   */
  async initialize() {
    try {
      console.log('Initializing SupabaseAuthService...')

      if (!SUPABASE_CONFIG.URL || !SUPABASE_CONFIG.ANON_KEY) {
        throw new Error('Supabase configuration missing. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env')
      }

      // Create Supabase client
      this.supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY, {
        auth: {
          autoRefreshToken: false, // We'll manage refresh manually
          persistSession: false, // We handle persistence with safeStorage
          detectSessionInUrl: false, // Not needed for Electron
        },
      })

      // Try to load existing session
      await this.loadStoredSession()

      // Set up auth state change listener
      this.supabase.auth.onAuthStateChange((event, session) => {
        console.log(`Auth state changed: ${event}`)
        this._notifyAuthStateChange(event, session)
      })

      this.isInitialized = true
      console.log('SupabaseAuthService initialized successfully')
    } catch (error) {
      console.error('Failed to initialize SupabaseAuthService:', error)
      throw error
    }
  }

  /**
   * Verify hashed token from web authentication (best practice for desktop apps)
   * This creates a separate session for the desktop app
   * @param {string} hashedToken - Hashed token from magic link
   * @param {string} email - User email
   * @returns {Object|null} Session object or null
   */
  async verifyHashedToken(hashedToken, email) {
    if (!this.supabase) {
      console.error('Cannot verify token: Supabase client not initialized')
      throw new Error('Supabase client not initialized')
    }

    try {
      console.log('[SupabaseAuth] Verifying hashed token for:', email)

      const { data, error } = await this.supabase.auth.verifyOtp({
        token_hash: hashedToken,
        type: 'email',
      })

      if (error) {
        console.error('[SupabaseAuth] ❌ Failed to verify token:', error.message)
        throw error
      }

      if (!data.session) {
        console.error('[SupabaseAuth] ❌ No session returned after verifying token')
        return null
      }

      console.log('[SupabaseAuth] ✅ OTP verified, setting session...')

      // Explicitly set the session to ensure onAuthStateChange fires
      // This is important when persistSession: false is set
      const { data: sessionData, error: sessionError } = await this.supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })

      if (sessionError) {
        console.error('[SupabaseAuth] ❌ Failed to set session:', sessionError.message)
        throw sessionError
      }

      // Store tokens securely
      await this.storeSession(sessionData.session)

      console.log('[SupabaseAuth] ✅ Session set successfully:', sessionData.user?.email)
      console.log('[SupabaseAuth] ✅ Auth state change event should fire now...')

      return sessionData.session
    } catch (error) {
      console.error('[SupabaseAuth] ❌ Error verifying hashed token:', error)
      throw error
    }
  }

  /**
   * Set session from web authentication tokens (legacy method)
   * @deprecated Use verifyHashedToken instead for better security
   * @param {string} accessToken - JWT access token
   * @param {string} refreshToken - Refresh token
   */
  async setSession(accessToken, refreshToken) {
    if (!this.supabase) {
      console.error('Cannot set session: Supabase client not initialized')
      throw new Error('Supabase client not initialized')
    }

    try {
      console.log('Setting session from web tokens...')

      const { data, error } = await this.supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (error) {
        console.error('Failed to set session:', error.message)
        throw error
      }

      // Store tokens securely
      await this.storeSession(data.session)

      console.log('Session set successfully:', data.user?.email)
      return data.session
    } catch (error) {
      console.error('Error setting session:', error)
      throw error
    }
  }

  /**
   * Get current session
   * @returns {Object|null} Current session or null
   */
  async getSession() {
    if (!this.supabase) {
      console.warn('Cannot get session: Supabase client not initialized')
      return null
    }

    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession()
      return session
    } catch (error) {
      console.error('Error getting session:', error)
      return null
    }
  }

  /**
   * Get current user
   * @returns {Object|null} Current user or null
   */
  async getUser() {
    if (!this.supabase) {
      console.warn('Cannot get user: Supabase client not initialized')
      return null
    }

    try {
      const {
        data: { user },
      } = await this.supabase.auth.getUser()
      return user
    } catch (error) {
      console.error('Error getting user:', error)
      return null
    }
  }

  /**
   * Manually refresh the session
   * @returns {Object|null} Refreshed session or null
   */
  async refreshSession() {
    if (!this.supabase) {
      console.warn('Cannot refresh session: Supabase client not initialized')
      return null
    }

    try {
      console.log('Manually refreshing session...')

      const {
        data: { session },
        error,
      } = await this.supabase.auth.refreshSession()

      if (error) {
        console.error('Failed to refresh session:', error.message)
        throw error
      }

      if (session) {
        await this.storeSession(session)
        console.log('Session refreshed successfully')
      }

      return session
    } catch (error) {
      console.error('Error refreshing session:', error)
      return null
    }
  }

  /**
   * Sign out and clear stored session
   */
  async signOut() {
    if (!this.supabase) {
      console.warn('Cannot sign out: Supabase client not initialized')
      await this.clearStoredSession()
      return
    }

    try {
      console.log('Signing out...')

      await this.supabase.auth.signOut()
      await this.clearStoredSession()

      console.log('Signed out successfully')
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  /**
   * Start auto-refresh (call when app becomes active)
   */
  startAutoRefresh() {
    if (!this.supabase) {
      console.warn('Cannot start auto-refresh: Supabase client not initialized')
      return
    }

    if (!this.autoRefreshEnabled) {
      console.log('Starting auto-refresh...')
      this.supabase.auth.startAutoRefresh()
      this.autoRefreshEnabled = true
    }
  }

  /**
   * Stop auto-refresh (call when app becomes inactive)
   */
  stopAutoRefresh() {
    if (!this.supabase) {
      console.warn('Cannot stop auto-refresh: Supabase client not initialized')
      return
    }

    if (this.autoRefreshEnabled) {
      console.log('Stopping auto-refresh...')
      this.supabase.auth.stopAutoRefresh()
      this.autoRefreshEnabled = false
    }
  }

  /**
   * Register a callback for auth state changes
   * @param {Function} callback - Callback function (event, session) => void
   */
  onAuthStateChange(callback) {
    this.authStateCallbacks.push(callback)
  }

  /**
   * Store session securely using Electron's safeStorage
   * @private
   */
  async storeSession(session) {
    try {
      if (!session) return

      const sessionData = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        user: session.user,
      }

      // Encrypt session data
      const buffer = safeStorage.encryptString(JSON.stringify(sessionData))

      // Write encrypted buffer to file
      await fs.writeFile(this.tokenFilePath, buffer)

      console.log('Session stored securely')
    } catch (error) {
      console.error('Failed to store session:', error)
    }
  }

  /**
   * Load stored session from encrypted file
   * @private
   */
  async loadStoredSession() {
    try {
      // Check if encrypted session file exists
      const buffer = await fs.readFile(this.tokenFilePath)

      // Decrypt session data
      const decrypted = safeStorage.decryptString(buffer)
      const sessionData = JSON.parse(decrypted)

      // Check if session is expired
      const expiresAt = sessionData.expires_at
      if (expiresAt && expiresAt * 1000 < Date.now()) {
        console.log('Stored session is expired, will attempt refresh...')
      }

      // Restore session
      const { data, error } = await this.supabase.auth.setSession({
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token,
      })

      if (error) {
        console.error('Failed to restore session:', error.message)
        await this.clearStoredSession()
        return
      }

      console.log('Session restored from storage:', data.user?.email)
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('No stored session found')
      } else {
        console.error('Error loading stored session:', error.message)
        // Clear corrupted session file
        await this.clearStoredSession()
      }
    }
  }

  /**
   * Clear stored session file
   * @private
   */
  async clearStoredSession() {
    try {
      await fs.unlink(this.tokenFilePath)
      console.log('Stored session cleared')
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error clearing stored session:', error)
      }
    }
  }

  /**
   * Notify all registered callbacks of auth state change
   * @private
   */
  _notifyAuthStateChange(event, session) {
    this.authStateCallbacks.forEach((callback) => {
      try {
        callback(event, session)
      } catch (error) {
        console.error('Error in auth state change callback:', error)
      }
    })
  }

  /**
   * Shutdown service
   */
  async shutdown() {
    console.log('Shutting down SupabaseAuthService...')
    this.stopAutoRefresh()
    this.authStateCallbacks = []
    this.isInitialized = false
  }
}

// Create singleton instance
const supabaseAuthService = new SupabaseAuthService()

module.exports = supabaseAuthService
