// Prompt Service - Manages AI prompt templates and building
// Separated from aiService for better maintainability and reusability

class PromptService {
  /**
   * Build transcript refinement prompt with optional screen context
   */
  buildTranscriptRefinementPrompt(transcript, hasScreenContext = false) {
    const basePrompt = `
      YOUR ROLE:
      You are an intelligent dictation refinment machine that converts messy spoken dictation into well-formatted, professional content.
      Clean up and correct any transcription errors from speech-to-text.
      If user explicitly say certain emoji, output that emoji. 

      NOTE:
      - Do not overthink, keep it simple and just format user's transcript to make most sense.
      - Do not ask questions or provide explanations - simply return the refined, formatted content that fulfills the user's spoken request.

      ${
        hasScreenContext
          ? 'Context: Use the provided screenshot to better understand what the user was working on and refine the transcript accordingly.'
          : ''
      }

      Convert this spoken dictation into well-formatted content: ${transcript}
    `
    return basePrompt
  }

  /**
   * Build agent mode prompt with optional screen context
   */
  buildAgentModePrompt(transcript, hasScreenContext = false) {
    const basePrompt = `
      YOUR ROLE:
      You are an intelligent AI assistant that creates content based on spoken requests. You can generate emails, documents, code, research papers, creative writing, technical documentation, and any other content the user requests through voice dictation.

      GUIDLINES:
        1. Interpret the user's spoken request and create the requested content
        2. Use appropriate formatting and structure for the content type
        3. Be professional, accurate, and thorough

      OUTPUT:
      - Only output the text that user can directly use and paste in their input field, DO NOT include other text like greeting, confirmation, or options.
      - DO NOT show multiple options, just one.

      NOTE:
      - Keep it super concise and simple first, unless user explicitly ask for more complex output


      ${
        hasScreenContext
          ? 'Context: Use the provided screenshot to better understand what the user is currently working on and tailor your response accordingly.'
          : ''
      }

      Create the following based on user's request: 
      **${transcript}**
    `
    return basePrompt
  }

  /**
   * Build custom prompt with template variables
   */
  buildCustomPrompt(template, variables = {}) {
    let prompt = template

    // Replace template variables like {transcript}, {hasScreenContext}
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g')
      prompt = prompt.replace(regex, variables[key])
    })

    return prompt
  }

  /**
   * Get available prompt templates for configuration
   */
  getPromptTemplates() {
    return {
      transcriptRefinement: {
        name: 'Transcript Refinement',
        description: 'Refines speech-to-text transcripts with grammar and error corrections',
        variables: ['transcript', 'hasScreenContext'],
      },
      agentMode: {
        name: 'Agent Mode',
        description: 'Processes voice commands and provides helpful responses',
        variables: ['transcript', 'hasScreenContext'],
      },
    }
  }

  /**
   * Validate prompt template variables
   */
  validatePromptVariables(template, requiredVariables = []) {
    const missingVariables = []

    requiredVariables.forEach((variable) => {
      if (!template.includes(`{${variable}}`)) {
        missingVariables.push(variable)
      }
    })

    return {
      isValid: missingVariables.length === 0,
      missingVariables,
    }
  }

  /**
   * Build screen context instruction based on availability
   */
  buildScreenContextInstruction(hasScreenContext, customInstruction = null) {
    if (!hasScreenContext) return ''

    return (
      customInstruction ||
      'Context: Use the provided screenshot to better understand what the user is currently working on and tailor your response accordingly.'
    )
  }

  /**
   * Escape special characters in transcript for safe prompt injection
   */
  sanitizeTranscript(transcript) {
    return transcript
      .replace(/"/g, '\\"') // Escape double quotes
      .replace(/\n/g, '\\n') // Escape newlines
      .replace(/\r/g, '\\r') // Escape carriage returns
      .trim()
  }
}

// Export singleton instance
const promptService = new PromptService()
export default promptService
