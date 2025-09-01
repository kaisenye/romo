import React from 'react'
import { Clock, FileText, Zap, TrendingUp } from 'lucide-react'

const Home = () => {
  // Fake temporary dictation history data
  const dictationHistory = [
    {
      id: 1,
      timestamp: '2024-03-15T14:30:00Z',
      text: 'Please draft an email to the marketing team about our upcoming product launch. The email should include key features, timeline, and next steps for coordination.',
      wordCount: 28,
      duration: '45s',
      isAgentMode: true,
    },
    {
      id: 2,
      timestamp: '2024-03-15T11:15:00Z',
      text: 'Meeting notes from today: Discussed Q2 budget allocation, approved new hiring plan for engineering team, need to follow up on client feedback by Friday.',
      wordCount: 26,
      duration: '38s',
      isAgentMode: false,
    },
    {
      id: 3,
      timestamp: '2024-03-15T09:45:00Z',
      text: 'Create a comprehensive project timeline for the mobile app redesign including research phase, wireframing, design mockups, development sprints, and testing phases.',
      wordCount: 24,
      duration: '42s',
      isAgentMode: true,
    },
    {
      id: 4,
      timestamp: '2024-03-14T16:20:00Z',
      text: 'Quick reminder to schedule dentist appointment, buy groceries for dinner party this weekend, and review the quarterly reports before Monday morning.',
      wordCount: 22,
      duration: '35s',
      isAgentMode: false,
    },
    {
      id: 5,
      timestamp: '2024-03-14T13:10:00Z',
      text: 'Draft a proposal for implementing automated testing in our CI/CD pipeline. Include cost analysis, timeline, and expected benefits for the development team.',
      wordCount: 25,
      duration: '41s',
      isAgentMode: true,
    },
  ]

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    return `${Math.floor(diffInHours / 24)}d ago`
  }

  const totalWords = dictationHistory.reduce((sum, item) => sum + item.wordCount, 0)
  const avgWordsPerSession = Math.round(totalWords / dictationHistory.length)

  return (
    <div className="flex-1 px-6 pt-6 pb-16 overflow-y-auto">
      {/* Header Stats */}
      <div className="mb-8">
        <h1 className="text-lg font-bold text-neutral-100 mb-2">Welcome back, User</h1>
        <div className="flex items-center space-x-6 text-xs text-neutral-400">
          <div className="flex items-center space-x-1">
            <Zap className="w-4 h-4 text-orange-400" />
            <span>1 week streak</span>
          </div>
          <div className="flex items-center space-x-1">
            <FileText className="w-4 h-4 text-blue-400" />
            <span>{totalWords} words</span>
          </div>
          <div className="flex items-center space-x-1">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span>{avgWordsPerSession} avg WPM</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-neutral-100 mb-4">This Week</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
            <div className="flex items-center space-x-2 mb-1">
              <FileText className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-neutral-400">Sessions</span>
            </div>
            <span className="text-lg font-semibold text-neutral-100">{dictationHistory.length}</span>
          </div>
          <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
            <div className="flex items-center space-x-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-xs text-neutral-400">Total Words</span>
            </div>
            <span className="text-lg font-semibold text-neutral-100">{totalWords}</span>
          </div>
          {/* TODO: MVP: Agent mode stats temporarily commented out - restore for full release
          <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
            <div className="flex items-center space-x-2 mb-1">
              <Zap className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-neutral-400">Agent Mode</span>
            </div>
            <span className="text-lg font-semibold text-neutral-100">
              {dictationHistory.filter((item) => item.isAgentMode).length}
            </span>
          </div>
          */}
          <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
            <div className="flex items-center space-x-2 mb-1">
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-neutral-400">Avg Duration</span>
            </div>
            <span className="text-lg font-semibold text-neutral-100">
              {Math.round(
                dictationHistory.reduce((sum, item) => sum + parseInt(item.duration), 0) / dictationHistory.length
              )}
              s
            </span>
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="text-base font-semibold text-neutral-100 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {dictationHistory.map((item) => (
            <div
              key={item.id}
              className="bg-neutral-800 rounded-lg p-4 border border-neutral-700 hover:border-neutral-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-neutral-500" />
                  <span className="text-xs text-neutral-400">{formatTime(item.timestamp)}</span>
                  {/* TODO: MVP: Agent mode badge temporarily commented out - restore for full release
                  {item.isAgentMode && (
                    <span className="px-2 py-0.5 bg-blue-900/30 text-blue-300 text-[10px] rounded-lg border border-blue-800">
                      Agent Mode
                    </span>
                  )}
                  */}
                </div>
                <div className="flex items-center space-x-3 text-xs text-neutral-500">
                  <span>{item.wordCount} words</span>
                  <span>{item.duration}</span>
                </div>
              </div>
              <p className="text-sm text-neutral-200 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Home
