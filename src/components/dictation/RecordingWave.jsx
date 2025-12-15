import React, { useEffect, useState } from 'react'

const RecordingWave = ({ audioLevel = 0, isAgentMode = false }) => {
  // Create random offsets for each bar that update frequently
  const [randomOffsets, setRandomOffsets] = useState([0, 0, 0, 0, 0])

  useEffect(() => {
    // Update random offsets every 100ms for lively movement
    // Increased range for bigger fluctuations (was 0.5, now 0.8)
    const interval = setInterval(() => {
      setRandomOffsets([
        Math.random() * 0.8,
        Math.random() * 0.8,
        Math.random() * 0.8,
        Math.random() * 0.8,
        Math.random() * 0.8,
      ])
    }, 100)

    return () => clearInterval(interval)
  }, [])

  // Generate bar height with audio level and random variation
  const getBarHeight = (index) => {
    // Amplify audio level more aggressively for bigger fluctuations
    const amplifiedLevel = Math.min(1, audioLevel * 3)

    // Base height from audio level (lower minimum for more dynamic range)
    const baseHeight = Math.max(0.2, amplifiedLevel)

    // Add random variation per bar for lively effect (full range for bigger fluctuations)
    const randomVariation = randomOffsets[index]
    const height = baseHeight + randomVariation

    // Increased max height for bigger fluctuations (was 1.5, now 2.5)
    return Math.max(0.2, Math.min(2.5, height))
  }

  const barColor = isAgentMode ? 'bg-lime-400' : 'bg-white'

  return (
    <div className="flex items-center space-x-0.5">
      {[0, 1, 2, 3, 4].map((index) => (
        <div
          key={index}
          className={`w-0.5 rounded-full ${barColor} transition-all duration-100 ease-out`}
          style={{
            height: `${getBarHeight(index) * 10}px`, // Max 25px height (2.5 * 10) for bigger fluctuations
            opacity: 1, // Always full opacity - color is white/lime, height shows audio level
          }}
        />
      ))}
    </div>
  )
}

export default RecordingWave
