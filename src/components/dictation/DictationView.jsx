import React, { useEffect, useCallback, useRef, useState } from 'react'
import useDictationStore from '../../stores/dictationStore'
import useAudioRecording from '../../hooks/useAudioRecording'
import RecordingWave from './RecordingWave'
import ProcessingWave from './ProcessingWave'
import '../../styles/animations.css'

const DictationView = () => {
  const { error, isAgentMode, toggleAgentMode } = useDictationStore()
  const [showProcessingWave, setShowProcessingWave] = useState(false)
  const [showModeIndicator, setShowModeIndicator] = useState(false)

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
      // Show window if hidden
      if (window.electronAPI && window.electronAPI.expandWindowForRecording) {
        await window.electronAPI.expandWindowForRecording()
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

      // Keep pill size, show processing wave
      setShowProcessingWave(true)

      // Save the recording (this will trigger final processing)
      await saveRecording('dictation-session')

      // After processing is complete, hide window
      setShowProcessingWave(false)

      // Hide the window with slide up animation
      if (window.electronAPI && window.electronAPI.hideWindow) {
        await window.electronAPI.hideWindow()
      }
    } catch (error) {
      console.error('Failed to stop recording:', error)
      useDictationStore.getState().setError(`Failed to stop recording: ${error.message}`)
      setShowProcessingWave(false) // Reset on error
    }
  }, [stopRecording, saveRecording])

  // Agent mode toggle handler
  const handleToggleAgentMode = useCallback(async () => {
    if (isHandlingToggleRef.current) {
      return
    }

    isHandlingToggleRef.current = true

    // Toggle the mode first
    toggleAgentMode()

    // Show window but keep pill size
    if (window.electronAPI && window.electronAPI.expandWindowForRecording) {
      await window.electronAPI.expandWindowForRecording()
    }

    // Show mode indicator UI
    setShowModeIndicator(true)

    // Auto-hide after 1 second
    setTimeout(async () => {
      setShowModeIndicator(false)

      // Hide window after showing indicator
      if (window.electronAPI && window.electronAPI.hideWindow) {
        await window.electronAPI.hideWindow()
      }

      isHandlingToggleRef.current = false
    }, 1000)
  }, [toggleAgentMode])

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

    // Mode indicator listener (from main process)
    if (window.electronAPI.onShowModeIndicator) {
      window.electronAPI.onShowModeIndicator(() => {
        setShowModeIndicator(true)
        setTimeout(() => {
          setShowModeIndicator(false)
        }, 1000)
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
      className={`w-full h-full flex items-center justify-center bg-black/50 backdrop-blur-lg rounded-full ${
        isAgentMode ? 'border-2 border-lime-400' : ''
      }`}
    >
      {/* Main content */}
      <div className="relative z-10 flex items-center justify-center w-full h-full px-1">
        {showModeIndicator ? (
          // Mode indicator - show mode name in small pill
          <div className={`text-[8px] font-semibold ${isAgentMode ? 'text-lime-400' : 'text-white'}`}>
            {isAgentMode ? 'Agent' : 'Normal'}
          </div>
        ) : isRecording ? (
          // Recording - show real-time audio visualizer
          <RecordingWave audioLevel={audioLevel} isAgentMode={isAgentMode} />
        ) : showProcessingWave ? (
          // Processing - show animated wave
          <ProcessingWave isAgentMode={isAgentMode} />
        ) : (
          // Default state - simple circle
          <div className="w-0 h-0 bg-gray-900 rounded-full" />
        )}
      </div>
    </div>
  )
}

export default DictationView
