const { execSync } = require('child_process')
const { URL } = require('url')

/**
 * Context Detection Service
 * Detects active application, window, and browser tab context
 * to automatically select appropriate transcription style prompts
 */
class ContextDetectionService {
  constructor() {
    this.browserMap = {
      'Google Chrome': 'chrome',
      Safari: 'safari',
      Firefox: 'firefox',
      'Microsoft Edge': 'edge',
      Arc: 'arc',
      'Brave Browser': 'brave',
    }
  }

  /**
   * Main method to detect active context
   * @returns {Promise<Object>} Context object with app, window, browser, url, domain info
   */
  async detectActiveContext() {
    if (process.platform !== 'darwin') {
      return {
        success: false,
        error: 'Only supported on macOS',
        appName: null,
        windowTitle: null,
        browserType: null,
        url: null,
        domain: null,
        isBrowser: false,
      }
    }

    try {
      const appName = await this.detectActiveApp()
      const windowTitle = await this.detectActiveWindow(appName)

      let browserType = null
      let url = null
      let domain = null
      let isBrowser = false

      // Check if it's a browser
      if (this.browserMap[appName]) {
        isBrowser = true
        browserType = this.browserMap[appName]
        const browserInfo = await this.detectBrowserTab(appName, browserType)
        url = browserInfo.url
        domain = browserInfo.domain
      }

      const context = {
        success: true,
        appName,
        windowTitle,
        browserType,
        url,
        domain,
        isBrowser,
      }

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
  }

  /**
   * Detect the frontmost application name
   * @returns {Promise<string>} Application name
   */
  async detectActiveApp() {
    try {
      const appName = execSync(
        `osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`
      )
        .toString()
        .trim()

      return appName
    } catch {
      return null
    }
  }

  /**
   * Detect the active window title
   * @param {string} appName - Application name
   * @returns {Promise<string>} Window title
   */
  async detectActiveWindow(appName) {
    if (!appName) return null

    try {
      const windowTitle = execSync(
        `osascript -e 'tell application "System Events" to get title of first window of first application process whose frontmost is true' 2>/dev/null || echo "unknown"`
      )
        .toString()
        .trim()

      return windowTitle === 'unknown' ? null : windowTitle
    } catch {
      return null
    }
  }

  /**
   * Detect browser tab URL and domain
   * @param {string} appName - Browser application name
   * @param {string} browserType - Browser type (chrome, safari, etc.)
   * @returns {Promise<Object>} Object with url and domain
   */
  async detectBrowserTab(appName, browserType) {
    let url = null
    let domain = null

    try {
      if (browserType === 'chrome' || browserType === 'edge' || browserType === 'brave' || browserType === 'arc') {
        // Chrome/Edge/Brave/Arc use similar AppleScript
        url = execSync(`osascript -e 'tell application "${appName}" to get URL of active tab of front window'`)
          .toString()
          .trim()
      } else if (browserType === 'safari') {
        // Safari uses different AppleScript
        url = execSync(`osascript -e 'tell application "Safari" to get URL of front document'`).toString().trim()
      } else if (browserType === 'firefox') {
        // Firefox doesn't expose URLs easily via AppleScript
        return { url: null, domain: null }
      }

      // Extract domain from URL
      if (url) {
        try {
          const urlObj = new URL(url)
          domain = urlObj.hostname.replace('www.', '')
        } catch {
          // Ignore parse errors
        }
      }
    } catch {
      // Ignore detection errors
    }

    return { url, domain }
  }
}

// Create singleton instance
const contextDetectionService = new ContextDetectionService()

module.exports = contextDetectionService
