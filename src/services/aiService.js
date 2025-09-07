// AI Service for OpenAI Responses API integration
// Replaces Electron-based llama.cpp service with direct API calls

const PROMPT_IDS = {
  TRANSCRIPT_REFINEMENT: 'pmpt_68bc6fd28a588190b817d237a6bbb35f099666c01bed2c75',
  AGENT_MODE: 'pmpt_68bca56aa8d08195b15609eb8b2d5a430ec28f3fe2133b33',
}

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1',
  API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  TIMEOUT: 30000, // 30 seconds
}

class AIService {
  constructor() {
    this.validateConfig()
  }

  validateConfig() {
    if (!API_CONFIG.API_KEY) {
      console.warn('⚠️ VITE_OPENAI_API_KEY not found in environment variables')
    }
  }

  /**
   * Call OpenAI Responses API with prompt ID and transcript variable
   */
  async callResponses(promptId, transcript) {
    if (!API_CONFIG.API_KEY) {
      throw new Error('OpenAI API key not configured')
    }

    const requestBody = {
      prompt: {
        id: promptId,
        variables: {
          transcript: transcript,
        },
      },
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_CONFIG.API_KEY}`,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`
        )
      }

      const data = await response.json()
      return this.extractContent(data)
    } catch (error) {
      console.error('OpenAI API failed:', error.message)
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
   * Refine transcript text (replaces llamaRefineTranscript)
   */
  async refineTranscript(transcript) {
    if (!transcript || transcript.trim().length === 0) {
      return 'No transcript provided for refinement.'
    }

    try {
      const refinedText = await this.callResponses(PROMPT_IDS.TRANSCRIPT_REFINEMENT, transcript)
      return {
        success: true,
        refinedTranscript: refinedText,
        originalTranscript: transcript,
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
   * Process agent request (for agent mode)
   */
  async processAgentRequest(transcript) {
    if (!transcript || transcript.trim().length === 0) {
      throw new Error('No transcript provided for agent processing')
    }

    try {
      const agentContent = await this.callResponses(PROMPT_IDS.AGENT_MODE, transcript)
      return {
        success: true,
        originalTranscript: transcript,
        generatedContent: agentContent,
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
   * Check if AI service is available
   */
  isAvailable() {
    return Boolean(API_CONFIG.API_KEY)
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
    }
  }
}

// Export singleton instance
export const aiService = new AIService()
export default aiService
