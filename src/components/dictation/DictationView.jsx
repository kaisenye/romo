import React, { useEffect, useCallback, useRef, useState } from 'react'
import useDictationStore from '../../stores/dictationStore'
import useAudioRecording from '../../hooks/useAudioRecording'
import SoundWaveVisualizer from './SoundWaveVisualizer'
import '../../styles/animations.css'

const DictationView = () => {
  const { error, isAgentMode, toggleAgentMode } = useDictationStore()
  const [isExpanded, setIsExpanded] = useState(false)
  const [showProcessingWave, setShowProcessingWave] = useState(false)

  // Use the proper audio recording hook
  const {
    isRecording,
    isProcessing,
    error: recordingError,
    audioLevel,
    startRecording,
    stopRecording,
    saveRecording,
  } = useAudioRecording()

  // Ref to track if we're currently handling a toggle to prevent double-triggers
  const isHandlingToggleRef = useRef(false)

  // Ref to track the latest recording state to prevent stale closures
  const recordingStateRef = useRef(isRecording)

  // Update the ref whenever isRecording changes
  useEffect(() => {
    recordingStateRef.current = isRecording
  }, [isRecording])

  // Press and hold behavior handlers
  const handleStartRecording = useCallback(async () => {
    try {
      // Expand window first
      if (window.electronAPI && window.electronAPI.expandWindowForRecording) {
        await window.electronAPI.expandWindowForRecording()
        setIsExpanded(true)
      }

      await startRecording()
    } catch (error) {
      console.error('Failed to start recording:', error)
      useDictationStore.getState().setError('Failed to access microphone')
    }
  }, [startRecording])

  const handleStopRecording = useCallback(async () => {
    try {
      await stopRecording()

      // Shrink window but show processing wave
      if (window.electronAPI && window.electronAPI.shrinkWindowToPill) {
        await window.electronAPI.shrinkWindowToPill()
        setIsExpanded(false)
        setShowProcessingWave(true) // Show processing wave in pill mode
      }

      // Save the recording (this will trigger final processing)
      await saveRecording('dictation-session')

      // After processing is complete, return to circle
      setShowProcessingWave(false)
    } catch (error) {
      console.error('Failed to stop recording:', error)
      useDictationStore.getState().setError(`Failed to stop recording: ${error.message}`)
      setShowProcessingWave(false) // Reset on error
    }
  }, [stopRecording, saveRecording])

  // Check AI services status on mount
  useEffect(() => {
    const checkServices = async () => {
      if (window.electronAPI) {
        try {
          const whisperStatus = await window.electronAPI.aiGetStatus()
        } catch (error) {
          console.error('Error checking service status:', error)
        }
      }
    }

    checkServices()
  }, [])

  // Agent mode toggle handler
  const handleToggleAgentMode = useCallback(() => {
    if (isHandlingToggleRef.current) {
      return
    }

    isHandlingToggleRef.current = true
    toggleAgentMode()

    setTimeout(() => {
      isHandlingToggleRef.current = false
    }, 500)
  }, [toggleAgentMode, isAgentMode])

  // Set up global shortcuts once on mount
  useEffect(() => {
    if (!window.electronAPI) {
      return
    }

    // Set up start recording listener
    if (window.electronAPI.onGlobalShortcutStartRecording) {
      window.electronAPI.onGlobalShortcutStartRecording(() => {
        if (!isHandlingToggleRef.current) {
          isHandlingToggleRef.current = true
          handleStartRecording()
        }
      })
    }

    // Set up stop recording listener
    if (window.electronAPI.onGlobalShortcutStopRecording) {
      window.electronAPI.onGlobalShortcutStopRecording(() => {
        if (isHandlingToggleRef.current) {
          isHandlingToggleRef.current = false
          handleStopRecording()
        }
      })
    }

    // Agent mode toggle listener
    if (window.electronAPI.onGlobalShortcutToggleAgentMode) {
      window.electronAPI.onGlobalShortcutToggleAgentMode(() => {
        handleToggleAgentMode()
      })
    }

    // Cleanup function
    return () => {
      // Note: In a real implementation, you might want to remove listeners
      // but the current electronAPI doesn't expose removeListener methods
    }
  }, [handleStartRecording, handleStopRecording, handleToggleAgentMode]) // Agent mode dependency restored

  // Update store with recording state
  useEffect(() => {
    useDictationStore.getState().setRecordingState(isRecording, isProcessing)
  }, [isRecording, isProcessing])

  // Handle recording errors (avoid re-render loops)
  useEffect(() => {
    if (recordingError && recordingError !== error) {
      useDictationStore.getState().setError(recordingError)
    }
  }, [recordingError, error])

  return (
    <div
      className={`w-full h-full flex items-center justify-center bg-black rounded-full ${
        isAgentMode ? 'border-2 border-lime-400' : ''
      }`}
    >
      {/* Draggable area - disabled in pill mode */}
      {isExpanded && <div className="absolute inset-0 cursor-move" style={{ WebkitAppRegion: 'drag' }} />}

      {/* Main content */}
      <div className="relative z-10 flex items-center justify-center w-full h-full px-2">
        {isExpanded ? (
          // Expanded view with sound wave
          <div className="flex items-center justify-center rounded-full">
            <SoundWaveVisualizer audioLevel={audioLevel} isRecording={isRecording} isAgentMode={isAgentMode} />

            {/* Processing indicator */}
            {isProcessing && (
              <div className="absolute bottom-1 left-1 flex items-center space-x-1">
                <div
                  className="w-0.5 h-0.5 bg-blue-400 rounded-full animate-pulse"
                  style={{ animationDelay: '0.2s' }}
                />
                <div
                  className="w-0.5 h-0.5 bg-blue-400 rounded-full animate-pulse"
                  style={{ animationDelay: '0.4s' }}
                />
              </div>
            )}
          </div>
        ) : (
          // Pill mode - show different states
          <div className="w-full h-full flex items-center justify-center">
            {showProcessingWave ? (
              // Processing state - waving loader animation (lime for agent mode, blue for normal)
              <div className="flex items-center space-x-0.5">
                <div
                  className={`w-0.5 h-1 rounded-full wave-bar ${isAgentMode ? 'bg-lime-400' : 'bg-blue-400'}`}
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className={`w-0.5 h-1 rounded-full wave-bar ${isAgentMode ? 'bg-lime-400' : 'bg-blue-400'}`}
                  style={{ animationDelay: '100ms' }}
                />
                <div
                  className={`w-0.5 h-1 rounded-full wave-bar ${isAgentMode ? 'bg-lime-400' : 'bg-blue-400'}`}
                  style={{ animationDelay: '200ms' }}
                />
                <div
                  className={`w-0.5 h-1 rounded-full wave-bar ${isAgentMode ? 'bg-lime-400' : 'bg-blue-400'}`}
                  style={{ animationDelay: '300ms' }}
                />
                <div
                  className={`w-0.5 h-1 rounded-full wave-bar ${isAgentMode ? 'bg-lime-400' : 'bg-blue-400'}`}
                  style={{ animationDelay: '400ms' }}
                />
                <div
                  className={`w-0.5 h-1 rounded-full wave-bar ${isAgentMode ? 'bg-lime-400' : 'bg-blue-400'}`}
                  style={{ animationDelay: '500ms' }}
                />
              </div>
            ) : (
              // Default state - simple circle
              <div className="w-0 h-0 bg-gray-900 rounded-full" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DictationView
