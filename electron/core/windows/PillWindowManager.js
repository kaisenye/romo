const { BrowserWindow } = require('electron')
const path = require('path')
const { WINDOW_CONFIG, APP_CONFIG } = require('../../utils/Constants.js')
const AnimationUtils = require('../../utils/AnimationUtils.js')

/**
 * PillWindowManager - Manages the main dictation pill window
 * Handles all window operations, positioning, and animations
 * PRESERVES EXACT FUNCTIONALITY from original main.js
 */
class PillWindowManager {
  constructor() {
    this.mainWindow = null
  }

  /**
   * Get top center position for window - positions pill below camera island
   * Updated to position at top instead of bottom
   */
  getTopCenterPosition() {
    const { screen } = require('electron')
    const cursorPosition = screen.getCursorScreenPoint()
    const display = screen.getDisplayNearestPoint(cursorPosition)

    const windowWidth = WINDOW_CONFIG.PILL.WIDTH
    const windowHeight = WINDOW_CONFIG.PILL.HEIGHT
    const topMargin = WINDOW_CONFIG.TOP_MARGIN // Distance from top (below notch)

    // Calculate top center position
    const x = Math.floor((display.workAreaSize.width - windowWidth) / 2) + display.workArea.x
    const y = display.workArea.y + topMargin

    return {
      x: Math.max(display.workArea.x, Math.min(x, display.workArea.x + display.workAreaSize.width - windowWidth)),
      y: Math.max(display.workArea.y, Math.min(y, display.workArea.y + display.workAreaSize.height - windowHeight)),
    }
  }

  /**
   * Helper function to show window on current desktop
   * EXACT COPY from main.js lines 35-60
   */
  async showWindowOnCurrentDesktop() {
    if (this.mainWindow) {
      // If window is already visible, just return (don't focus)
      if (this.mainWindow.isVisible()) {
        return
      }

      // Always position at top center (ignore saved position)
      const position = this.getTopCenterPosition()
      this.mainWindow.setPosition(position.x, position.y)
      console.log('Window positioned at top center:', position)

      // Ensure window stays on top
      this.mainWindow.setAlwaysOnTop(true)

      // Show the window without activating it to preserve user's input focus
      this.mainWindow.showInactive()
    }
  }

  /**
   * Create the main browser window
   * EXACT COPY from main.js lines 62-153
   */
  createWindow() {
    const isDev = process.env.IS_DEV === 'true'
    const { app } = require('electron')

    // Create the browser window - tiny pill that expands during recording
    this.mainWindow = new BrowserWindow({
      width: WINDOW_CONFIG.PILL.WIDTH, // Was: 60
      height: WINDOW_CONFIG.PILL.HEIGHT, // Was: 20
      minWidth: WINDOW_CONFIG.PILL.MIN_WIDTH, // Was: 60
      minHeight: WINDOW_CONFIG.PILL.MIN_HEIGHT, // Was: 20
      maxWidth: WINDOW_CONFIG.EXPANDED.MAX_WIDTH, // Was: 260
      maxHeight: WINDOW_CONFIG.EXPANDED.MAX_HEIGHT, // Was: 60
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: isDev
          ? path.join(__dirname, '..', '..', 'preload.js')
          : path.join(app.getAppPath(), 'dist-electron', 'preload.js'),
        webSecurity: true,
        devTools: isDev, // Only enable dev tools in development
      },
      show: false, // Don't show until ready
      icon: path.join(__dirname, '../../public/icon.png'),
      resizable: false, // Disable resizing to maintain fixed size
      skipTaskbar: true, // Don't show in taskbar/dock
      frame: false, // Remove all window controls including close/expand buttons
      transparent: true, // Enable transparency for glass effect
      movable: false, // Prevent moving to keep it centered
      hasShadow: false, // Remove shadow for minimal appearance
      alwaysOnTop: true, // Keep window on top of all other applications
      visibleOnAllWorkspaces: false, // Don't force window to all desktops - stay on current desktop
      focusable: false, // Prevent window from stealing focus
      minimizable: false, // Remove minimize button
      maximizable: false, // Remove maximize button
      closable: false, // Remove close button (controlled by shortcut only)
      roundedCorners: true, // Enable rounded corners for pill shape
      backgroundColor: '#00000000', // Fully transparent background
    })

    // TODO: add it back if needed
    // Set Content Security Policy
    // this.mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    //   callback({
    //     responseHeaders: {
    //       ...details.responseHeaders,
    //       'Content-Security-Policy': [
    //         `default-src ${CSP.DEFAULT_SRC}; ` +
    //           `script-src ${CSP.SCRIPT_SRC}; ` +
    //           `style-src ${CSP.STYLE_SRC}; ` +
    //           `font-src ${CSP.FONT_SRC}; ` +
    //           `img-src ${CSP.IMG_SRC}; ` +
    //           `connect-src ${CSP.CONNECT_SRC};`,
    //       ],
    //     },
    //   })
    // })

    // Load the app
    if (isDev) {
      this.mainWindow.loadURL(APP_CONFIG.DEV_SERVER_URL) // Was: 'http://localhost:5173'
      // Enable dev tools in development for debugging
      this.mainWindow.webContents.openDevTools()
    } else {
      const filePath = path.join(app.getAppPath(), 'dist', 'index.html')
      console.log('Loading file from:', filePath)
      console.log('App path:', app.getAppPath())
      this.mainWindow.loadFile(filePath)
    }

