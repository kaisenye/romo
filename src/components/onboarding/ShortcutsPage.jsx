import React from 'react'
import { Mic, Sparkles, Copy } from 'lucide-react'
import EmergeAnimation from './EmergeAnimation'

const ShortcutsPage = ({ onNext, onBack }) => {
  const shortcuts = [
    {
      keys: ['⌘', 'Shift', 'D'],
      title: 'Start/Stop',
      icon: <Mic className="w-4 h-4" />,
      primary: true,
    },
    {
      keys: ['⌘', 'Shift', 'S'],
      title: 'Toggle Mode',
      icon: <Sparkles className="w-4 h-4" />,
    },
    {
      keys: ['⌘', 'Shift', 'C'],
      title: 'Copy Output',
      icon: <Copy className="w-4 h-4" />,
    },
  ]

  return (
    <EmergeAnimation duration={800}>
      <div className="flex flex-col items-center justify-center h-full px-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Keyboard Shortcuts</h2>
          <p className="text-gray-400 text-sm">Control Romo from anywhere on your Mac</p>
        </div>

        <div className="space-y-3 w-full max-w-lg mb-8">
          {shortcuts.map((shortcut, index) => (
            <ShortcutCard key={index} {...shortcut} />
          ))}
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
            className="px-8 py-2 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition-colors cursor-pointer text-sm"
          >
            Finish
          </button>
        </div>
      </div>
    </EmergeAnimation>
  )
}

const ShortcutCard = ({ keys, title, icon, primary = false }) => {
  return (
    <div
      className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
        primary ? 'border-blue-500/50 bg-blue-500/10' : 'border-gray-700 bg-gray-800/50'
      }`}
    >
      <div className="flex gap-1">
        {keys.map((key, index) => (
          <React.Fragment key={index}>
            <kbd className="min-w-[32px] h-8 px-2 flex items-center justify-center bg-gray-700 text-white text-sm font-medium rounded border border-gray-600 shadow-sm">
              {key}
            </kbd>
            {index < keys.length - 1 && <span className="text-gray-600 mx-1">+</span>}
          </React.Fragment>
        ))}
      </div>
      <div className="flex-1 flex items-center gap-2">
        {icon && <div className="text-gray-400">{icon}</div>}
        <h3 className="font-semibold text-white text-sm">{title}</h3>
      </div>
    </div>
  )
}

export default ShortcutsPage
