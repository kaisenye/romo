import React, { useState, useEffect } from 'react'
import { Mic, Monitor, Check, X, Loader2, Circle } from 'lucide-react'
import EmergeAnimation from './EmergeAnimation'

const PermissionStatus = {
  NOT_DETERMINED: 'not-determined',
  DENIED: 'denied',
  GRANTED: 'granted',
  CHECKING: 'checking',
}

const PermissionsPage = ({ onNext, onBack }) => {
  const [micStatus, setMicStatus] = useState(PermissionStatus.CHECKING)
  const [screenStatus, setScreenStatus] = useState(PermissionStatus.CHECKING)

  // Check initial permission status
  useEffect(() => {
    checkPermissions()

    // Poll for permission changes
    const interval = setInterval(checkPermissions, 1000)
    return () => clearInterval(interval)
  }, [])

  const checkPermissions = async () => {
    if (window.electronAPI?.getPermissionStatus) {
      const status = await window.electronAPI.getPermissionStatus()
      setMicStatus(status.microphone || PermissionStatus.NOT_DETERMINED)
      setScreenStatus(status.screen || PermissionStatus.NOT_DETERMINED)
    }
  }

  const requestMicrophonePermission = async () => {
    if (window.electronAPI?.requestMicrophonePermission) {
      setMicStatus(PermissionStatus.CHECKING)
      await window.electronAPI.requestMicrophonePermission()
      await checkPermissions()
    }
  }

  const requestScreenPermission = async () => {
    if (window.electronAPI?.requestScreenPermission) {
      setScreenStatus(PermissionStatus.CHECKING)
      await window.electronAPI.requestScreenPermission()
      await checkPermissions()
    }
  }

  const canContinue = micStatus === PermissionStatus.GRANTED && screenStatus === PermissionStatus.GRANTED

  return (
    <EmergeAnimation duration={800}>
      <div className="flex flex-col items-center justify-center h-full px-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Grant Permissions</h2>
          <p className="text-gray-400 text-sm">Romo needs access to work properly</p>
        </div>

        <div className="space-y-4 w-full max-w-md mb-8">
          {/* Microphone Permission */}
          <PermissionCard
            icon={<Mic className="w-5 h-5" />}
            title="Microphone Access"
            description="Required to record your voice for dictation"
            status={micStatus}
            onRequest={requestMicrophonePermission}
          />

          {/* Screen Recording Permission */}
          <PermissionCard
            icon={<Monitor className="w-5 h-5" />}
            title="Screen Recording"
            description="Enables Romo to see screen context"
            status={screenStatus}
            onRequest={requestScreenPermission}
            optional
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="px-6 py-2 bg-gray-700 text-white rounded-full font-medium hover:bg-gray-600 transition-colors cursor-pointer text-sm"
          >
            Back
          </button>
          <button
            onClick={onNext}
            disabled={!canContinue}
            className={`px-8 py-2 rounded-full font-medium transition-colors cursor-pointer text-sm ${
              canContinue ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            Continue
          </button>
        </div>

        {!canContinue && <p className="text-xs text-gray-500 mt-4">Microphone access is required to continue</p>}
      </div>
    </EmergeAnimation>
  )
}

const PermissionCard = ({ icon, title, description, status, onRequest, optional = false }) => {
  const getStatusColor = () => {
    switch (status) {
      case PermissionStatus.GRANTED:
        return 'border-green-500/50 bg-green-500/10'
      case PermissionStatus.DENIED:
        return 'border-red-500/50 bg-red-500/10'
      case PermissionStatus.CHECKING:
        return 'border-yellow-500/50 bg-yellow-500/10'
      default:
        return 'border-gray-700 bg-gray-800/50'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case PermissionStatus.GRANTED:
        return <Check className="w-4 h-4 text-green-400" />
      case PermissionStatus.DENIED:
        return <X className="w-4 h-4 text-red-400" />
      case PermissionStatus.CHECKING:
        return <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
      default:
        return <Circle className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case PermissionStatus.GRANTED:
        return 'Granted'
      case PermissionStatus.DENIED:
        return 'Check System Preferences'
      case PermissionStatus.CHECKING:
        return 'Checking...'
      default:
        return optional ? 'Optional' : 'Required'
    }
  }

  return (
    <div className={`border rounded-xl p-4 transition-all ${getStatusColor()}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">{icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="font-semibold text-white text-sm">{title}</div>
          </div>
          <p className="text-xs text-gray-400 mb-3">{description}</p>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1 text-xs">
              {getStatusIcon()}
              <div
                className={
                  status === PermissionStatus.GRANTED
                    ? 'text-green-400'
                    : status === PermissionStatus.DENIED
                      ? 'text-red-400'
                      : 'text-gray-400'
                }
              >
                {getStatusText()}
              </div>
            </div>
            {status !== PermissionStatus.GRANTED && (
              <button
                onClick={onRequest}
                disabled={status === PermissionStatus.CHECKING}
                className="px-4 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Grant Access
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PermissionsPage
