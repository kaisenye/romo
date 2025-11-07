import React, { useState, useEffect } from 'react'
import useDictationStore from '../../stores/dictationStore'
import { useAuth } from '../../providers/AuthProvider'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { Settings, User, Key, LogOut, LogIn, Crown, ExternalLink, Globe } from 'lucide-react'

// Supported languages (from Constants.js in electron)
const SUPPORTED_LANGUAGES = {
  auto: 'Auto Detect',
  en: 'English',
  zh: 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  ja: 'Japanese',
  ko: 'Korean',
  pt: 'Portuguese',
  ru: 'Russian',
  ar: 'Arabic',
  hi: 'Hindi',
  it: 'Italian',
  nl: 'Dutch',
  pl: 'Polish',
  tr: 'Turkish',
  vi: 'Vietnamese',
  th: 'Thai',
}

const SettingsPage = () => {
  const { customInstructions, apiKeys, selectedLanguage, updateCustomInstructions, updateApiKey, updateLanguage } =
    useDictationStore()
  const { user, isAuthenticated, subscription, isSubscribed, subscriptionTier, signOut, openLogin } = useAuth()
  const [localInstructions, setLocalInstructions] = useState(customInstructions)
  const [localApiKeys, setLocalApiKeys] = useState(apiKeys)
  const [localLanguage, setLocalLanguage] = useState(selectedLanguage)

  // Helper function to get display plan name
  const getDisplayPlanName = () => {
    if (!subscriptionTier) return 'Basic'
    if (subscriptionTier.includes('pro')) return 'Pro'
    if (subscriptionTier === 'agent') return 'Agent'
    return subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1)
  }

  // Helper function to check if user is on basic/free plan
  const isBasicPlan = !subscriptionTier || subscriptionTier === 'basic'

  const handleSaveInstructions = () => {
    updateCustomInstructions(localInstructions)
  }

  const handleSaveApiKey = (provider) => {
    updateApiKey(provider, localApiKeys[provider])
  }

  const handleApiKeyChange = (provider, value) => {
    setLocalApiKeys((prev) => ({
      ...prev,
      [provider]: value,
    }))
  }

  const handleLanguageChange = async (language) => {
    setLocalLanguage(language)
    await updateLanguage(language)
  }

  // Sync local language with store when it changes
  useEffect(() => {
    setLocalLanguage(selectedLanguage)
  }, [selectedLanguage])

  return (
    <div className="flex-1 px-6 pt-6 pb-16 overflow-y-auto">
      <div className="max-w-4xl space-y-8">
        {/* Account Information */}
        <section>
          <div className="flex items-center space-x-2 mb-4">
            <User className="w-5 h-5 text-neutral-400" />
            <h2 className="text-base font-semibold text-neutral-100">Account</h2>
          </div>
          <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
            {isAuthenticated ? (
              <div className="space-y-4">
                {/* User Info */}
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Email</label>
                  <p className="text-sm text-neutral-100">{user?.email || 'Unknown'}</p>
                </div>

                {/* Auth Status */}
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Status</label>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-neutral-100">Signed In</span>
                  </div>
                </div>

                {/* Subscription Status */}
                {isSubscribed && subscription && (
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1">Subscription</label>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-neutral-100 capitalize">{subscriptionTier || 'Unknown'} Plan</span>
                      <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                        {subscription.status}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => window.electronAPI.openWebDashboard()}
                    className="flex items-center space-x-2"
                  >
                    <User className="w-4 h-4" />
                    <span>User Profile</span>
                  </Button>
                  <Button variant="danger" size="sm" onClick={signOut} className="flex items-center space-x-2">
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-neutral-400 mb-4">
                  You are not signed in. Sign in to access your account and subscription.
                </p>
                <Button variant="primary" size="sm" onClick={openLogin} className="flex items-center space-x-2 mx-auto">
                  <LogIn className="w-4 h-4" />
                  <span>Sign In with Browser</span>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Plan Information */}
        <section>
          <div className="flex items-center space-x-2 mb-4">
            <Settings className="w-5 h-5 text-neutral-400" />
            <h2 className="text-base font-semibold text-neutral-100">Current Plan</h2>
          </div>
          <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
            {isAuthenticated ? (
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-base text-neutral-100 mb-2">{getDisplayPlanName()} Plan</h3>
                  <p className="text-neutral-400 text-xs">
                    {isBasicPlan
                      ? 'Limited dictation features with local processing'
                      : subscriptionTier?.includes('pro')
                        ? 'Unlimited dictation with advanced AI features'
                        : 'Full access with agent mode and premium features'}
                  </p>
                </div>
                {isBasicPlan ? (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => window.electronAPI.openWebDashboard()}
                    className="flex items-center space-x-2"
                  >
                    <Crown className="w-4 h-4" />
                    <span>Upgrade Plan</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => window.electronAPI.openWebDashboard()}
                    className="flex items-center space-x-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Manage Plan</span>
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-base text-neutral-100 mb-2">Basic Plan</h3>
                  <p className="text-neutral-400 text-xs">Sign in to unlock premium features</p>
                </div>
                <Button size="sm" variant="primary" onClick={openLogin} className="flex items-center space-x-2">
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Language Selection */}
        <section>
          <div className="flex items-center space-x-2 mb-4">
            <Globe className="w-5 h-5 text-neutral-400" />
            <h2 className="text-base font-semibold text-neutral-100">Dictation Language</h2>
          </div>
          <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
            <p className="text-xs text-neutral-400 mb-4">
              Select the language for speech transcription. Auto-detect will automatically identify the spoken language.
            </p>
            <select
              value={localLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-sm text-neutral-100 focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500"
            >
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-neutral-500 mt-2">
              Currently selected: <span className="text-neutral-300">{SUPPORTED_LANGUAGES[localLanguage]}</span>
            </p>
          </div>
        </section>

        {/* TODO: Add back in when we have a way to handle the keys */}
        {/* MVP: Agent mode instructions temporarily commented out */}
        <section className="hidden">
          <div className="flex items-center space-x-2 mb-4">
            <Settings className="w-5 h-5 text-neutral-400" />
            <h2 className="text-base font-semibold text-neutral-100">Agent Mode Instructions</h2>
          </div>
          <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
            <div className="space-y-3">
              <textarea
                value={localInstructions}
                onChange={(e) => setLocalInstructions(e.target.value)}
                placeholder="Enter custom instructions for agent mode (e.g., 'Always format as bullet points', 'Use professional tone', etc.)"
                className="w-full h-32 px-3 py-2 bg-neutral-700 border-none rounded-lg resize-none focus:ring-1 focus:ring-neutral-900 focus:border-transparent text-sm text-neutral-100 placeholder-neutral-500"
              />
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-neutral-500">{localInstructions.length}/500 characters</span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveInstructions}
                  disabled={localInstructions === customInstructions}
                >
                  Save Instructions
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* API Keys */}
        {/* TODO: Add back in when we have a way to handle the keys */}
        <section className="hidden">
          <div className="flex items-center space-x-2 mb-4">
            <Key className="w-5 h-5 text-neutral-400" />
            <h2 className="text-base font-semibold text-neutral-100">Remote LLM Services</h2>
          </div>
          <div className="space-y-4">
            <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
              <p className="text-xs text-neutral-400 mb-4">
                Connect external AI services for enhanced processing capabilities. Your keys are stored locally and
                encrypted.
              </p>

              {/* OpenAI */}
              <div className="space-y-3 mb-6">
                <h3 className="font-medium text-sm text-neutral-200">OpenAI API</h3>
                <div className="flex space-x-2">
                  <Input
                    type="password"
                    placeholder="sk-..."
                    value={localApiKeys.openai}
                    onChange={(e) => handleApiKeyChange('openai', e.target.value)}
                    className="flex-1 bg-neutral-700 border-neutral-600 text-neutral-100 placeholder-neutral-500"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleSaveApiKey('openai')}
                    disabled={localApiKeys.openai === apiKeys.openai}
                  >
                    Save
                  </Button>
                </div>
              </div>

              {/* Claude */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm text-neutral-200">Anthropic Claude API</h3>
                <div className="flex space-x-2">
                  <Input
                    type="password"
                    placeholder="sk-ant-..."
                    value={localApiKeys.claude}
                    onChange={(e) => handleApiKeyChange('claude', e.target.value)}
                    className="flex-1 bg-neutral-700 border-neutral-600 text-neutral-100 placeholder-neutral-500"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleSaveApiKey('claude')}
                    disabled={localApiKeys.claude === apiKeys.claude}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default SettingsPage
