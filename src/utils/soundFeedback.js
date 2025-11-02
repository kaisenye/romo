/**
 * Sound Feedback Utility
 * Provides audio feedback for recording start/stop events
 */

class SoundFeedback {
  constructor() {
    this.enabled = true
    this.startSound = null
    this.stopSound = null
    this.loaded = false
  }

  /**
   * Preload sound files for instant playback
   */
  async preloadSounds() {
    try {
      // Create Audio elements
      this.startSound = new Audio('/sounds/start.wav')
      this.stopSound = new Audio('/sounds/stop.wav')

      // Preload by setting volume and loading
      this.startSound.volume = 0.4 // Moderate volume (40%)
      this.stopSound.volume = 0.4

      // Add error handlers for audio loading
      this.startSound.addEventListener('error', (e) => {
        console.warn('Failed to load start.wav:', e)
        this.loaded = false
      })

      this.stopSound.addEventListener('error', (e) => {
        console.warn('Failed to load stop.wav:', e)
        this.loaded = false
      })

      // Wait for at least one sound to load successfully
      await Promise.race([
        new Promise((resolve) => {
          this.startSound.addEventListener('canplaythrough', () => {
            this.loaded = true
            resolve()
          })
        }),
        new Promise((resolve) => {
          this.stopSound.addEventListener('canplaythrough', () => {
            this.loaded = true
            resolve()
          })
        }),
        // Timeout after 2 seconds
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ])

      this.startSound.load()
      this.stopSound.load()

      console.log('Sound feedback loaded successfully')
    } catch (error) {
      console.warn('Failed to load sound feedback:', error)
      this.loaded = false
    }
  }

  /**
   * Play sound when recording starts
   */
  playStart() {
    if (!this.enabled || !this.loaded || !this.startSound) {
      return
    }

    try {
      // Reset to beginning in case it was played before
      this.startSound.currentTime = 0
      this.startSound.play().catch((err) => {
        console.warn('Failed to play start sound:', err)
      })
    } catch (error) {
      console.warn('Error playing start sound:', error)
    }
  }

  /**
   * Play sound when recording stops
   */
  playStop() {
    if (!this.enabled || !this.loaded || !this.stopSound) {
      return
    }

    try {
      // Reset to beginning in case it was played before
      this.stopSound.currentTime = 0
      this.stopSound.play().catch((err) => {
        console.warn('Failed to play stop sound:', err)
      })
    } catch (error) {
      console.warn('Error playing stop sound:', error)
    }
  }

  /**
   * Enable sound feedback
   */
  enable() {
    this.enabled = true
  }

  /**
   * Disable sound feedback
   */
  disable() {
    this.enabled = false
  }

  /**
   * Toggle sound feedback
   */
  toggle() {
    this.enabled = !this.enabled
    return this.enabled
  }

  /**
   * Check if sound feedback is enabled
   */
  isEnabled() {
    return this.enabled
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume) {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    if (this.startSound) {
      this.startSound.volume = clampedVolume
    }
    if (this.stopSound) {
      this.stopSound.volume = clampedVolume
    }
  }
}

// Create singleton instance
const soundFeedback = new SoundFeedback()

// Preload sounds when module is imported
soundFeedback.preloadSounds()

export default soundFeedback
