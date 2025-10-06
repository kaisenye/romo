import React from 'react'

const ProcessingWave = ({ isAgentMode = false }) => {
  const barColor = isAgentMode ? 'bg-lime-400' : 'bg-white'

  return (
    <div className="flex items-center space-x-0.5">
      <div className={`w-0.5 h-1.5 rounded-full wave-bar ${barColor}`} style={{ animationDelay: '0ms' }} />
      <div className={`w-0.5 h-1.5 rounded-full wave-bar ${barColor}`} style={{ animationDelay: '100ms' }} />
      <div className={`w-0.5 h-1.5 rounded-full wave-bar ${barColor}`} style={{ animationDelay: '200ms' }} />
      <div className={`w-0.5 h-1.5 rounded-full wave-bar ${barColor}`} style={{ animationDelay: '300ms' }} />
      <div className={`w-0.5 h-1.5 rounded-full wave-bar ${barColor}`} style={{ animationDelay: '400ms' }} />
    </div>
  )
}

export default ProcessingWave
