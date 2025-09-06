const fs = require('fs').promises
const path = require('path')
const { app } = require('electron')
const { v4: uuidv4 } = require('uuid')

class DictationHistoryService {
  constructor() {
    this.maxEntries = 10
    this.dataDir = app.getPath('userData')
    this.filePath = path.join(this.dataDir, 'dictation-history.json')
    this.backupPath = path.join(this.dataDir, 'dictation-history.backup.json')
    this.history = []
    this.isInitialized = false
  }

  /**
   * Initialize the service and load existing history
   */
  async initialize() {
    try {
      console.log('Initializing DictationHistoryService...')
      console.log('Data directory:', this.dataDir)
      console.log('History file path:', this.filePath)

      // Ensure data directory exists
      await fs.mkdir(this.dataDir, { recursive: true })

      // Load existing history
      await this.loadHistory()
      
      this.isInitialized = true
      console.log(`DictationHistoryService initialized with ${this.history.length} entries`)
    } catch (error) {
      console.error('Failed to initialize DictationHistoryService:', error)
      // Initialize with empty history if loading fails
      this.history = []
      this.isInitialized = true
    }
  }

  /**
   * Load history from file
   */
  async loadHistory() {
    try {
      const data = await fs.readFile(this.filePath, 'utf8')
      const parsed = JSON.parse(data)
      
      // Validate data structure
      if (Array.isArray(parsed)) {
        this.history = parsed
          .filter(entry => this.isValidEntry(entry))
          .slice(0, this.maxEntries) // Ensure we don't exceed max entries
        
        console.log(`Loaded ${this.history.length} valid entries from history file`)
      } else {
        console.warn('Invalid history file format, starting with empty history')
        this.history = []
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('History file does not exist, starting with empty history')
        this.history = []
      } else {
        console.error('Error loading history file:', error)
        // Try to load from backup
        await this.loadFromBackup()
      }
    }
  }

  /**
   * Load from backup file if main file is corrupted
   */
  async loadFromBackup() {
    try {
      console.log('Attempting to load from backup file...')
      const data = await fs.readFile(this.backupPath, 'utf8')
      const parsed = JSON.parse(data)
      
      if (Array.isArray(parsed)) {
        this.history = parsed
          .filter(entry => this.isValidEntry(entry))
          .slice(0, this.maxEntries)
        
        console.log(`Restored ${this.history.length} entries from backup`)
        // Restore main file from backup
        await this.saveHistory()
      } else {
        this.history = []
      }
    } catch (backupError) {
      console.warn('Backup file also unavailable, starting fresh:', backupError.message)
      this.history = []
    }
  }

  /**
   * Validate entry structure
   */
  isValidEntry(entry) {
    return (
      entry &&
      typeof entry.id === 'string' &&
      typeof entry.timestamp === 'string' &&
      typeof entry.text === 'string' &&
      typeof entry.wordCount === 'number' &&
      typeof entry.duration === 'number' &&
      entry.text.length > 0
    )
  }

  /**
   * Save history to file with backup
   */
  async saveHistory() {
    try {
      const data = JSON.stringify(this.history, null, 2)
      
      // Create backup before saving
      try {
        await fs.copyFile(this.filePath, this.backupPath)
      } catch (backupError) {
        // Backup creation failed, but continue with main save
        console.warn('Failed to create backup:', backupError.message)
      }

      // Save main file
      await fs.writeFile(this.filePath, data, 'utf8')
      console.log(`Saved ${this.history.length} entries to history file`)
    } catch (error) {
      console.error('Failed to save history:', error)
      throw error
    }
  }

