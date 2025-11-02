#!/bin/bash

# Setup script for sound feedback
# Converts and copies macOS system sounds for dictation feedback

SOUNDS_DIR="public/sounds"
SYSTEM_SOUNDS="/System/Library/Sounds"

echo "🔊 Setting up sound feedback for dictation..."

# Create sounds directory if it doesn't exist
mkdir -p "$SOUNDS_DIR"

# Check if afconvert is available
if ! command -v afconvert &> /dev/null; then
    echo "❌ afconvert not found. This should be available on macOS by default."
    exit 1
fi

# Convert Tink.aiff to start.wav (short, ascending sound)
echo "📥 Converting start sound (Tink)..."
afconvert -f WAVE -d LEI16 "$SYSTEM_SOUNDS/Tink.aiff" "$SOUNDS_DIR/start.wav"

# Convert Pop.aiff to stop.wav (short, pop sound)
echo "📥 Converting stop sound (Pop)..."
afconvert -f WAVE -d LEI16 "$SYSTEM_SOUNDS/Pop.aiff" "$SOUNDS_DIR/stop.wav"

# Verify files were created
if [ -f "$SOUNDS_DIR/start.wav" ] && [ -f "$SOUNDS_DIR/stop.wav" ]; then
    echo "✅ Sound files created successfully!"
    echo ""
    echo "Files created:"
    ls -lh "$SOUNDS_DIR/"*.wav
    echo ""
    echo "🎵 Sound feedback is now ready!"
    echo "   - Start: Tink sound (Alt+Space to start recording)"
    echo "   - Stop: Pop sound (Alt+Space to stop recording)"
else
    echo "❌ Failed to create sound files"
    exit 1
fi
