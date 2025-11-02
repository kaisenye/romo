// Load environment variables from .env file BEFORE any other imports
require('dotenv').config()

const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')

// Import AI services
const whisperCppService = require('./services/whisperCppService')

// Import auth services
const supabaseAuthService = require('./services/SupabaseAuthService')
const userSubscriptionService = require('./services/UserSubscriptionService')

// Import new modular components
const PillWindowManager = require('./core/windows/PillWindowManager')
const DashboardWindowManager = require('./core/windows/DashboardWindowManager')
const OnboardingWindowManager = require('./core/windows/OnboardingWindowManager')
const AuthWindowManager = require('./core/windows/AuthWindowManager')
const IPCRouter = require('./core/IPCRouter')
const ShortcutManager = require('./core/ShortcutManager')
const TrayManager = require('./core/TrayManager')
const PermissionManager = require('./core/PermissionManager')
const AutoUpdater = require('./core/AutoUpdater')
const AuthManager = require('./core/AuthManager')
const dictationHistoryService = require('./services/DictationHistoryService')
const { AUTH_CONFIG } = require('./utils/Constants')

// Initialize managers
const pillWindowManager = new PillWindowManager()
const dashboardWindowManager = new DashboardWindowManager()
const onboardingWindowManager = new OnboardingWindowManager()
const authWindowManager = new AuthWindowManager()
const ipcRouter = new IPCRouter(pillWindowManager, whisperCppService, null)
const shortcutManager = new ShortcutManager(pillWindowManager)
const trayManager = new TrayManager(pillWindowManager, whisperCppService, null, dashboardWindowManager)
const autoUpdater = new AutoUpdater(pillWindowManager)
const authManager = new AuthManager(pillWindowManager)

// Register protocol handler for deep linking (must be done before app.whenReady())
const isDev = process.defaultApp || process.env.IS_DEV === 'true'

