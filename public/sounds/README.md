# Sound Effects

This folder contains audio feedback sounds for recording start/stop events.

## Required Files

- `start.wav` - Played when recording starts
- `stop.wav` - Played when recording stops

## Quick Setup Options

### Option 1: Use macOS System Sounds (Easiest)

You can copy system sounds from macOS:

```bash
# Example: Copy system sounds
cp /System/Library/Sounds/Tink.aiff public/sounds/start.wav
cp /System/Library/Sounds/Pop.aiff public/sounds/stop.wav
```

Note: Convert `.aiff` to `.wav` using:
```bash
afconvert -f WAVE -d LEI16 input.aiff output.wav
```

### Option 2: Download Free Sounds

1. Visit [Freesound.org](https://freesound.org) or [Zapsplat](https://www.zapsplat.com)
2. Search for:
   - "short beep ascending" for start.wav
   - "short click" or "beep descending" for stop.wav
3. Download as WAV format
4. Place in this folder

### Option 3: Generate Simple Beeps

Use online generators:
- [SFXR](https://sfxr.me/) - Simple sound effect generator
- [Bfxr](https://www.bfxr.net/) - Web-based sound generator

**Recommended Settings:**
- **Duration**: 100-200ms
- **Format**: WAV
- **Sample Rate**: 44.1kHz or 48kHz
- **Bit Depth**: 16-bit

## Specifications

- Format: WAV (preferred) or MP3
- Duration: 100-300ms (keep it short!)
- Volume: Mix at -6dB to -12dB
- File size: < 50KB each

## Example Commands

### Convert from MP3 to WAV (if needed)
```bash
# Using ffmpeg
ffmpeg -i start.mp3 -acodec pcm_s16le -ar 44100 start.wav
```

### Adjust volume (if too loud)
```bash
# Using ffmpeg (reduce volume by 50%)
ffmpeg -i start.wav -filter:a "volume=0.5" start-quiet.wav
```

## Testing

Once you add the files, restart the app and:
1. Press Alt+Space to start recording - you should hear `start.wav`
2. Press Alt+Space again to stop - you should hear `stop.wav`

## Disable Sound Feedback

Sound feedback can be disabled in the app settings (coming soon) or by calling:
```javascript
soundFeedback.disable()
```
