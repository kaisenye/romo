import React, { useEffect, useState } from 'react'

const RecordingWave = ({ audioLevel = 0, isAgentMode = false }) => {
  // Create random offsets for each bar that update frequently
  const [randomOffsets, setRandomOffsets] = useState([0, 0, 0, 0, 0])

  useEffect(() => {
    // Update random offsets every 100ms for lively movement
    const interval = setInterval(() => {
      setRandomOffsets([
        Math.random() * 0.5,
        Math.random() * 0.5,
        Math.random() * 0.5,
        Math.random() * 0.5,
        Math.random() * 0.5,
      ])
    }, 100)

    return () => clearInterval(interval)
  }, [])

  // Generate bar height with audio level and random variation
  const getBarHeight = (index) => {
    // Amplify audio level (make it more responsive)
    const amplifiedLevel = Math.min(1, audioLevel * 2)

    // Base height from audio level
    const baseHeight = Math.max(0.3, amplifiedLevel)

    // Add random variation per bar for lively effect
    const randomVariation = randomOffsets[index]
    const height = baseHeight + randomVariation

    return Math.max(0.3, Math.min(1.5, height))
  }

  const barColor = isAgentMode ? 'bg-lime-400' : 'bg-white'

  return (
    <div className="flex items-center space-x-0.5">
      {[0, 1, 2, 3, 4].map((index) => (
        <div
          key={index}
          className={`w-0.5 rounded-full ${barColor} transition-all duration-100 ease-out`}
          style={{
            height: `${getBarHeight(index) * 8}px`, // Max 15px height (1.5 * 10)
            opacity: Math.max(0.7, audioLevel * 1.5),
          }}
        />
      ))}
    </div>
  )
}

export default RecordingWave
