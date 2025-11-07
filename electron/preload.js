const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: process.versions,

  // AI Service operations
  aiInitialize: () => ipcRenderer.invoke('ai-initialize'),
  aiProcessChunk: (audioBuffer, sampleRate, options) =>
    ipcRenderer.invoke('ai-process-chunk', audioBuffer, sampleRate, options),
  aiProcessFile: (audioFilePath, options) => ipcRenderer.invoke('ai-process-file', audioFilePath, options),
  aiProcessFullRecording: (audioBuffer, sampleRate, meetingId, options) =>
    ipcRenderer.invoke('ai-process-full-recording', audioBuffer, sampleRate, meetingId, options),
  saveLiveTranscriptionSegments: (segments, meetingId) =>
    ipcRenderer.invoke('save-live-transcription-segments', segments, meetingId),
  aiGetStatus: () => ipcRenderer.invoke('ai-get-status'),
  aiShutdown: () => ipcRenderer.invoke('ai-shutdown'),

  // LLM Service operations (disabled - now using direct OpenAI API calls from React)
  // llamaRefineTranscript: (transcript) => ipcRenderer.invoke('llama-refine-transcript', transcript),

  // Agent Mode operations (disabled - now using direct OpenAI API calls from React)
  // agentProcessRequest: (transcript) => ipcRenderer.invoke('agent-process-request', transcript),

  // Audio processing methods for React components (aliases for convenience)
  processAudioChunk: (audioBuffer, sampleRate = 16000, options = {}) =>
    ipcRenderer.invoke('ai-process-chunk', audioBuffer, sampleRate, options),

  // Window operations
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  saveWindowPosition: (position) => ipcRenderer.invoke('save-window-position', position),
  loadWindowPosition: () => ipcRenderer.invoke('load-window-position'),

  // Window expansion operations
  expandWindowForRecording: () => ipcRenderer.invoke('expand-window-for-recording'),
  shrinkWindowToPill: () => ipcRenderer.invoke('shrink-window-to-pill'),
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  showModeIndicator: () => ipcRenderer.invoke('show-mode-indicator'),
  onShowModeIndicator: (callback) => ipcRenderer.on('show-mode-indicator', callback),

  // Global shortcut events
  onGlobalShortcutStartRecording: (callback) => ipcRenderer.on('global-shortcut-start-recording', callback),
  onGlobalShortcutStopRecording: (callback) => ipcRenderer.on('global-shortcut-stop-recording', callback),
  onGlobalShortcutToggleDictation: (callback) => ipcRenderer.on('global-shortcut-toggle-dictation', callback),
  onGlobalShortcutToggleAgentMode: (callback) => ipcRenderer.on('global-shortcut-toggle-agent-mode', callback),
  onGlobalShortcutCopyTranscription: (callback) => ipcRenderer.on('global-shortcut-copy-transcription', callback),
  onTrayOpenSettings: (callback) => ipcRenderer.on('tray-open-settings', callback),
  onWindowPositionChanged: (callback) => ipcRenderer.on('window-position-changed', callback),

  // Notifications
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body),

  // Clipboard and paste operations
  pasteToFocusedApp: (text) => ipcRenderer.invoke('paste-to-focused-app', text),

  // Dictation History operations
  getDictationHistory: () => ipcRenderer.invoke('get-dictation-history'),
  getDictationStats: () => ipcRenderer.invoke('get-dictation-stats'),
  addDictationEntry: (entry) => ipcRenderer.invoke('add-dictation-entry', entry),
  deleteDictationEntry: (id) => ipcRenderer.invoke('delete-dictation-entry', id),
  clearDictationHistory: () => ipcRenderer.invoke('clear-dictation-history'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),

  // Screen capture operations
  captureScreen: (options) => ipcRenderer.invoke('capture-screen', options),

  // Settings operations
  getSetting: (key, defaultValue) => ipcRenderer.invoke('get-setting', key, defaultValue),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
  onSettingChanged: (callback) => ipcRenderer.on('setting-changed', (event, key, value) => callback(key, value)),

  // Onboarding operations
  checkOnboardingStatus: () => ipcRenderer.invoke('check-onboarding-status'),
  completeOnboarding: () => ipcRenderer.invoke('complete-onboarding'),
  resetOnboarding: () => ipcRenderer.invoke('reset-onboarding'),

  // Permission operations
  getPermissionStatus: () => ipcRenderer.invoke('get-permission-status'),
  requestMicrophonePermission: () => ipcRenderer.invoke('request-microphone-permission'),
  requestScreenPermission: () => ipcRenderer.invoke('request-screen-permission'),

  // Auth operations
  getAuthSession: () => ipcRenderer.invoke('auth-get-session'),
  getAuthUser: () => ipcRenderer.invoke('auth-get-user'),
  getSubscription: () => ipcRenderer.invoke('auth-get-subscription'),
  signOut: () => ipcRenderer.invoke('auth-sign-out'),
  openWebLogin: () => ipcRenderer.invoke('auth-open-web-login'),
  openWebDashboard: () => ipcRenderer.invoke('auth-open-web-dashboard'),
  refreshSubscription: () => ipcRenderer.invoke('auth-refresh-subscription'),
  onAuthStateChange: (callback) => ipcRenderer.on('auth-state-changed', callback),
})
