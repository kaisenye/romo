import React, { useState } from 'react'
import Home from './Home'
import SettingsPage from './Settings'
import { LayoutDashboard, Settings } from 'lucide-react'

const Dashboard = () => {
  const [currentPage, setCurrentPage] = useState('home')

  console.log('Dashboard render - currentPage:', currentPage)

  return (
    <div
      className="w-full h-screen bg-gray-50 flex overflow-hidden"
      style={{ borderRadius: '12px', overflow: 'hidden' }}
    >
      {/* Title Bar Area - Draggable region for traffic light integration */}
      <div
        className="absolute top-0 left-0 right-0 h-12 bg-white border-b border-gray-200 flex items-center px-6 z-50"
        style={{ WebkitAppRegion: 'drag' }}
      >
        <div className="flex items-center space-x-2 ml-16">
          {' '}
          {/* Left margin for traffic lights */}
          <div className="flex items-center space-x-4">
            <span className="font-semibold text-base text-gray-900">romo</span>
            {/* TODO: Add back in when we have Pro Plan */}
            {/* <span className="flex items-center px-2 py-1 bg-neutral-700 text-neutral-50 text-[10px] rounded-lg">
              {userPlan}
            </span> */}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-48 bg-white border-r border-gray-200 px-4 py-6" style={{ paddingTop: '65px' }}>
        <nav className="space-y-2 text-xs">
          <div
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              console.log('Home navigation clicked')
              setCurrentPage('home')
            }}
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors ${
              currentPage === 'home' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900'
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
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors ${
              currentPage === 'settings' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="font-medium flex items-center">Settings</span>
          </div>
        </nav>

        {/* TODO: MVP: Pro upgrade prompt temporarily commented out - restore for full release
        <div className="mt-auto pt-8">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-semibold text-sm mb-2 text-gray-900">Try Pro</h3>
            <p className="text-xs text-gray-600 mb-3">Upgrade for agent features and unlimited dictation</p>
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
