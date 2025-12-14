const { ipcMain, Notification } = require('electron')
const { URLSearchParams } = require('url')
const fs = require('fs').promises
const { TIMEOUTS } = require('../utils/Constants.js')
const ErrorUtils = require('../utils/ErrorUtils.js')
const dictationHistoryService = require('../services/DictationHistoryService.js')
const screenCaptureService = require('../services/ScreenCaptureService.js')
const contextDetectionService = require('../services/ContextDetectionService.js')

/**
 * IPCRouter - Extracted from main.js
 * Handles all IPC communication between main and renderer processes
 * PRESERVES EXACT FUNCTIONALITY from original main.js setupIpcHandlers()
 */
class IPCRouter {
  constructor(windowManager, whisperService, llamaService) {
    this.windowManager = windowManager
    this.whisperService = whisperService
    this.llamaService = llamaService
  }

  /**
   * Register all IPC handlers
   * EXACT COPY from main.js lines 156-451
   */
  registerHandlers() {
    // Path utilities
    ipcMain.handle('get-user-data-path', () => {
      const { app } = require('electron')
      return app.getPath('userData')
    })

    ipcMain.handle('get-app-path', () => {
      const { app } = require('electron')
      return app.getAppPath()
    })

    // File system operations
    ipcMain.handle(
      'read-file',
      ErrorUtils.wrapIPCHandler(async (event, filePath) => {
        const data = await fs.readFile(filePath, 'utf8')
        return { data }
      }, 'read file')
    )

    ipcMain.handle(
      'write-file',
      ErrorUtils.wrapIPCHandler(async (event, filePath, data) => {
        await fs.writeFile(filePath, data, 'utf8')
        return { written: true }
      }, 'write file')
    )

    // Window operations
    ipcMain.handle('minimize-window', () => {
      this.windowManager.minimizeWindow()
    })

    ipcMain.handle('maximize-window', () => {
      this.windowManager.maximizeWindow()
    })

    ipcMain.handle('close-window', () => {
      this.windowManager.closeWindow()
    })

    // Notifications
    ipcMain.handle('show-notification', (event, title, body) => {
      if (Notification.isSupported()) {
        new Notification({
          title: title,
          body: body,
        }).show()
      }
    })

    // Window expansion for recording with spring animation
    ipcMain.handle('expand-window-for-recording', async () => {
      return await this.windowManager.expandWindowForRecording()
    })

    ipcMain.handle('shrink-window-to-pill', async () => {
      return await this.windowManager.shrinkWindowToPill()
    })

    ipcMain.handle('hide-window', async () => {
      return await this.windowManager.hideWindow()
    })

    ipcMain.handle('show-mode-indicator', async () => {
      return await this.windowManager.showModeIndicator()
    })

    // Clipboard and paste operations
    ipcMain.handle('paste-to-focused-app', async (event, text) => {
      try {
        const { clipboard } = require('electron')

        // Set text to clipboard
        clipboard.writeText(text)

        // DON'T hide the window - keep pill visible
        // Just ensure the previously focused app regains focus without hiding our pill

        // Small delay to ensure the target app regains focus
        setTimeout(() => {
          // Simulate Cmd+V keypress on macOS
          if (process.platform === 'darwin') {
            const { execSync } = require('child_process')
            try {
              // Use AppleScript to simulate Cmd+V
              execSync(`osascript -e 'tell application "System Events" to keystroke "v" using command down'`)
            } catch (scriptError) {
              console.warn('Failed to simulate paste keystroke:', scriptError.message)
            }
          }
        }, TIMEOUTS.PASTE_DELAY) // Was: 200

        return { success: true }
      } catch (error) {
        console.error('Failed to paste to focused app:', error)
        return { success: false, error: error.message }
      }
    })

    // AI Service handlers
    ipcMain.handle('ai-initialize', async () => {
      try {
        await this.whisperService.initialize()
        return { success: true }
      } catch (error) {
        console.error('Failed to initialize AI service:', error)
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('ai-process-chunk', async (event, audioBuffer, sampleRate, options = {}) => {
      try {
        // Detect active context and map to style
        const { AI_MODELS } = require('../utils/Constants')
        let detectedStyle = AI_MODELS.WHISPER.DEFAULT_STYLE

        try {
          const context = await contextDetectionService.detectActiveContext()
          if (context.success) {
            detectedStyle = this.mapContextToStyle(context, AI_MODELS.WHISPER.CONTEXT_STYLE_MAP)
          }
        } catch {
          // Fall back to default style on error
        }

        // Merge detected style into options
        const optionsWithStyle = {
          ...options,
          style: detectedStyle,
        }

        const result = await this.whisperService.processAudioChunk(audioBuffer, sampleRate, optionsWithStyle)
        return { success: true, result }
      } catch (error) {
        console.error('Failed to process audio chunk:', error)
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('ai-process-full-recording', async (event, audioBuffer, sampleRate, meetingId, options = {}) => {
      try {
        console.log(`Processing full recording for meeting ${meetingId}`)
        console.log('Audio buffer type:', typeof audioBuffer)
        console.log('Sample rate:', sampleRate)
        console.log('Language:', options?.language || 'auto')

        if (!audioBuffer || audioBuffer.length === 0) {
          console.error('Audio buffer is empty or invalid')
          return { success: false, error: 'Audio buffer is empty or invalid' }
        }

        // Process the audio using the same method as real-time chunks
        const result = await this.whisperService.processAudioChunk(audioBuffer, sampleRate, options)
        console.log('Whisper.cpp result:', result)

        return { success: true, result }
      } catch (error) {
        console.error('Failed to process full recording:', error)
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('ai-process-file', async (event, audioFilePath) => {
      try {
        const result = await this.whisperService.processAudioFile(audioFilePath)
        return { success: true, result }
      } catch (error) {
        console.error('Failed to process audio file:', error)
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('ai-get-status', async () => {
      try {
        return {
          success: true,
          initialized: this.whisperService.isInitialized,
          modelPath: this.whisperService.modelPath,
        }
      } catch (error) {
        console.error('Failed to get AI service status:', error)
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('ai-shutdown', async () => {
      try {
        await this.whisperService.shutdown()
        return { success: true }
      } catch (error) {
        console.error('Failed to shutdown AI service:', error)
        return { success: false, error: error.message }
      }
    })

    // LLM Service - Disabled (now using direct OpenAI API calls from React)
    // ipcMain.handle('llama-refine-transcript', async (event, transcript) => {
    //   console.log('\n🔄 LLAMA REFINEMENT REQUEST')
    //   console.log('Original transcript:', `"${transcript}"`)
    //   try {
    //     const refinedTranscript = await this.llamaService.refineTranscript(transcript)
    //     console.log('✅ LLAMA REFINEMENT SUCCESS')
    //     console.log('Refined transcript:', `"${refinedTranscript}"`)
    //     console.log('================================\n')
    //     return { success: true, refinedTranscript }
    //   } catch (error) {
    //     console.error('❌ LLAMA REFINEMENT FAILED:', error.message)
    //     console.log('================================\n')
    //     return { success: false, error: error.message }
    //   }
    // })

    // Agent Mode handlers - Disabled (now using direct OpenAI API calls from React)
    // ipcMain.handle('agent-process-request', async (event, transcript) => {
    //   console.log('\n🤖 AGENT MODE REQUEST')
    //   console.log('Original transcript:', `"${transcript}"`)
    //   try {
    //     const result = await this.llamaService.processAgentRequest(transcript)
    //     console.log('✅ AGENT MODE SUCCESS')
    //     console.log('Result:', result)
    //     console.log('================================\n')
    //     return result
    //   } catch (error) {
    //     console.error('❌ AGENT MODE FAILED:', error.message)
    //     console.log('================================\n')
    //     return { success: false, error: error.message, fallbackContent: transcript }
    //   }
    // })

    // Dictation History handlers
    ipcMain.handle(
      'get-dictation-history',
      ErrorUtils.wrapIPCHandler(async () => {
        console.log('Getting dictation history...')
        const history = await dictationHistoryService.getHistory()
        console.log(`Retrieved ${history.length} dictation entries`)
        return history
      }, 'get dictation history')
    )

    ipcMain.handle(
      'get-dictation-stats',
      ErrorUtils.wrapIPCHandler(async () => {
        console.log('Getting dictation statistics...')
        const stats = await dictationHistoryService.getStatistics()
        console.log('Retrieved dictation stats:', stats)
        return stats
      }, 'get dictation stats')
    )

    ipcMain.handle(
      'add-dictation-entry',
      ErrorUtils.wrapIPCHandler(async (event, entry) => {
        console.log('Adding dictation entry:', { text: entry.text?.substring(0, 50) + '...', duration: entry.duration })
        const savedEntry = await dictationHistoryService.addEntry(entry)
        console.log('Dictation entry saved with ID:', savedEntry.id)
        return savedEntry
      }, 'add dictation entry')
    )

    ipcMain.handle(
      'delete-dictation-entry',
      ErrorUtils.wrapIPCHandler(async (event, id) => {
        console.log('Deleting dictation entry:', id)
        const success = await dictationHistoryService.deleteEntry(id)
        console.log(`Dictation entry ${id} ${success ? 'deleted' : 'not found'}`)
        return success
      }, 'delete dictation entry')
    )

    ipcMain.handle(
      'clear-dictation-history',
      ErrorUtils.wrapIPCHandler(async () => {
        console.log('Clearing all dictation history...')
        await dictationHistoryService.clearHistory()
        console.log('Dictation history cleared')
        return true
      }, 'clear dictation history')
    )

    // Screen capture handler
    ipcMain.handle(
      'capture-screen',
      ErrorUtils.wrapIPCHandler(async (event, options = {}) => {
        return await screenCaptureService.captureScreenshot(options)
      }, 'capture screen')
    )

    // Settings handlers
    ipcMain.handle(
      'get-setting',
      ErrorUtils.wrapIPCHandler(async (event, key, defaultValue = null) => {
        return await dictationHistoryService.getSetting(key, defaultValue)
      }, 'get setting')
    )

    ipcMain.handle(
      'set-setting',
      ErrorUtils.wrapIPCHandler(async (event, key, value) => {
        await dictationHistoryService.setSetting(key, value)

        // Broadcast setting change to all windows for real-time sync
        const { BrowserWindow } = require('electron')
        BrowserWindow.getAllWindows().forEach((window) => {
          window.webContents.send('setting-changed', key, value)
        })

        return true
      }, 'set setting')
    )

    // Context detection handler
    ipcMain.handle('detect-active-context', async () => {
      try {
        const context = await contextDetectionService.detectActiveContext()
        return context
      } catch (error) {
        return {
          success: false,
          error: error.message,
          appName: null,
          windowTitle: null,
          browserType: null,
          url: null,
          domain: null,
          isBrowser: false,
        }
      }
    })

    console.log('IPC handlers registered successfully')
  }

  /**
   * Map detected context to transcription style
   * @param {Object} context - Detected context object
   * @param {Object} styleMap - CONTEXT_STYLE_MAP configuration
   * @returns {string} Style name (e.g., 'email', 'text-message')
   */
  mapContextToStyle(context, styleMap) {
    // Check domain first (most specific)
    if (context.domain && styleMap.domains[context.domain]) {
      return styleMap.domains[context.domain]
    }

    // Check app name
    if (context.appName && styleMap.apps[context.appName]) {
      return styleMap.apps[context.appName]
    }

    // Check window title patterns
    if (context.windowTitle) {
      const lowerTitle = context.windowTitle.toLowerCase()
      for (const [pattern, style] of Object.entries(styleMap.windowPatterns)) {
        if (lowerTitle.includes(pattern.toLowerCase())) {
          return style
        }
      }
    }

    // Default fallback
    return styleMap.default
  }

  /**
   * Register onboarding-related IPC handlers
   */
  registerOnboardingHandlers() {
    const PermissionManager = require('./PermissionManager')

    // Check if onboarding has been completed
    ipcMain.handle('check-onboarding-status', async () => {
      try {
        const isCompleted = await dictationHistoryService.isOnboardingCompleted()
        return { success: true, completed: isCompleted }
      } catch (error) {
        console.error('Failed to check onboarding status:', error)
        return { success: false, error: error.message }
      }
    })

    // Mark onboarding as completed
    ipcMain.handle('complete-onboarding', async () => {
      try {
        await dictationHistoryService.completeOnboarding()
        return { success: true }
      } catch (error) {
        console.error('Failed to complete onboarding:', error)
        return { success: false, error: error.message }
      }
    })

    // Reset onboarding status (for dev/testing)
    ipcMain.handle('reset-onboarding', async () => {
      try {
        await dictationHistoryService.resetOnboarding()
        return { success: true }
      } catch (error) {
        console.error('Failed to reset onboarding:', error)
        return { success: false, error: error.message }
      }
    })

    // Get current permission status
    ipcMain.handle('get-permission-status', async () => {
      try {
        const micStatus = PermissionManager.getMicrophonePermissionStatus()
        const screenStatus = PermissionManager.getScreenRecordingPermissionStatus()

        return {
          success: true,
          microphone: micStatus,
          screen: screenStatus,
        }
      } catch (error) {
        console.error('Failed to get permission status:', error)
        return { success: false, error: error.message }
      }
    })

    // Request microphone permission
    ipcMain.handle('request-microphone-permission', async () => {
      try {
        const { systemPreferences, shell } = require('electron')
        if (process.platform === 'darwin') {
          const currentStatus = systemPreferences.getMediaAccessStatus('microphone')

          if (currentStatus === 'not-determined') {
            // First time - show system dialog
            const granted = await systemPreferences.askForMediaAccess('microphone')
            return { success: true, granted }
          } else {
            // Already determined - open System Preferences
            shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone')
            return { success: true, granted: currentStatus === 'granted' }
          }
        }
        return { success: true, granted: true }
      } catch (error) {
        console.error('Failed to request microphone permission:', error)
        return { success: false, error: error.message }
      }
    })

    // Request screen recording permission
    ipcMain.handle('request-screen-permission', async () => {
      try {
        const { systemPreferences, shell } = require('electron')
        if (process.platform === 'darwin') {
          const currentStatus = systemPreferences.getMediaAccessStatus('screen')

          if (currentStatus === 'not-determined') {
            // First time - trigger prompt by attempting screen capture
            try {
              await screenCaptureService.captureScreenshot({ useCache: false })
            } catch (error) {
              // Capture may fail, that's ok - it triggered the prompt
              console.log('Screen capture triggered permission prompt', error)
            }
            const status = await systemPreferences.getMediaAccessStatus('screen')
            return { success: true, granted: status === 'granted' }
          } else {
            // Already determined - open System Preferences
            shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture')
            return { success: true, granted: currentStatus === 'granted' }
          }
        }
        return { success: true, granted: true }
      } catch (error) {
        console.error('Failed to request screen permission:', error)
        return { success: false, error: error.message }
      }
    })

    console.log('Onboarding IPC handlers registered')
  }

  /**
   * Register authentication-related IPC handlers
   */
  registerAuthHandlers() {
    const supabaseAuthService = require('../services/SupabaseAuthService')
    const userSubscriptionService = require('../services/UserSubscriptionService')
    const devAuthServer = require('../services/DevAuthServer')
    const { AUTH_CONFIG } = require('../utils/Constants')
    const { shell } = require('electron')

    // Get current auth session
    ipcMain.handle(
      'auth-get-session',
      ErrorUtils.wrapIPCHandler(async () => {
        const session = await supabaseAuthService.getSession()
        return session
      }, 'get auth session')
    )

    // Get current user
    ipcMain.handle(
      'auth-get-user',
      ErrorUtils.wrapIPCHandler(async () => {
        const user = await supabaseAuthService.getUser()
        return user
      }, 'get auth user')
    )

    // Get user subscription
    ipcMain.handle(
      'auth-get-subscription',
      ErrorUtils.wrapIPCHandler(async () => {
        const user = await supabaseAuthService.getUser()
        if (!user) {
          return null
        }
        const subscription = await userSubscriptionService.fetchSubscription(user.id)
        return subscription
      }, 'get user subscription')
    )

    // Sign out
    ipcMain.handle(
      'auth-sign-out',
      ErrorUtils.wrapIPCHandler(async () => {
        await supabaseAuthService.signOut()

        // Notify renderer
        const mainWindow = this.windowManager.getWindow()
        if (mainWindow) {
          mainWindow.webContents.send('auth-state-changed', { user: null })
        }

        return { success: true }
      }, 'sign out')
    )

    // Open web login in browser
    ipcMain.handle('auth-open-web-login', async () => {
      try {
        // Start DevAuthServer if not already running (for dev mode callback)
        const isDev = process.env.IS_DEV === 'true'
        let callbackUrl = null

        if (isDev) {
          if (!devAuthServer.isRunning()) {
            console.log('[IPCRouter] Starting DevAuthServer for callback...')

            // Start server with callback handler
            await devAuthServer.start(async (hashedToken, email) => {
              console.log('[IPCRouter] DevAuthServer callback received:', { email, hasToken: !!hashedToken })

              try {
                // Verify token and create session
                const session = await supabaseAuthService.verifyHashedToken(hashedToken, email)

                if (session) {
                  // Notify all windows of auth state change
                  const mainWindow = this.windowManager?.getWindow()
                  if (mainWindow) {
                    mainWindow.webContents.send('auth-state-changed', {
                      user: session.user,
                      session: session,
                    })
                  }

                  // Start auto-refresh
                  supabaseAuthService.startAutoRefresh()

                  console.log('[IPCRouter] ✅ Authentication successful via DevAuthServer')
                }
              } catch (error) {
                console.error('[IPCRouter] ❌ Error handling DevAuthServer callback:', error)
              }
            })
          }

          callbackUrl = devAuthServer.getCallbackUrl()
          console.log('[IPCRouter] DevAuthServer callback URL:', callbackUrl)
        }

        // Build login URL with callback parameter
        const loginUrlParams = new URLSearchParams()
        loginUrlParams.set('source', 'desktop')
        if (callbackUrl) {
          loginUrlParams.set('callback', callbackUrl)
        }

        const loginUrl = `${AUTH_CONFIG.WEB_LOGIN_URL}${AUTH_CONFIG.WEB_LOGIN_URL.includes('?') ? '&' : '?'}${loginUrlParams.toString()}`

        console.log('[IPCRouter] Opening web login:', loginUrl)
        shell.openExternal(loginUrl)
        return { success: true }
      } catch (error) {
        console.error('[IPCRouter] Error opening web login:', error)
        // Fallback to basic login URL
        shell.openExternal(AUTH_CONFIG.WEB_LOGIN_URL)
        return { success: false, error: error.message }
      }
    })

    // Open web dashboard in browser
    ipcMain.handle('auth-open-web-dashboard', () => {
      const dashboardUrl = AUTH_CONFIG.WEB_DASHBOARD_URL
      shell.openExternal(dashboardUrl)
      return { success: true }
    })

    // Refresh subscription data
    ipcMain.handle(
      'auth-refresh-subscription',
      ErrorUtils.wrapIPCHandler(async () => {
        const user = await supabaseAuthService.getUser()
        if (!user) {
          return null
        }
        const subscription = await userSubscriptionService.refreshSubscription(user.id)
        return subscription
      }, 'refresh subscription')
    )

    console.log('Auth IPC handlers registered')
  }

  /**
   * Unregister all handlers (useful for cleanup)
   */
  unregisterHandlers() {
    const handlers = [
      'get-user-data-path',
      'get-app-path',
      'read-file',
      'write-file',
      'minimize-window',
      'maximize-window',
      'close-window',
      'show-notification',
      'expand-window-for-recording',
      'shrink-window-to-pill',
      'paste-to-focused-app',
      'ai-initialize',
      'ai-process-chunk',
      'ai-process-full-recording',
      'ai-process-file',
      'ai-get-status',
      'ai-shutdown',
      // 'llama-refine-transcript', // Disabled - using direct OpenAI API calls
      // 'agent-process-request',   // Disabled - using direct OpenAI API calls
      'get-dictation-history',
      'get-dictation-stats',
      'add-dictation-entry',
      'delete-dictation-entry',
      'clear-dictation-history',
      'capture-screen',
      'check-onboarding-status',
      'complete-onboarding',
      'reset-onboarding',
      'get-permission-status',
      'request-microphone-permission',
      'request-screen-permission',
      'auth-get-session',
      'auth-get-user',
      'auth-get-subscription',
      'auth-sign-out',
      'auth-open-web-login',
      'auth-open-web-dashboard',
      'auth-refresh-subscription',
    ]

    handlers.forEach((handler) => {
      ipcMain.removeAllListeners(handler)
    })

    console.log('IPC handlers unregistered')
  }
}

module.exports = IPCRouter
