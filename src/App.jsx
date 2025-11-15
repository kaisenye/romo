import React, { useEffect, useState } from 'react'
import DictationView from './components/dictation/DictationView'
import Dashboard from './components/dashboard/Dashboard'
import OnboardingFlow from './components/onboarding/OnboardingFlow'
import AuthWindow from './components/auth/AuthWindow'
import { useAuth } from './providers/AuthProvider'
import useDictationStore from './stores/dictationStore'

function App() {
  const { setWindowVisible } = useDictationStore()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [isDashboard, setIsDashboard] = useState(false)
  const [isOnboarding, setIsOnboarding] = useState(false)
  const [isAuth, setIsAuth] = useState(false)

  // Check URL hash for dashboard/onboarding/auth mode
  useEffect(() => {
    const checkHash = () => {
      setIsDashboard(window.location.hash === '#dashboard')
      setIsOnboarding(window.location.hash === '#onboarding')
      setIsAuth(window.location.hash === '#auth')
    }

    checkHash()
    window.addEventListener('hashchange', checkHash)

    return () => window.removeEventListener('hashchange', checkHash)
  }, [])

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Make dictation store available globally for useAudioRecording hook
        window.useDictationStore = useDictationStore

        // Load persisted language setting
        const loadLanguage = useDictationStore.getState().loadLanguage
        if (loadLanguage) {
          await loadLanguage()
        }

        // Listen for setting changes from other windows (e.g., dashboard)
        if (window.electronAPI && window.electronAPI.onSettingChanged) {
          window.electronAPI.onSettingChanged((key, value) => {
            if (key === 'selectedLanguage') {
              useDictationStore.setState({ selectedLanguage: value })
            }
          })
        }

        // Initialize AI service
        if (window.electronAPI && window.electronAPI.aiInitialize) {
          console.log('Initializing AI service...')
          const result = await window.electronAPI.aiInitialize()
          if (result.success) {
            console.log('AI service initialized successfully')
          } else {
            console.error('Failed to initialize AI service:', result.error)
          }
        }

        // Handle tray events
        if (window.electronAPI) {
          window.electronAPI.onTrayOpenSettings(() => {
            console.log('Tray dashboard clicked')
            // Dashboard will be opened by the TrayManager in a separate window
          })
        }

        // Set window as visible
        setWindowVisible(true)
      } catch (error) {
        console.error('Failed to initialize app:', error)
      }
    }

    initializeApp()
  }, [setWindowVisible])

  // Show auth window (dedicated authentication window)
  if (isAuth) {
    return <AuthWindow />
  }

  // Show onboarding flow
  if (isOnboarding) {
    return (
      <OnboardingFlow
        onComplete={() => {
          // Close the onboarding window
          if (window.electronAPI?.closeWindow) {
            window.electronAPI.closeWindow()
          }
        }}
      />
    )
  }

  // Show dashboard (doesn't require auth, but will show auth prompt inside)
  if (isDashboard) {
    return (
      <div className="w-full h-screen">
        <Dashboard
          onClose={() => {
            // Close the dashboard window
            if (window.electronAPI?.closeDashboard) {
              window.electronAPI.closeDashboard()
            } else {
              window.close()
            }
          }}
        />
      </div>
    )
  }

  // Main dictation view - REQUIRES authentication
  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  // CRITICAL: Block dictation if not authenticated
  // This should never show because main.js should open auth window instead
  if (!isAuthenticated) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <p className="text-lg mb-2">Authentication Required</p>
          <p className="text-sm text-gray-400">Please sign in to use dictation</p>
        </div>
      </div>
    )
  }

  // User is authenticated, show dictation view
  return (
    <div className="w-full h-full">
      <DictationView />
    </div>
  )
}

export default App
