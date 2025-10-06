import React from 'react'
import { Mic, Zap, Sparkles } from 'lucide-react'
import EmergeAnimation from './EmergeAnimation'

const WelcomePage = ({ onNext }) => {
  return (
    <EmergeAnimation duration={800}>
      <div className="flex flex-col items-center justify-center h-full px-8 text-center">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-4">Romo</h1>
          <p className="text-sm text-gray-300 max-w-md">Your personal AI voice companion</p>
        </div>

        <div className="space-y-4 text-left max-w-md mb-8">
          <div className="flex items-center gap-3">
            <Mic className="w-4 h-4 text-blue-400" />
            <h3 className="font-semibold text-white">Fast AI dictation</h3>
          </div>

          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-green-400" />
            <h3 className="font-semibold text-white">Smart Refinement</h3>
          </div>

          <div className="flex items-center gap-3">
            <Zap className="w-4 h-4 text-purple-400" />
            <h3 className="font-semibold text-white">Global Shortcuts</h3>
          </div>
        </div>

        <button
          onClick={onNext}
          className="px-6 py-2 bg-white text-sm text-black rounded-full font-medium hover:bg-gray-200 transition-colors cursor-pointer"
        >
          Get Started
        </button>
      </div>
    </EmergeAnimation>
  )
}

export default WelcomePage
