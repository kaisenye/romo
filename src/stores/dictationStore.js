import { create } from 'zustand'

const useDictationStore = create((set) => ({
  // State
  isRecording: false,
  isProcessing: false,
  transcription: '',
  error: null,
  isWindowVisible: false,
  isAgentMode: false,
  currentView: 'dictation', // 'dictation' or 'dashboard'

  // Dashboard settings
  userPlan: 'Basic',
  customInstructions: '',
  apiKeys: {
    openai: '',
    claude: '',
  },
  selectedLanguage: 'auto', // Whisper transcription language (default: auto-detect)
  transcriptionStyle: 'email', // Transcription style: 'email' or 'text-message'

  // Dictation History
  dictationHistory: [],
  historyStats: {
    totalSessions: 0,
    totalWords: 0,
    avgWordsPerSession: 0,
    avgDuration: 0,
    totalTime: 0,
    streakDays: 0,
  },
  isLoadingHistory: false,

  // Actions
  updateTranscription: (text) => {
    set({
      transcription: text,
    })
  },

  setError: (error) => {
    set({ error })
  },

  clearError: () => {
    set({ error: null })
  },

  setWindowVisible: (visible) => {
    set({ isWindowVisible: visible })
  },

  setRecordingState: (isRecording, isProcessing) => {
    set({ isRecording, isProcessing })
  },

  toggleAgentMode: () => {
    set((state) => {
      const newMode = !state.isAgentMode
      console.log('🔄 STORE: toggleAgentMode called, changing from', state.isAgentMode, 'to', newMode)
      return { isAgentMode: newMode }
    })
  },

  setAgentMode: (isAgentMode) => {
    set({ isAgentMode })
  },

  setCurrentView: (view) => {
    set({ currentView: view })
  },

  updateCustomInstructions: (instructions) => {
    set({ customInstructions: instructions })
  },

  updateApiKey: (provider, key) => {
    set((state) => ({
      apiKeys: {
        ...state.apiKeys,
        [provider]: key,
      },
    }))
  },

  updateLanguage: async (language) => {
    set({ selectedLanguage: language })
    // Persist to Electron settings
    if (window.electronAPI && window.electronAPI.setSetting) {
      await window.electronAPI.setSetting('selectedLanguage', language)
    }
  },

  // Load persisted language from Electron settings
  loadLanguage: async () => {
    if (window.electronAPI && window.electronAPI.getSetting) {
      try {
        const savedLanguage = await window.electronAPI.getSetting('selectedLanguage', 'auto')
        set({ selectedLanguage: savedLanguage })
        return savedLanguage
      } catch (error) {
        console.error('Failed to load language setting:', error)
        return 'auto'
      }
    }
    return 'auto'
  },

  updateTranscriptionStyle: async (style) => {
    set({ transcriptionStyle: style })
    // Persist to Electron settings
    if (window.electronAPI && window.electronAPI.setSetting) {
      await window.electronAPI.setSetting('transcriptionStyle', style)
    }
  },

  // Load persisted transcription style from Electron settings
  loadTranscriptionStyle: async () => {
    if (window.electronAPI && window.electronAPI.getSetting) {
      try {
        const savedStyle = await window.electronAPI.getSetting('transcriptionStyle', 'email')
        set({ transcriptionStyle: savedStyle })
        return savedStyle
      } catch (error) {
        console.error('Failed to load transcription style setting:', error)
        return 'email'
      }
    }
    return 'email'
  },

  reset: () => {
    set({
      isRecording: false,
      isProcessing: false,
      transcription: '',
      error: null,
    })
  },

  // Dictation History Actions
  loadDictationHistory: async () => {
    console.log('🔄 STORE: loadDictationHistory called')
    set({ isLoadingHistory: true })
    try {
      if (window.electronAPI && window.electronAPI.getDictationHistory) {
        console.log('📡 Fetching dictation history...')
        const historyResponse = await window.electronAPI.getDictationHistory()
        const statsResponse = await window.electronAPI.getDictationStats()

        console.log('📦 Raw history response:', historyResponse)
        console.log('📊 Raw stats response:', statsResponse)

        // Extract the actual array from the response object
        let history = historyResponse
        if (historyResponse && typeof historyResponse === 'object' && !Array.isArray(historyResponse)) {
          // Convert object with numeric keys to array
          const keys = Object.keys(historyResponse)
            .filter((key) => !isNaN(key))
            .sort((a, b) => Number(a) - Number(b))
          history = keys.map((key) => historyResponse[key])
          console.log('🔧 Converted object to array:', history)
        }

        set((state) => {
          console.log('🏪 Setting store state with:', {
            history: history || [],
            historyLength: (history || []).length,
            stats: statsResponse || state.historyStats,
          })
          return {
            dictationHistory: history || [],
            historyStats: statsResponse || state.historyStats,
            isLoadingHistory: false,
          }
        })

        console.log('✅ Store updated successfully')
      } else {
        console.warn('⚠️ electronAPI.getDictationHistory not available')
        set({ isLoadingHistory: false })
      }
    } catch (error) {
      console.error('❌ Failed to load dictation history:', error)
      set({
        isLoadingHistory: false,
        error: 'Failed to load dictation history',
      })
    }
  },

  addDictationEntry: async (entry) => {
    try {
      if (window.electronAPI && window.electronAPI.addDictationEntry) {
        const savedEntry = await window.electronAPI.addDictationEntry(entry)

        // Update local state
        set((state) => {
          const currentHistory = state.dictationHistory
          const newHistory = [savedEntry, ...currentHistory.slice(0, 9)] // Keep latest 10
          return {
            dictationHistory: newHistory,
          }
        })

        // Recalculate stats
        const stats = await window.electronAPI.getDictationStats()
        set((state) => ({
          historyStats: stats || state.historyStats,
        }))

        console.log('Added dictation entry to history:', savedEntry.id)
        return savedEntry
      } else {
        console.warn('electronAPI.addDictationEntry not available')
        return null
      }
    } catch (error) {
      console.error('Failed to add dictation entry:', error)
      set({ error: 'Failed to save dictation entry' })
      throw error
    }
  },

  deleteDictationEntry: async (id) => {
    try {
      if (window.electronAPI && window.electronAPI.deleteDictationEntry) {
        const success = await window.electronAPI.deleteDictationEntry(id)

        if (success) {
          // Update local state
          set((state) => ({
            dictationHistory: state.dictationHistory.filter((entry) => entry.id !== id),
          }))

          // Recalculate stats
          const stats = await window.electronAPI.getDictationStats()
          set((state) => ({
            historyStats: stats || state.historyStats,
          }))

          console.log('Deleted dictation entry:', id)
          return true
        }
        return false
      } else {
        console.warn('electronAPI.deleteDictationEntry not available')
        return false
      }
    } catch (error) {
      console.error('Failed to delete dictation entry:', error)
      set({ error: 'Failed to delete dictation entry' })
      return false
    }
  },

  clearDictationHistory: async () => {
    try {
      if (window.electronAPI && window.electronAPI.clearDictationHistory) {
        await window.electronAPI.clearDictationHistory()

        set({
          dictationHistory: [],
          historyStats: {
            totalSessions: 0,
            totalWords: 0,
            avgWordsPerSession: 0,
            avgDuration: 0,
            totalTime: 0,
            streakDays: 0,
          },
        })

        console.log('Cleared dictation history')
      } else {
        console.warn('electronAPI.clearDictationHistory not available')
      }
    } catch (error) {
      console.error('Failed to clear dictation history:', error)
      set({ error: 'Failed to clear dictation history' })
    }
  },

  // Debug method to test store updates
  debugSetTestHistory: () => {
    console.log('🧪 Setting test history data')
    set({
      dictationHistory: [
        {
          id: 'test-1',
          timestamp: new Date().toISOString(),
          text: 'This is a test dictation entry',
          wordCount: 7,
          duration: 5,
          processingTime: 100,
        },
      ],
      historyStats: {
        totalSessions: 1,
        totalWords: 7,
        avgWordsPerSession: 7,
        avgDuration: 5,
        totalTime: 5,
        streakDays: 1,
      },
    })
    console.log('✅ Test data set')
  },
}))

export default useDictationStore