  /**
   * Add a new dictation entry
   */
  async addEntry(dictationData) {
    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      // Calculate word count
      const wordCount = this.calculateWordCount(dictationData.text)
      
      // Create entry
      const entry = {
        id: uuidv4(),
        timestamp: dictationData.timestamp || new Date().toISOString(),
        text: dictationData.text.trim(),
        wordCount: wordCount,
        duration: dictationData.duration || 0,
        processingTime: dictationData.processingTime || 0,
        confidence: dictationData.confidence || null
      }

      // Validate entry
      if (!this.isValidEntry(entry)) {
        throw new Error('Invalid entry data')
      }

      // Add to beginning of array (most recent first)
      this.history.unshift(entry)

      // Limit to maxEntries
      if (this.history.length > this.maxEntries) {
        this.history = this.history.slice(0, this.maxEntries)
      }

      // Save to file
      await this.saveHistory()

      console.log('Added new dictation entry:', { id: entry.id, wordCount, duration: entry.duration })
      return entry
    } catch (error) {
      console.error('Failed to add dictation entry:', error)
      throw error
    }
  }

  /**
   * Calculate word count from text
   */
  calculateWordCount(text) {
    if (!text || typeof text !== 'string') return 0
    
    return text
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0)
      .length
  }

  /**
   * Get all history entries
   */
  async getHistory() {
    if (!this.isInitialized) {
      await this.initialize()
    }
    
    return [...this.history] // Return a copy to prevent external modifications
  }

  /**
   * Get statistics from history
   */
  async getStatistics() {
    if (!this.isInitialized) {
      await this.initialize()
    }

    if (this.history.length === 0) {
      return {
        totalSessions: 0,
        totalWords: 0,
        avgWordsPerSession: 0,
        avgDuration: 0,
        totalTime: 0,
        streakDays: 0
      }
    }

    const totalWords = this.history.reduce((sum, entry) => sum + entry.wordCount, 0)
    const totalTime = this.history.reduce((sum, entry) => sum + entry.duration, 0)
    const avgWordsPerSession = Math.round(totalWords / this.history.length)
    const avgDuration = Math.round(totalTime / this.history.length)

    // Calculate streak days (consecutive days with dictation)
    const streakDays = this.calculateStreakDays()

    return {
      totalSessions: this.history.length,
      totalWords,
      avgWordsPerSession,
      avgDuration,
      totalTime,
      streakDays
    }
  }

  /**
   * Calculate consecutive days with dictation activity
   */
  calculateStreakDays() {
    if (this.history.length === 0) return 0

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get unique dates from history
    const dates = this.history
      .map(entry => {
        const date = new Date(entry.timestamp)
        date.setHours(0, 0, 0, 0)
        return date.getTime()
      })
      .filter((date, index, arr) => arr.indexOf(date) === index) // Remove duplicates
      .sort((a, b) => b - a) // Most recent first

    let streakDays = 0
    let currentDate = today.getTime()

    for (const date of dates) {
      if (date === currentDate) {
        streakDays++
        currentDate -= 24 * 60 * 60 * 1000 // Go back one day
      } else if (date === currentDate + 24 * 60 * 60 * 1000) {
        // Allow for today not having any entries yet
        currentDate = date
        streakDays++
        currentDate -= 24 * 60 * 60 * 1000
      } else {
        break // Streak broken
      }
    }

    return streakDays
  }

  /**
   * Clear all history
   */
  async clearHistory() {
    if (!this.isInitialized) {
      await this.initialize()
    }

    this.history = []
    await this.saveHistory()
    console.log('Cleared all dictation history')
  }

  /**
   * Get entry by ID
   */
  async getEntry(id) {
    if (!this.isInitialized) {
      await this.initialize()
    }

    return this.history.find(entry => entry.id === id) || null
  }

  /**
   * Delete entry by ID
   */
  async deleteEntry(id) {
    if (!this.isInitialized) {
      await this.initialize()
    }

    const initialLength = this.history.length
    this.history = this.history.filter(entry => entry.id !== id)
    
    if (this.history.length < initialLength) {
      await this.saveHistory()
      console.log('Deleted entry:', id)
      return true
    }
    
    return false
  }
}

// Create singleton instance
const dictationHistoryService = new DictationHistoryService()

module.exports = dictationHistoryService