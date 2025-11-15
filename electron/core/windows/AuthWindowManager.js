const { BrowserWindow } = require('electron')
const path = require('path')
const { EventEmitter } = require('events')
const { APP_CONFIG } = require('../../utils/Constants')

/**
 * AuthWindowManager
 * Manages the dedicated authentication window
 * Shows when user is not authenticated, closes after successful auth
 */
class AuthWindowManager extends EventEmitter {
  constructor() {
    super()
    this.window = null
  }

  /**
   * Create the auth window
   */
  createWindow() {
    if (this.window) {
      this.window.focus()
      return
    }

    console.log('Creating auth window...')

    this.window = new BrowserWindow({
      width: 400,
      height: 400,
      minWidth: 400,
      minHeight: 400,
      center: true,
      resizable: true, // Allow resizing
      maximizable: true, // Allow maximize
      fullscreenable: false,
      movable: true, // Explicitly allow window to be moved
      backgroundColor: '#0a0a0a',
      titleBarStyle: 'hiddenInset', // Show traffic lights, hide title text
      trafficLightPosition: { x: 15, y: 15 }, // Position traffic lights
      vibrancy: 'under-window', // Modern macOS effect
      visualEffectState: 'active',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../../preload.js'),
      },
    })

    // Load the app with #auth route
    const isDev = process.env.IS_DEV === 'true'
    if (isDev) {
      this.window.loadURL(`${APP_CONFIG.DEV_SERVER_URL}/#auth`)
    } else {
      this.window.loadFile(path.join(__dirname, APP_CONFIG.DIST_PATH), {
        hash: 'auth',
      })
    }

    // Handle window close
    this.window.on('closed', () => {
      console.log('Auth window closed')
      this.window = null
      this.emit('auth-window-closed')
    })

    console.log('Auth window created')
  }

  /**
   * Close the auth window
   */
  closeWindow() {
    if (this.window) {
      this.window.close()
      this.window = null
    }
  }

  /**
   * Get the auth window instance
   * @returns {BrowserWindow|null}
   */
  getWindow() {
    return this.window
  }

  /**
   * Check if auth window is visible
   * @returns {boolean}
   */
  isVisible() {
    return this.window && this.window.isVisible()
  }

  /**
   * Focus the auth window
   */
  focus() {
    if (this.window) {
      this.window.focus()
    }
  }
}

module.exports = AuthWindowManager