    // Position window but don't show yet - will show on first dictation trigger
    this.mainWindow.once('ready-to-show', () => {
      // Position at top center but don't show
      const position = this.getTopCenterPosition()
      this.mainWindow.setPosition(position.x, position.y)
    })

    // Handle window closed
    this.mainWindow.on('closed', async () => {
      this.mainWindow = null
      // Emit event for main.js to handle service shutdown
      this.emit('window-closed')
    })

    // Handle external links
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      const { shell } = require('electron')
      shell.openExternal(url)
      return { action: 'deny' }
    })

    return this.mainWindow
  }

  /**
   * Window expansion for recording with spring animation
   * Refactored to use AnimationUtils
   */
  async expandWindowForRecording() {
    if (!this.mainWindow) {
      return { success: false, error: 'No window available' }
    }

    const position = this.getTopCenterPosition()

    // Show window if hidden (first dictation trigger) with slide down animation
    if (!this.mainWindow.isVisible()) {
      // Position window above target position (for slide down effect)
      const startY = position.y - 50
      this.mainWindow.setPosition(position.x, startY)
      this.mainWindow.setOpacity(0) // Start invisible

      // Use showInactive to prevent stealing focus from user's current app
      this.mainWindow.showInactive()

      // Animate slide down to target position with fade in - KEEP PILL SIZE
      await AnimationUtils.animateWindow(
        this.mainWindow,
        {
          x: position.x,
          y: startY,
          width: WINDOW_CONFIG.PILL.WIDTH,
          height: WINDOW_CONFIG.PILL.HEIGHT,
          opacity: 0, // Start transparent
        },
        {
          x: position.x,
          y: position.y,
          width: WINDOW_CONFIG.PILL.WIDTH,
          height: WINDOW_CONFIG.PILL.HEIGHT,
          opacity: 1, // End fully visible
        },
        {
          duration: 150,
          steps: 10,
          easing: AnimationUtils.EASING.OUT_QUART,
        }
      )
    }

    // Don't expand - just return success
    return { success: true }
  }

  /**
   * Shrink window back to pill size
   * Refactored to use AnimationUtils
   */
  async shrinkWindowToPill() {
    if (!this.mainWindow) {
      return { success: false, error: 'No window available' }
    }

    const targetPosition = this.getTopCenterPosition()
    const currentBounds = this.mainWindow.getBounds()
    const targetSize = {
      width: WINDOW_CONFIG.PILL.WIDTH,
      height: WINDOW_CONFIG.PILL.HEIGHT,
    }

    return await AnimationUtils.shrinkWindow(this.mainWindow, currentBounds, targetSize, targetPosition, {
      duration: WINDOW_CONFIG.ANIMATION.SHRINK_DURATION,
      steps: WINDOW_CONFIG.ANIMATION.SHRINK_STEPS,
    })
  }

  /**
   * Hide window with slide up animation
   */
  async hideWindow() {
    if (!this.mainWindow) {
      return { success: false, error: 'No window available' }
    }

    try {
      const currentBounds = this.mainWindow.getBounds()

      // Slide up beyond the top edge of screen (so it slides completely out of view)
      const targetY = -50 // Move 50px above the screen top edge

      // Animate slide up with fade out
      await AnimationUtils.animateWindow(
        this.mainWindow,
        {
          x: currentBounds.x,
          y: currentBounds.y,
          width: currentBounds.width,
          height: currentBounds.height,
          opacity: 1, // Start fully visible
        },
        {
          x: currentBounds.x,
          y: targetY,
          width: currentBounds.width,
          height: currentBounds.height,
          opacity: 0, // End transparent
        },
        {
          duration: 200, // Faster exit
          steps: 20, // Fewer steps for snappier feel
          easing: AnimationUtils.EASING.OUT_QUART,
        }
      )

      // Hide window after animation
      this.mainWindow.hide()

      // Reset opacity for next show
      this.mainWindow.setOpacity(1)

      return { success: true }
    } catch (error) {
      console.error('Failed to hide window:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Standard window operations
   */
  minimizeWindow() {
    if (this.mainWindow) this.mainWindow.minimize()
  }

  maximizeWindow() {
    if (this.mainWindow) {
      if (this.mainWindow.isMaximized()) {
        this.mainWindow.unmaximize()
      } else {
        this.mainWindow.maximize()
      }
    }
  }

  closeWindow() {
    if (this.mainWindow) this.mainWindow.close()
  }

  /**
   * Get the main window instance
   */
  getWindow() {
    return this.mainWindow
  }

  /**
   * Check if window exists and is visible
   */
  isVisible() {
    return this.mainWindow && this.mainWindow.isVisible()
  }

  /**
   * Show mode indicator in main window
   */
  async showModeIndicator() {
    if (!this.mainWindow) {
      return { success: false, error: 'No window available' }
    }

    // Show window if hidden, expand to show mode indicator
    if (!this.mainWindow.isVisible()) {
      await this.showWindowOnCurrentDesktop()
    }

    // Send event to renderer to show mode indicator UI
    this.mainWindow.webContents.send('show-mode-indicator')

    return { success: true }
  }
}

// Make PillWindowManager an EventEmitter for window-closed events
const { EventEmitter } = require('events')
Object.setPrototypeOf(PillWindowManager.prototype, EventEmitter.prototype)

module.exports = PillWindowManager
