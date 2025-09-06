import React, { useState } from 'react'
import useDictationStore from '../../stores/dictationStore'
import Button from '../ui/Button'
import Home from './Home'
import SettingsPage from './Settings'
import { LayoutDashboard, Settings } from 'lucide-react'

const Dashboard = ({ onClose }) => {
  const { userPlan } = useDictationStore()
  const [currentPage, setCurrentPage] = useState('home')

  console.log('Dashboard render - currentPage:', currentPage)

  return (
    <div
      className="w-full h-screen bg-neutral-900 flex overflow-hidden"
      style={{ borderRadius: '12px', overflow: 'hidden' }}
    >
      {/* Title Bar Area - Draggable region for traffic light integration */}
      <div
        className="absolute top-0 left-0 right-0 h-12 bg-neutral-800 border-b border-neutral-700 flex items-center px-6 z-50"
        style={{ WebkitAppRegion: 'drag' }}
      >
        <div className="flex items-center space-x-2 ml-16">
          {' '}
          {/* Left margin for traffic lights */}
          <div className="flex items-center space-x-4">
            <span className="font-semibold text-base text-neutral-100">romo</span>
            {/* TODO: Add back in when we have Pro Plan */}
            {/* <span className="flex items-center px-2 py-1 bg-neutral-700 text-neutral-50 text-[10px] rounded-lg">
              {userPlan}
            </span> */}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-48 bg-neutral-800 border-r border-neutral-700 px-4 py-6" style={{ paddingTop: '65px' }}>
        <nav className="space-y-2 text-xs">
          <div
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              console.log('Home navigation clicked')
              setCurrentPage('home')
            }}
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-neutral-600 cursor-pointer transition-colors ${
              currentPage === 'home' ? 'bg-neutral-700 text-neutral-200' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="font-medium flex items-center">Home</span>
          </div>
          <div
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              console.log('Settings navigation clicked')
              setCurrentPage('settings')
            }}
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-neutral-600 cursor-pointer transition-colors ${
              currentPage === 'settings' ? 'bg-neutral-700 text-neutral-200' : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="font-medium flex items-center">Settings</span>
          </div>
        </nav>

        {/* TODO: MVP: Pro upgrade prompt temporarily commented out - restore for full release
        <div className="mt-auto pt-8">
          <div className="bg-neutral-700 rounded-lg p-4 border border-neutral-600">
            <h3 className="font-semibold text-sm mb-2 text-neutral-100">Try Pro</h3>
            <p className="text-xs text-neutral-300 mb-3">Upgrade for agent features and unlimited dictation</p>
            <Button variant="secondary" size="sm" className="w-full">
              Learn more
            </Button>
          </div>
        </div>
        */}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col" style={{ paddingTop: '55px' }}>
        {currentPage === 'home' ? <Home /> : <SettingsPage />}
      </div>
    </div>
  )
}

export default Dashboard
