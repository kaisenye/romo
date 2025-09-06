import React, { useState } from 'react'
import useDictationStore from '../../stores/dictationStore'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { Settings, User, Key } from 'lucide-react'

const SettingsPage = () => {
  const { userPlan, customInstructions, apiKeys, updateCustomInstructions, updateApiKey } = useDictationStore()
  const [localInstructions, setLocalInstructions] = useState(customInstructions)
  const [localApiKeys, setLocalApiKeys] = useState(apiKeys)

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

  return (
    <div className="flex-1 px-6 pt-6 pb-16 overflow-y-auto">
      <div className="max-w-4xl space-y-8">
        {/* Plan Information */}
        <section>
          <div className="flex items-center space-x-2 mb-4">
            <User className="w-5 h-5 text-neutral-400" />
            <h2 className="text-base font-semibold text-neutral-100">Current Plan</h2>
          </div>
          <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-base text-neutral-100 mb-2">{userPlan} Plan</h3>
                <p className="text-neutral-400 text-xs">
                  {userPlan === 'Basic'
                    ? 'Limited dictation features with local processing'
                    : 'Unlimited dictation with advanced AI features'}
                </p>
              </div>
              {userPlan === 'Basic' && (
                <Button size="sm" variant="primary">
                  Agent Mode Coming Soon!
                </Button>
              )}
            </div>
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
