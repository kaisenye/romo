const { app, BrowserWindow, Menu } = require('electron')

// Import AI services (unchanged)
const whisperCppService = require('./services/whisperCppService')
const llamaCppService = require('./services/llamaCppService')

// Import new modular components
const PillWindowManager = require('./core/windows/PillWindowManager')
const DashboardWindowManager = require('./core/windows/DashboardWindowManager')
const OnboardingWindowManager = require('./core/windows/OnboardingWindowManager')
const IPCRouter = require('./core/IPCRouter')
const ShortcutManager = require('./core/ShortcutManager')
const TrayManager = require('./core/TrayManager')
const PermissionManager = require('./core/PermissionManager')
const AutoUpdater = require('./core/AutoUpdater')
const dictationHistoryService = require('./services/DictationHistoryService')

// Initialize managers
const pillWindowManager = new PillWindowManager()
const dashboardWindowManager = new DashboardWindowManager()
const onboardingWindowManager = new OnboardingWindowManager()
const ipcRouter = new IPCRouter(pillWindowManager, whisperCppService, llamaCppService)
const shortcutManager = new ShortcutManager(pillWindowManager)
const trayManager = new TrayManager(pillWindowManager, whisperCppService, llamaCppService, dashboardWindowManager)
const autoUpdater = new AutoUpdater(pillWindowManager)

/**
 * Create application menu for macOS
 * EXACT COPY from main.js lines 453-542
 */
function createMenu() {
  const template = [
    {
      label: 'Romo',
      submenu: [
        {
          label: 'About Romo',
          role: 'about',
        },
        { type: 'separator' },
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
      // Don't fail the app startup for Whisper.cpp - it can be retried later
    }

    // Initialize Llama.cpp (now enabled)
    try {
      await llamaCppService.initialize()
      console.log('Llama.cpp service initialized successfully')
    } catch (llamaError) {
      console.warn('Llama.cpp service initialization failed, will retry on demand:', llamaError.message)
      // Don't fail the app startup for Llama.cpp - it's optional for post-processing
    }

    // Check if onboarding should be shown
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

    // Create window and set up handlers (these are required)
    if (shouldShowOnboarding) {
      console.log('Showing onboarding...')
      onboardingWindowManager.createWindow()

      // Handle onboarding completion
      onboardingWindowManager.on('onboarding-closed', () => {
        console.log('Onboarding window closed')

        // In force mode, don't create main window (just keep onboarding for dev)
        if (!forceOnboarding) {
          console.log('Creating main window...')
          pillWindowManager.createWindow()
        } else {
          console.log('DEV_FORCE_ONBOARDING mode: Skipping main window creation')
        }
      })
    } else {
      pillWindowManager.createWindow()
    }

    createMenu()
    ipcRouter.registerHandlers()
    ipcRouter.registerOnboardingHandlers()
    shortcutManager.registerGlobalShortcuts()

    // Handle window closed event
    pillWindowManager.on('window-closed', async () => {
      // Shutdown AI services
      try {
        await whisperCppService.shutdown()
        await llamaCppService.shutdown()
      } catch (error) {
        console.error('Error shutting down AI services:', error)
      }
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
    // Ensure AI services are shut down before quitting
    try {
      await whisperCppService.shutdown()
      await llamaCppService.shutdown()
    } catch (error) {
      console.error('Error shutting down AI services on quit:', error)
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
    await llamaCppService.shutdown()
    console.log('AI services shut down successfully')
  } catch (error) {
    console.error('Error shutting down AI services:', error)
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
