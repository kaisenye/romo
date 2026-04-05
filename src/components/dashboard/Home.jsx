import React, { useEffect, useState } from 'react'
import { Clock, FileText, Zap, TrendingUp, Copy, Check } from 'lucide-react'
import useDictationStore from '../../stores/dictationStore'

const Home = () => {
  // Use Zustand selectors directly to ensure re-renders
  const dictationHistory = useDictationStore((state) => state.dictationHistory || [])
  const historyStats = useDictationStore(
    (state) =>
      state.historyStats || {
        totalSessions: 0,
        totalWords: 0,
        avgWordsPerSession: 0,
        avgDuration: 0,
        totalTime: 0,
        streakDays: 0,
      }
  )
  const isLoadingHistory = useDictationStore((state) => state.isLoadingHistory || false)

  const [copiedId, setCopiedId] = useState(null)
  const [copyTimeout, setCopyTimeout] = useState(null)

  // Load dictation history when component mounts
  useEffect(() => {
    const loadHistory = useDictationStore.getState().loadDictationHistory
    if (loadHistory) {
      loadHistory().catch((error) => {
        console.error('Error loading dictation history:', error)
      })
    }
  }, [])

  // Listen for view changes to refresh history when user returns to dashboard
  // This ensures real-time updates when new dictation entries are added
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Refresh history when user returns to the dashboard tab/window
      if (document.visibilityState === 'visible' && !isLoadingHistory) {
        const loadHistory = useDictationStore.getState().loadDictationHistory
        if (loadHistory) {
          loadHistory().catch((error) => {
            console.error('Error refreshing dictation history on visibility change:', error)
          })
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, []) // Remove dependencies that cause infinite loops

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeout) {
        clearTimeout(copyTimeout)
      }
    }
  }, [copyTimeout])

  // Copy function with visual feedback
  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)

      // Clear any existing timeout
      if (copyTimeout) {
        clearTimeout(copyTimeout)
      }

      // Set new timeout to reset the copied state
      const timeout = setTimeout(() => {
        setCopiedId(null)
        setCopyTimeout(null)
      }, 2000)

      setCopyTimeout(timeout)
    } catch (err) {
      console.error('Failed to copy text:', err)
      // Fallback for older browsers or failed clipboard access
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr)
      }
      document.body.removeChild(textArea)
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    return `${Math.floor(diffInHours / 24)}d ago`
  }

  // Use real statistics from the store, with fallbacks for when history is empty
  const totalWords = historyStats.totalWords
  const avgWordsPerSession = historyStats.avgWordsPerSession
  const totalSessions = historyStats.totalSessions
  const streakDays = historyStats.streakDays

  return (
    <div className="flex-1 px-6 pt-6 pb-16 overflow-y-auto scrollbar-thin">
      {/* Header Stats */}
      <div className="mb-8">
        <h1 className="text-lg font-bold text-gray-900 mb-2">Welcome back</h1>
        <div className="flex items-center space-x-6 text-xs text-gray-600">
          <div className="flex items-center space-x-1">
            <Zap className="w-4 h-4 text-orange-400" />
            <span>
              {streakDays} day{streakDays !== 1 ? 's' : ''} streak
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <FileText className="w-4 h-4 text-blue-400" />
            <span>{totalWords} words</span>
          </div>
          <div className="flex items-center space-x-1">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span>{avgWordsPerSession} avg words/session</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-4">This Week</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center space-x-2 mb-1">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-gray-600">Sessions</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">{totalSessions}</span>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center space-x-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-xs text-gray-600">Total Words</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">{totalWords}</span>
          </div>
          {/* TODO: MVP: Agent mode stats temporarily commented out - restore for full release
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center space-x-2 mb-1">
              <Zap className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-gray-600">Agent Mode</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">
              {dictationHistory.filter((item) => item.isAgentMode).length}
            </span>
          </div>
          */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center space-x-2 mb-1">
              <Clock className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-gray-600">Avg Duration</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">{historyStats.avgDuration}s</span>
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Recent Activity</h2>
        </div>
        {isLoadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-600 text-sm">Loading dictation history...</div>
          </div>
        ) : !Array.isArray(dictationHistory) || dictationHistory.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 text-sm">No dictations yet</p>
              <p className="text-gray-500 text-xs">Start dictating to see your history here</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {Array.isArray(dictationHistory) &&
              dictationHistory.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-xs text-gray-600">{formatTime(item.timestamp)}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-3 text-xs text-gray-600">
                        <span>{item.wordCount} words</span>
                        <span>{item.duration}s</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(item.text, item.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
                        title="Copy to clipboard"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-600 hover:text-gray-900" />
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-900 leading-relaxed">{item.text}</p>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Home
