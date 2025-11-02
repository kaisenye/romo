const { URL, URLSearchParams } = require('url')
const supabaseAuthService = require('../services/SupabaseAuthService')

/**
 * AuthManager
 * Handles deep link URL parsing and authentication flow
 * - Parses romo:// protocol URLs
 * - Extracts auth tokens from query parameters
 * - Validates and creates session with Supabase
 */
class AuthManager {
  constructor(mainWindow) {
    this.mainWindow = mainWindow
  }

  /**
   * Set the main window reference (in case it changes)
   */
  setMainWindow(mainWindow) {
    this.mainWindow = mainWindow
  }

  /**
   * Handle deep link URL from web authentication
   * Expected format: romo://auth?access_token=xxx&refresh_token=xxx&expires_at=xxx
   *
   * @param {string} url - Deep link URL
   */
  async handleDeepLink(url) {
    try {
      // Parse URL
      const parsedUrl = new URL(url)
      const protocol = parsedUrl.protocol.replace(':', '')
      const host = parsedUrl.hostname || parsedUrl.pathname.split('?')[0].replace('//', '')
      const searchParams = new URLSearchParams(parsedUrl.search || parsedUrl.pathname.split('?')[1])

      // Validate protocol
      if (protocol !== 'romo') {
        console.warn('Invalid protocol:', protocol)
        return
      }

      // Route based on host/path
      if (host === 'auth') {
        await this.handleAuthDeepLink(searchParams)
      } else {
        console.warn('Unknown deep link host:', host)
      }
    } catch (error) {
      console.error('Error handling deep link:', error)
      this._showError('Authentication failed', 'Invalid authentication link received.')
    }
  }

  /**
   * Handle authentication deep link
   * Using hashed token approach (Supabase best practice for desktop apps)
   * @private
   */
  async handleAuthDeepLink(searchParams) {
    try {
      // Extract hashed token from query parameters
      const hashedToken = searchParams.get('hashed_token')
      const email = searchParams.get('email')

      // Validate required parameters
      if (!hashedToken || !email) {
        console.error('Missing required auth parameters in deep link')
        this._showError('Authentication failed', 'Invalid authentication data received from web.')
        return
      }

      // Verify OTP to create session
      const session = await supabaseAuthService.verifyHashedToken(hashedToken, email)

      if (session) {
        // Show window and focus it (check if window is still alive)
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          try {
            if (!this.mainWindow.isVisible()) {
              this.mainWindow.show()
            }
            this.mainWindow.focus()

            // Notify renderer of successful auth
            this.mainWindow.webContents.send('auth-state-changed', {
              user: session.user,
              session: session,
            })
          } catch {
            // Window was closed, but auth succeeded - that's OK
            // The onAuthStateChange listener will handle window transitions
          }
        }

        // Start auto-refresh now that user is authenticated
        supabaseAuthService.startAutoRefresh()

        // Show success notification
        this._showNotification('Signed In', `Welcome back, ${session.user?.email || 'user'}!`)
      }
    } catch (error) {
      console.error('Error in handleAuthDeepLink:', error)

      // Handle specific error cases
      if (error.code === 'otp_expired') {
        this._showError(
          'Authentication Link Expired',
          'The authentication link expired. Please click "Sign In" again to get a fresh link.'
        )
      } else {
        this._showError('Authentication failed', 'Failed to sign in. Please try again.')
      }
    }
  }

  /**
   * Show notification to user
   * @private
   */
  _showNotification(title, body) {
    const { Notification } = require('electron')
    if (Notification.isSupported()) {
      new Notification({
        title,
        body,
      }).show()
    }
  }

  /**
   * Show error notification
   * @private
   */
  _showError(title, message) {
    const { dialog } = require('electron')
    if (this.mainWindow) {
      dialog.showMessageBox(this.mainWindow, {
        type: 'error',
        title,
        message,
        buttons: ['OK'],
      })
    }
  }
}

module.exports = AuthManager
