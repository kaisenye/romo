import { LogIn } from 'lucide-react'

/**
 * SignInPrompt
 * Displays when user is not authenticated
 * Prompts user to sign in via web browser
 *
 * @param {Object} props
 * @param {Function} props.onSignIn - Callback when user clicks sign in
 */
export function SignInPrompt({ onSignIn }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 p-8 shadow-2xl">
          {/* App Logo/Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Romo</h1>
            <p className="text-gray-400 text-sm">AI-powered dictation assistant</p>
          </div>

          {/* Sign In Prompt */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/20 mb-4">
              <LogIn className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">Sign In Required</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              Sign in to your account to start using Romo&apos;s powerful dictation and transcription features.
            </p>
          </div>

          {/* Sign In Button */}
          <button
            onClick={onSignIn}
            className="w-full py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            Sign In with Browser
          </button>

          <p className="text-center text-gray-400 text-xs mt-4">Opens in your default web browser</p>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-gray-500 text-xs">
          <p>Sign in to sync your account and subscriptions</p>
        </div>
      </div>
    </div>
  )
}
