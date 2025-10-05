// AI Service for OpenAI Responses API integration
// Replaces Electron-based llama.cpp service with direct API calls

import OpenAI from 'openai'
import screenCaptureService from './screenCaptureService'
import promptService from './promptService'

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1',
  API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  TIMEOUT: 30000, // 30 seconds
}

class AIService {
  constructor() {
    this.validateConfig()
    this.openai = new OpenAI({
      apiKey: API_CONFIG.API_KEY,
      baseURL: API_CONFIG.BASE_URL,
      dangerouslyAllowBrowser: true,
    })
  }

  validateConfig() {
    if (!API_CONFIG.API_KEY) {
      console.warn('⚠️ VITE_OPENAI_API_KEY not found in environment variables')
    }
  }

  /**
   * Call OpenAI Responses API with built prompt and optional image
   */
  async callResponsesWithPrompt(systemPrompt, imageUrl = null) {
    if (!API_CONFIG.API_KEY) {
      throw new Error('OpenAI API key not configured')
    }

    // Build input content with text and optional image
    const content = [{ type: 'input_text', text: systemPrompt }]

    if (imageUrl) {
      content.push({
        type: 'input_image',
        image_url: imageUrl,
      })
    }

    try {
      const response = await this.openai.responses.create({
        model: 'gpt-5-nano',
        reasoning: {
          effort: 'minimal',
        },
        text: {
          verbosity: 'low',
        },
        input: [
          {
            role: 'user',
            content,
          },
        ],
      })

      return this.extractContent(response)
    } catch (error) {
      console.error('OpenAI API failed:', error.message)

      // Fallback: retry without image if vision fails
      if (imageUrl && this._isVisionError(error)) {
        console.log('Vision processing failed, retrying without image context')
        return await this.callResponsesWithPrompt(systemPrompt, null)
      }

      throw error
    }
  }

  /**
   * Extract content from OpenAI Responses API response
   */
  extractContent(responseData) {
    const output = responseData.output
    if (!Array.isArray(output)) {
      throw new Error('Invalid response format: output is not an array')
    }

    const message = output.find((e) => e.type === 'message' && e.status === 'completed')
    if (!message) {
      throw new Error('No completed message found in response')
    }

    let text = message?.content?.[0]?.text || ''

    // Strip markdown code blocks if present
    if (text.includes('```json')) {
      text = text.replace(/^```json\s*\n/, '').replace(/\n\s*```$/, '')
    }

    return text.trim()
  }

  /**
   * Refine transcript text with optional screen context
   */
  async refineTranscript(transcript, enableScreenContext = false) {
    if (!transcript || transcript.trim().length === 0) {
      return 'No transcript provided for refinement.'
    }

    try {
      let screenshotBase64 = null
      let hasScreenContext = false

      // Capture screen if enabled
      if (enableScreenContext) {
        console.log('📸 Capturing screen for transcript refinement...')
        const screenshot = await this.captureScreen({
          maxHeight: 384,
          jpegQuality: 80,
          useCache: true,
        })

        if (screenshot.success) {
          screenshotBase64 = screenshot.base64
          hasScreenContext = true
          console.log('📸 Screen captured successfully for refinement')
        } else {
          console.warn('📸 Screen capture failed for refinement:', screenshot.error)
        }
      }

      const sanitizedTranscript = promptService.sanitizeTranscript(transcript)
      const prompt = promptService.buildTranscriptRefinementPrompt(sanitizedTranscript, hasScreenContext)
      const imageUrl = screenshotBase64 ? `data:image/jpeg;base64,${screenshotBase64}` : null
      const refinedText = await this.callResponsesWithPrompt(prompt, imageUrl)

      return {
        success: true,
        refinedTranscript: refinedText,
        originalTranscript: transcript,
        hasScreenContext,
      }
    } catch (error) {
      console.error('Transcript refinement failed:', error.message)
      return {
        success: false,
        error: error.message,
        refinedTranscript: transcript,
        originalTranscript: transcript,
      }
    }
  }

  /**
   * Process agent request with optional screen context
   */
  async processAgentRequest(transcript, enableScreenContext = false) {
    if (!transcript || transcript.trim().length === 0) {
      throw new Error('No transcript provided for agent processing')
    }

    try {
      let screenshotBase64 = null
      let hasScreenContext = false

      // Capture screen if enabled
      if (enableScreenContext) {
        console.log('📸 Capturing screen for agent processing...')
        const screenshot = await this.captureScreen({
          maxHeight: 384,
          jpegQuality: 80,
          useCache: true,
        })

        if (screenshot.success) {
          screenshotBase64 = screenshot.base64
          hasScreenContext = true
          console.log('📸 Screen captured successfully for agent mode')
        } else {
          console.warn('📸 Screen capture failed for agent mode:', screenshot.error)
        }
      }

      const sanitizedTranscript = promptService.sanitizeTranscript(transcript)
      const prompt = promptService.buildAgentModePrompt(sanitizedTranscript, hasScreenContext)
      const imageUrl = screenshotBase64 ? `data:image/jpeg;base64,${screenshotBase64}` : null
      const agentContent = await this.callResponsesWithPrompt(prompt, imageUrl)

      return {
        success: true,
        originalTranscript: transcript,
        generatedContent: agentContent,
        hasScreenContext,
      }
    } catch (error) {
      console.error('Agent processing failed:', error.message)
      return {
        success: false,
        error: error.message,
        fallbackContent: transcript,
      }
    }
  }

  /**
   * Capture screen for context (delegates to screenCaptureService)
   */
  async captureScreen(options = {}) {
    return await screenCaptureService.captureScreenshot(options)
  }

  /**
   * Check if AI service is available
   */
  isAvailable() {
    return Boolean(API_CONFIG.API_KEY)
  }

  /**
   * Check if error is vision-related
   * @private
   */
  _isVisionError(error) {
    const errorMessage = error.message?.toLowerCase() || ''
    return (
      errorMessage.includes('vision') ||
      errorMessage.includes('image') ||
      errorMessage.includes('multimodal') ||
      errorMessage.includes('unsupported') ||
      errorMessage.includes('image_url') ||
      errorMessage.includes('400') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('not supported')
    )
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      service: 'OpenAI Responses API',
      available: this.isAvailable(),
      apiKey: API_CONFIG.API_KEY ? '***configured***' : 'missing',
      baseUrl: API_CONFIG.BASE_URL,
      visionSupported: true,
    }
  }
}

// Export singleton instance
export const aiService = new AIService()
export default aiService
