import { useState, useEffect } from 'react'
import { useAuth } from '../../providers/AuthProvider'

/**
 * AuthWindow
 * Dedicated window for authentication
 * Shows when user is not authenticated on app startup
 */
export default function AuthWindow() {
  const { isAuthenticated, loading, openLogin } = useAuth()
  const [status, setStatus] = useState('idle') // idle, opening-browser, waiting

  useEffect(() => {
    // If user becomes authenticated, close this window
    if (isAuthenticated) {
      console.log('User authenticated, closing auth window')
      // The main process will handle closing this window
      // and opening the pill window
    }
  }, [isAuthenticated])

  const handleSignIn = () => {
    setStatus('opening-browser')
    openLogin()

    // After a brief delay, show "waiting" status
    setTimeout(() => {
      setStatus('waiting')
    }, 1000)
  }

  if (loading) {
    return (
      <div className="w-full h-screen flex flex-col bg-gray-50">
        {/* Draggable title bar area */}
        <div className="h-14 flex-shrink-0" style={{ WebkitAppRegion: 'drag' }} />

        {/* Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-6 animate-pulse">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-gray-900 text-lg">Checking authentication...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50">
      {/* Draggable title bar area */}
      <div className="h-14 flex-shrink-0" style={{ WebkitAppRegion: 'drag' }} />

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-sm w-full text-center" style={{ WebkitAppRegion: 'no-drag' }}>
          {/* Simple App Title */}
          <h1 className="text-2xl font-medium text-gray-900 mb-8">Romo</h1>

          {status === 'idle' && (
            <>
              <p className="text-gray-600 text-sm mb-8">Sign in to continue</p>
              <button
                onClick={handleSignIn}
                className="w-fit mx-auto py-2 px-12 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
              >
                Sign In
              </button>
            </>
          )}

          {status === 'opening-browser' && (
            <>
              <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-900 text-sm">Opening browser...</p>
            </>
          )}

          {status === 'waiting' && (
            <>
              <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-900 text-sm mb-4">Waiting for authentication...</p>
              <button
                onClick={handleSignIn}
                className="text-xs text-gray-600 hover:text-gray-900 underline transition-colors"
              >
                Retry
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
