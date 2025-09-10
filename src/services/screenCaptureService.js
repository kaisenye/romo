// Screen Capture Service - Renderer side wrapper
// Thin wrapper around electronAPI for screen capture functionality

class ScreenCaptureService {
  /**
   * Capture screenshot using electronAPI (delegates to main process)
   */
  async captureScreenshot(options = {}) {
    try {
      if (!window.electronAPI || !window.electronAPI.captureScreen) {
        throw new Error('electronAPI.captureScreen not available')
      }

      return await window.electronAPI.captureScreen(options)
    } catch (error) {
      console.error('[ScreenCaptureService] Failed to capture screenshot:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Check if the service is available
   */
  isAvailable() {
    return !!(window.electronAPI && window.electronAPI.captureScreen)
  }

  /**
   * Get service status (delegates to main process capabilities)
   */
  getStatus() {
    return {
      platform: window.electronAPI?.platform || 'unknown',
      available: this.isAvailable(),
      method: 'electron-ipc-delegate',
    }
  }
}

// Export singleton instance
const screenCaptureService = new ScreenCaptureService()
export default screenCaptureService
