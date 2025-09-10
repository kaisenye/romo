const { desktopCapturer } = require('electron')
const path = require('path')
const fs = require('fs').promises
const os = require('os')
const { execFile } = require('child_process')
const { promisify } = require('util')

const execFileAsync = promisify(execFile)

// Try to load sharp for optimal image processing
let sharp
try {
  sharp = require('sharp')
  console.log('[ScreenCaptureService] Sharp module loaded successfully')
} catch (error) {
  console.warn('[ScreenCaptureService] Sharp module not available:', error.message)
  sharp = null
}

/**
 * Screen Capture Service for Electron main process
 * Handles high-performance screen capture with optional Sharp processing
 */
class ScreenCaptureService {
  constructor() {
    this.lastScreenshot = null
  }

  /**
   * Capture screenshot with caching and platform-specific optimization
   */
  async captureScreenshot(options = {}) {
    const { maxHeight = 384, jpegQuality = 80, useCache = false } = options

    // Check cache if enabled
    if (useCache && this.lastScreenshot) {
      const cacheAge = Date.now() - this.lastScreenshot.timestamp
      if (cacheAge < 5000) {
        // Use cache if less than 5 seconds old
        return {
          success: true,
          base64: this.lastScreenshot.base64,
          width: this.lastScreenshot.width,
          height: this.lastScreenshot.height,
          cached: true,
        }
      }
    }

    // Use native macOS capture for better performance if available
    if (process.platform === 'darwin' && sharp) {
      return await this._captureMacOSWithSharp(maxHeight, jpegQuality)
    } else {
      return await this._captureWithDesktopCapturer(maxHeight, jpegQuality)
    }
  }

  /**
   * High-performance macOS capture with Sharp processing
   * @private
   */
  async _captureMacOSWithSharp(maxHeight, jpegQuality) {
    try {
      const tempPath = path.join(os.tmpdir(), `dictation-screenshot-${Date.now()}.jpg`)
      
      // Use native screencapture command for best quality
      await execFileAsync('screencapture', ['-x', '-t', 'jpg', tempPath])
      
      const imageBuffer = await fs.readFile(tempPath)
      
      // Clean up temp file
      try {
        await fs.unlink(tempPath)
      } catch (unlinkError) {
        console.warn('[ScreenCaptureService] Failed to clean up temp file:', unlinkError.message)
      }

      // Process with Sharp for optimal resizing and compression
      const resizedBuffer = await sharp(imageBuffer)
        .resize({ height: maxHeight })
        .jpeg({ quality: jpegQuality })
        .toBuffer()

      const base64 = resizedBuffer.toString('base64')
      const metadata = await sharp(resizedBuffer).metadata()

      this.lastScreenshot = {
        base64,
        width: metadata.width,
        height: metadata.height,
        timestamp: Date.now(),
      }

      return { 
        success: true, 
        base64, 
        width: metadata.width, 
        height: metadata.height,
        method: 'native-screencapture-sharp'
      }
    } catch (error) {
      console.error('[ScreenCaptureService] macOS capture failed:', error)
      // Fallback to desktopCapturer
      return await this._captureWithDesktopCapturer(maxHeight, jpegQuality)
    }
  }

  /**
   * Cross-platform capture using Electron's desktopCapturer
   * @private
   */
  async _captureWithDesktopCapturer(maxHeight, jpegQuality) {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 },
      })

      if (sources.length === 0) {
        throw new Error('No screen sources available')
      }

      const source = sources[0]
      const buffer = source.thumbnail.toJPEG(jpegQuality)
      const base64 = buffer.toString('base64')
      const size = source.thumbnail.getSize()

      this.lastScreenshot = {
        base64,
        width: size.width,
        height: size.height,
        timestamp: Date.now(),
      }

      return { 
        success: true, 
        base64, 
        width: size.width, 
        height: size.height,
        method: 'electron-desktopCapturer'
      }
    } catch (error) {
      console.error('[ScreenCaptureService] Desktop capturer failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get the last captured screenshot if available
   */
  getLastScreenshot() {
    return this.lastScreenshot
  }

  /**
   * Clear the screenshot cache
   */
  clearCache() {
    this.lastScreenshot = null
  }

  /**
   * Check if service is available
   */
  isAvailable() {
    return true // Always available in main process
  }

  /**
   * Get service status and capabilities
   */
  getStatus() {
    return {
      platform: process.platform,
      available: this.isAvailable(),
      sharpAvailable: !!sharp,
      lastCaptureTime: this.lastScreenshot?.timestamp || null,
      nativeSupport: process.platform === 'darwin',
      method: process.platform === 'darwin' && sharp ? 'native-screencapture-sharp' : 'electron-desktopCapturer',
    }
  }
}

// Export singleton instance
const screenCaptureService = new ScreenCaptureService()
module.exports = screenCaptureService