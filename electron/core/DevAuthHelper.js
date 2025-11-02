const { dialog } = require('electron')

/**
 * DevAuthHelper
 * Development-only helper for manually entering auth tokens
 * when deep links don't work in dev mode
 */
class DevAuthHelper {
  /**
   * Show dialog to manually paste deep link URL
   * @param {BrowserWindow} parentWindow
   */
  static async showManualAuthDialog(parentWindow) {
    const result = await dialog.showMessageBox(parentWindow, {
      type: 'info',
      title: 'Manual Authentication (Dev Mode)',
      message: 'Deep links may not work in development mode.',
      detail: 'Paste the romo://auth?... URL from the browser:',
      buttons: ['Cancel', 'Paste from Clipboard'],
    })

    if (result.response === 1) {
      // User clicked "Paste from Clipboard"
      const { clipboard } = require('electron')
      const url = clipboard.readText()

      if (url.startsWith('romo://auth')) {
        // Parse and set session
        const { AuthManager } = require('./AuthManager')
        const authManager = new AuthManager(null)
        await authManager.handleDeepLink(url)
        return true
      } else {
        dialog.showErrorBox('Invalid URL', 'Please copy the romo://auth URL from the browser first.')
        return false
      }
    }

    return false
  }
}

module.exports = DevAuthHelper
