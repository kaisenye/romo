const { BrowserWindow } = require('electron')
const path = require('path')
const { APP_CONFIG } = require('../../utils/Constants.js')

/**
 * OnboardingWindowManager - Manages the onboarding window
 * Separate from main pill window for better UX
 */
class OnboardingWindowManager {
  constructor() {
    this.onboardingWindow = null
  }

  /**
   * Create the onboarding window
   */
  createWindow() {
    const isDev = process.env.IS_DEV === 'true'
    const { app } = require('electron')
    const { screen } = require('electron')

    // Get primary display
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize

    // Center the window
    const windowWidth = 600
    const windowHeight = 600
    const x = Math.floor((width - windowWidth) / 2)
    const y = Math.floor((height - windowHeight) / 2)

    this.onboardingWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x,
      y,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: isDev
          ? path.join(__dirname, '..', '..', 'preload.js')
          : path.join(app.getAppPath(), 'dist-electron', 'preload.js'),
        webSecurity: true,
        devTools: isDev,
      },
      show: false,
      icon: path.join(__dirname, '../../public/icon.png'),
      resizable: false,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: false,
      minimizable: false,
      maximizable: false,
      closable: false,
      roundedCorners: true,
      backgroundColor: '#00000000',
      titleBarStyle: 'hidden',
      titleBarOverlay: false,
      trafficLightPosition: { x: -100, y: -100 }, // Hide traffic lights by moving them off-screen
    })

    // Load the onboarding page
    if (isDev) {
      this.onboardingWindow.loadURL(`${APP_CONFIG.DEV_SERVER_URL}#onboarding`)
      this.onboardingWindow.webContents.openDevTools()
    } else {
      const filePath = path.join(app.getAppPath(), 'dist', 'index.html')
      this.onboardingWindow.loadFile(filePath, { hash: 'onboarding' })
    }

    // Show when ready
    this.onboardingWindow.once('ready-to-show', () => {
      this.onboardingWindow.show()
      this.onboardingWindow.focus()
    })

    // Handle window closed
    this.onboardingWindow.on('closed', () => {
      this.onboardingWindow = null
      // Emit event for main.js to handle
      this.emit('onboarding-closed')
    })

    // Handle external links
    this.onboardingWindow.webContents.setWindowOpenHandler(({ url }) => {
      const { shell } = require('electron')
      shell.openExternal(url)
      return { action: 'deny' }
    })

    return this.onboardingWindow
  }

  /**
   * Show the onboarding window
   */
  show() {
    if (this.onboardingWindow) {
      this.onboardingWindow.show()
      this.onboardingWindow.focus()
    }
  }

  /**
   * Hide the onboarding window
   */
  hide() {
    if (this.onboardingWindow) {
      this.onboardingWindow.hide()
    }
  }

  /**
   * Close the onboarding window
   */
  close() {
    if (this.onboardingWindow) {
      this.onboardingWindow.close()
      this.onboardingWindow = null
    }
  }

  /**
   * Get the onboarding window instance
   */
  getWindow() {
    return this.onboardingWindow
  }

  /**
   * Check if window exists and is visible
   */
  isVisible() {
    return this.onboardingWindow && this.onboardingWindow.isVisible()
  }
}

// Make OnboardingWindowManager an EventEmitter
const { EventEmitter } = require('events')
Object.setPrototypeOf(OnboardingWindowManager.prototype, EventEmitter.prototype)

module.exports = OnboardingWindowManager
