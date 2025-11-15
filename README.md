# Romo

AI-powered dictation app for macOS. Records audio via global shortcuts, transcribes with Whisper.cpp, refines text with LLaMA.cpp, and auto-pastes results to any input field.

## Features

- **Global Shortcuts** - `Cmd+Shift+D` to start/stop recording
- **Minimal UI** - Tiny pill window that stays bottom-center
- **Auto-paste** - Refined text automatically pastes to focused app
- **Local AI** - Whisper.cpp + LLaMA.cpp run entirely on device
- **Text Refinement** - LLaMA.cpp improves grammar and formatting
- **Tray Icon** - Menu bar access and controls
- **Privacy-First** - No cloud dependencies or data collection

## Prerequisites

- **Node.js** 16+ and npm
- **macOS** (required for accessibility permissions)
- **Xcode Command Line Tools**: `xcode-select --install`

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Setup AI services**

   ```bash
   npm run setup:whisper
   npm run setup:llama
   ```

3. **Setup Sounds**

   ```bash
   npm run setup:sounds
   ```

4. **Run the app**
   ```bash
   npm run electron:dev
   ```

## Usage

### First Launch

On first launch, Romo will guide you through a quick onboarding process:

1. **Welcome** - Introduction to Romo's features
2. **Permissions** - Grant microphone and screen recording access
3. **Shortcuts** - Learn keyboard shortcuts

### Daily Use

1. **Launch**: App shows as tiny pill at bottom center of screen
2. **Record**: Press `Option + Space` to start recording (pill expands)
3. **Stop**: Press `Option + Space` again to stop, transcribe, and refine
4. **Auto-paste**: Refined text automatically pastes to focused app
5. **Tray**: Access settings and controls from menu bar icon

### Development Mode

- **Normal dev mode**: `npm run electron:dev` (shows onboarding for first-time users)
- **Onboarding dev mode**: `npm run electron:dev:onboarding` (persistent onboarding for UI work)
- **Skip onboarding**: `npm run electron:dev:skip-onboarding` (bypasses onboarding check)
- **Reset onboarding**: From DevTools console: `await window.electronAPI.resetOnboarding()`

**Tip**: Use `npm run electron:dev:onboarding` when working on the onboarding UI - it keeps the window open and loops on completion.

See [docs/ONBOARDING.md](docs/ONBOARDING.md) for detailed onboarding documentation.

## Build & Distribution

### Building for Distribution

```bash
npm run build
```

Creates DMG installer in `release/` directory with all dependencies included.

### Code Signing (macOS)

To avoid "unverified developer" warnings, you need to code sign your app:

#### Option 1: Apple Developer Certificate (Recommended)

1. **Get Apple Developer Account** ($99/year)
2. **Create certificates** in Keychain Access:
   - Developer ID Application
   - Developer ID Installer
3. **Set environment variables**:
   ```bash
   export CSC_NAME="Developer ID Application: Your Name"
   ```
4. **Build signed app**:
   ```bash
   npm run build
   ```

#### Option 2: Self-Signed Certificate (Testing)

1. **Create certificate in Keychain Access**:
   - Keychain Access → Certificate Assistant → Create Certificate
   - Name: "Romo Developer"
   - Type: "Code Signing"
2. **Build with self-signed cert**:
   ```bash
   export CSC_NAME="Romo Developer"
   npm run build
   ```

#### Option 3: No Code Signing (Users must bypass warning)

Users can install by:

- Right-click app → "Open" → "Open"
- Or run: `xattr -d com.apple.quarantine /Applications/Romo.app`

### Release & Auto-Updates

```bash
# 1. Update version
npm version patch

# 2. Build signed app
npm run build

# 3. Create GitHub release
gh release create v1.0.1 release/1.0.1/* \
  --title "Release 1.0.1" \
  --notes "New features and bug fixes"
```

Users with existing installations will auto-update automatically!

## Shortcuts

- `Option + Space` - Start/stop recording
- `Cmd+Shift+C` - Copy last transcription
- `Cmd+Shift+H` - Show/hide app

## Permissions

First launch will request:

- **Microphone** - For audio recording
- **Accessibility** - For auto-pasting to other apps

## Technical Details

- **Tech Stack**: Electron, React, Vite, Tailwind CSS
- **AI**: Whisper.cpp for speech-to-text, LLaMA.cpp for text refinement
- **Platform**: macOS only (uses Apple Events for pasting)

## License

MIT License - see [LICENSE](LICENSE) file for details.
