import React, { useState } from 'react'
import WelcomePage from './WelcomePage'
import PermissionsPage from './PermissionsPage'
import ShortcutsPage from './ShortcutsPage'

const STEPS = {
  WELCOME: 0,
  PERMISSIONS: 1,
  SHORTCUTS: 2,
}

const OnboardingFlow = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(STEPS.WELCOME)

  const handleNext = () => {
    if (currentStep === STEPS.SHORTCUTS) {
      handleComplete()
    } else {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > STEPS.WELCOME) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    // Mark onboarding as complete
    if (window.electronAPI?.completeOnboarding) {
      await window.electronAPI.completeOnboarding()
    }

    // Always call the onComplete callback (closes window and opens main app)
    if (onComplete) {
      onComplete()
    }
  }

  return (
    <div className="w-full h-screen bg-gray-900 to-black flex flex-col rounded-3xl overflow-hidden">
      {/* Progress indicator - draggable area for window movement */}
      <div className="flex items-center justify-center gap-2 pt-8 pb-4" style={{ WebkitAppRegion: 'drag' }}>
        {[STEPS.WELCOME, STEPS.PERMISSIONS, STEPS.SHORTCUTS].map((step) => (
          <div
            key={step}
            className={`h-1 w-16 rounded-full transition-all ${step <= currentStep ? 'bg-white' : 'bg-gray-700'}`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center" style={{ WebkitAppRegion: 'no-drag' }}>
        {currentStep === STEPS.WELCOME && <WelcomePage onNext={handleNext} />}
        {currentStep === STEPS.PERMISSIONS && <PermissionsPage onNext={handleNext} onBack={handleBack} />}
        {currentStep === STEPS.SHORTCUTS && <ShortcutsPage onNext={handleNext} onBack={handleBack} />}
      </div>

      {/* Skip button */}
      {currentStep !== STEPS.WELCOME && (
        <div className="pb-6 text-center">
          <button onClick={handleComplete} className="text-sm text-gray-500 hover:text-gray-400 transition-colors">
            Skip for now
          </button>
        </div>
      )}
    </div>
  )
}

export default OnboardingFlow