if (isDev) {
  // Development mode - need to specify electron executable
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(AUTH_CONFIG.PROTOCOL_SCHEME, process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  // Production mode
  app.setAsDefaultProtocolClient(AUTH_CONFIG.PROTOCOL_SCHEME)
}

/**
 * Create application menu for macOS
 * EXACT COPY from main.js lines 453-542
 */
function createMenu() {
  const isDev = process.env.IS_DEV === 'true'

  const template = [
    {
      label: 'Romo',
      submenu: [
        {
          label: 'About Romo',
          role: 'about',
        },
        { type: 'separator' },
        // Development-only: Manual auth helper
        ...(isDev
          ? [
              {
                label: 'Paste Auth URL (Dev)',
                click: async () => {
                  const { clipboard } = require('electron')
                  const url = clipboard.readText()

                  if (url.startsWith('romo://auth')) {
                    console.log('Manual auth URL pasted:', url.substring(0, 50) + '...')
                    authManager.setMainWindow(authWindowManager.getWindow() || pillWindowManager.getWindow())
                    await authManager.handleDeepLink(url)
                  } else {
                    const { dialog } = require('electron')
                    dialog.showMessageBox({
                      type: 'info',
                      title: 'Invalid URL',
                      message: 'Please copy the romo://auth URL from the browser first.',
                      detail: 'In the browser callback page, look for the clickable link and copy it.',
                    })
                  }
                },
              },
              { type: 'separator' },
            ]
          : []),
        {
          label: 'Check for Updates...',
          click: () => {
            autoUpdater.checkForUpdatesManually()
          },
        },
        { type: 'separator' },
        {
          label: 'Hide Romo',
          accelerator: 'Command+H',
          role: 'hide',
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Shift+H',
          role: 'hideothers',
        },
        {
          label: 'Show All',
          role: 'unhide',
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => {
            app.quit()
          },
        },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Meeting',
          accelerator: 'Command+N',
          click: () => {
            const mainWindow = pillWindowManager.getWindow()
            if (mainWindow) {
              mainWindow.webContents.send('menu-new-meeting')
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Export Meeting',
          accelerator: 'Command+E',
          click: () => {
            const mainWindow = pillWindowManager.getWindow()
            if (mainWindow) {
              mainWindow.webContents.send('menu-export-meeting')
            }
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'close' }],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// App event handlers
app.whenReady().then(async () => {
  try {
    // Request permissions early
    await PermissionManager.requestPermissions()

    // Initialize AI services
    console.log('Initializing AI services...')

    // Initialize Whisper.cpp (required for transcription)
    try {
      await whisperCppService.initialize()
      console.log('Whisper.cpp service initialized successfully')
    } catch (whisperError) {
      console.warn('Whisper.cpp service initialization failed, will retry on demand:', whisperError.message)
    }

    // Initialize auth services
    console.log('Initializing auth services...')
    try {
      await supabaseAuthService.initialize()
      userSubscriptionService.initialize()
      console.log('Auth services initialized successfully')
    } catch (authError) {
      console.warn('Auth services initialization failed:', authError.message)
      // Don't fail app startup for auth - user can sign in later
    }

    // Check authentication status
    console.log('Checking authentication status...')
    const session = await supabaseAuthService.getSession()
    const isAuthenticated = !!session

    if (!isAuthenticated) {
      // User not authenticated - show auth window
      authWindowManager.createWindow()

      // Handle auth window closed
      authWindowManager.on('auth-window-closed', () => {
        app.quit()
      })
    } else {
      // User is authenticated - check onboarding and show appropriate window

      const skipOnboarding = process.env.DEV_SKIP_ONBOARDING === 'true'
      const forceOnboarding = process.env.DEV_FORCE_ONBOARDING === 'true'
      let shouldShowOnboarding = false

      if (forceOnboarding) {
        // Force onboarding mode for dev (keeps window open for modifications)
        console.log('DEV_FORCE_ONBOARDING=true: Showing onboarding in persistent dev mode')
        shouldShowOnboarding = true
      } else if (!skipOnboarding) {
        try {
          await dictationHistoryService.initialize()
          shouldShowOnboarding = !(await dictationHistoryService.isOnboardingCompleted())
        } catch (error) {
          console.warn('Failed to check onboarding status:', error)
          shouldShowOnboarding = false
        }
      }

      // Create window and set up handlers
      if (shouldShowOnboarding) {
        onboardingWindowManager.createWindow()

        // Handle onboarding completion
        onboardingWindowManager.on('onboarding-closed', () => {
          // In force mode, don't create main window (just keep onboarding for dev)
          if (!forceOnboarding) {
            pillWindowManager.createWindow()
          }
        })
      } else {
        // Skip onboarding, show pill directly
        pillWindowManager.createWindow()
      }
    }

    createMenu()
    ipcRouter.registerHandlers()
    ipcRouter.registerOnboardingHandlers()
    ipcRouter.registerAuthHandlers()
    shortcutManager.registerGlobalShortcuts()

    // Listen for auth state changes
    supabaseAuthService.onAuthStateChange(async (event, session) => {
      console.log('[Main] 🔔 Auth state change event received:', event)
      console.log('[Main] Session present:', !!session)
      console.log('[Main] User email:', session?.user?.email)

      if (event === 'SIGNED_IN' && session) {
        console.log('[Main] ✅ User signed in, transitioning windows...')

        // User just signed in - remove auth window listeners to prevent app quit
        if (authWindowManager.getWindow()) {
          console.log('[Main] Closing auth window...')
          authWindowManager.removeAllListeners('auth-window-closed')
          authWindowManager.closeWindow()
        } else {
          console.log('[Main] No auth window to close')
        }

        // Check onboarding status
        try {
          console.log('[Main] Checking onboarding status...')
          await dictationHistoryService.initialize()
          const onboardingCompleted = await dictationHistoryService.isOnboardingCompleted()
          console.log('[Main] Onboarding completed:', onboardingCompleted)

          if (!onboardingCompleted) {
            console.log('[Main] Creating onboarding window...')
            onboardingWindowManager.createWindow()

            onboardingWindowManager.on('onboarding-closed', () => {
              console.log('[Main] Onboarding closed, creating pill window...')
              pillWindowManager.createWindow()
            })
          } else {
            console.log('[Main] Creating pill window...')
            pillWindowManager.createWindow()
          }

          console.log('[Main] ✅ Window transition complete')
        } catch (error) {
          console.error('[Main] ❌ Error checking onboarding:', error)
          console.log('[Main] Falling back to creating pill window...')
          pillWindowManager.createWindow()
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('[Main] User signed out, showing auth window...')

        // User signed out
        if (pillWindowManager.getWindow()) {
          pillWindowManager.closeWindow()
        }

        authWindowManager.createWindow()
        authWindowManager.on('auth-window-closed', () => {
          app.quit()
        })
      } else {
        console.log('[Main] ⚠️ Unhandled auth event:', event)
      }
    })

    // Handle window closed event
    pillWindowManager.on('window-closed', async () => {
      // Shutdown services
      try {
        await whisperCppService.shutdown()
        await supabaseAuthService.shutdown()
      } catch (error) {
        console.error('Error shutting down services:', error)
      }
    })

    // Handle window focus/blur for auth auto-refresh
    app.on('browser-window-focus', () => {
      supabaseAuthService.startAutoRefresh()
    })

    app.on('browser-window-blur', () => {
      supabaseAuthService.stopAutoRefresh()
    })

    // Create tray (handle errors gracefully)
    try {
      trayManager.createTray()
    } catch (trayError) {
      console.warn('Failed to create tray, continuing without tray:', trayError.message)
    }

    app.on('activate', async () => {
      // On macOS, re-create window when dock icon is clicked
      if (BrowserWindow.getAllWindows().length === 0) {
        pillWindowManager.createWindow()
      } else if (pillWindowManager.getWindow()) {
        // If window exists but is hidden, show it on current desktop
        if (!pillWindowManager.isVisible()) {
          await pillWindowManager.showWindowOnCurrentDesktop()
        } else {
          pillWindowManager.getWindow().focus()
        }
      }
    })

    // Check for updates after initialization
    setTimeout(() => {
      autoUpdater.checkForUpdates()
    }, 3000) // Wait 3 seconds after app starts

    console.log('App initialization completed successfully')
  } catch (error) {
    console.error('Failed to initialize app:', error)
    // Show error dialog and quit
    const { dialog } = require('electron')
    dialog.showErrorBox('Initialization Error', 'Failed to initialize the application. Please try again.')
    app.quit()
  }
})

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    // Ensure services are shut down before quitting
    try {
      await whisperCppService.shutdown()
      await supabaseAuthService.shutdown()
    } catch (error) {
      console.error('Error shutting down services on quit:', error)
    }
    app.quit()
  }
})

// Handle app quit to ensure AI services are shut down
app.on('before-quit', async (event) => {
  console.log('App is quitting, shutting down AI services...')

  // Prevent immediate quit to allow cleanup
  event.preventDefault()

  try {
    await whisperCppService.shutdown()
    await supabaseAuthService.shutdown()
    console.log('All services shut down successfully')
  } catch (error) {
    console.error('Error shutting down services:', error)
  }

  // Now actually quit
  app.exit(0)
})

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.on('new-window', (navigationEvent) => {
    navigationEvent.preventDefault()
  })
})

// Handle deep links (macOS)
app.on('open-url', (event, url) => {
  event.preventDefault()

  // Update AuthManager's window reference to whichever window is currently open
  const currentWindow = authWindowManager.getWindow() || pillWindowManager.getWindow()

  if (currentWindow) {
    authManager.setMainWindow(currentWindow)
  } else {
    console.warn('No window available to handle deep link')
  }

  authManager.handleDeepLink(url)
})
