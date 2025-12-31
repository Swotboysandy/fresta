---
description: Complete end-to-end video story generation automation
---

# StoryForge AI - Complete Automation Workflow

This workflow automates the entire process from story generation to final video export.

## Prerequisites

1. **Google Account**: You must be logged into your Google account in Chrome
2. **FFmpeg**: Required for video merging (optional, but recommended)
   - Install: `winget install ffmpeg` OR download from https://www.gyan.dev/ffmpeg/builds/
3. **Node.js & npm**: Already installed with the project
4. **Puppeteer**: Already in package.json

## The 5-Step Pipeline

### STEP 1: Story Generation
- Uses Groq API with Llama 3.3 70B model
- Generates scenes based on genre and theme
- Each scene includes title, content, and duration

### STEP 2: Voice/Audio Generation
**Option A: Gemini API (Default)**
- Uses Gemini 2.5 Flash TTS API
- Voice: Kore (Female, Warm & Professional)
- Output: WAV format

**Option B: AI Studio Browser Automation**
- Opens https://aistudio.google.com/generate-speech
- Uses your logged-in Google account
- Enters script text and generates audio
- Downloads the audio file automatically

### STEP 3: Video Generation (Google Flow)
- Opens https://labs.google/fx/tools/flow
- Uses your logged-in Google account
- Enters scene-specific cinematic prompts
- Waits for video generation (2-10 minutes per scene)
- Downloads the generated video automatically

### STEP 4: Project Validation
Checks before merge:
- ✅ Script accuracy and quality
- ✅ Audio file integrity and duration
- ✅ Video file integrity and aspect ratio
- ✅ Scene consistency (all scenes have audio/video)
- ✅ File naming conventions
- ✅ Pipeline completeness

### STEP 5: Merge & Export
- Uses FFmpeg to merge all video clips
- Adds audio track if available
- Applies watermark (optional)
- Outputs in selected format (portrait/landscape)
- Saves to `/public/final-videos/`

## How to Run

// turbo-all

1. Start the development server:
```bash
cd f:\Sandy\S+Study\CODING\Fresta\storyforge-ai
npm run dev
```

2. Open browser and navigate to:
```
http://localhost:3000/automate
```

3. Select genre, enter your story theme, and click "Start Full Automation"

4. When Chrome opens for video generation:
   - Sign in to Google if prompted (first time only)
   - The automation will handle everything else

## File Locations

- Generated Videos: `/public/generated-videos/`
- Generated Audio: `/public/generated-audio/`
- Final Merged Videos: `/public/final-videos/`
- Chrome Profile: `/.chrome-automation-profile/`

## Troubleshooting

### "FFmpeg not installed"
Install FFmpeg:
```bash
winget install ffmpeg
```
Or download from https://www.gyan.dev/ffmpeg/builds/

### "Sign in required"
1. When Chrome opens, sign in to your Google account
2. The automation will resume after sign-in
3. Future runs will use saved session

### "Video generation timeout"
- Google Flow can take 2-10 minutes per video
- Ensure stable internet connection
- Try regenerating the scene

### "Audio generation failed"
- Check GEMINI_API_KEY in .env.local
- Enable AI Studio option for browser-based generation
- Fallback: videos will play without audio

## API Keys Required

Add to `.env.local`:
```
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
```

## Notes

- The browser opens in visible mode so you can monitor progress
- Each scene is processed sequentially to avoid rate limits
- Validation happens BEFORE merging to catch issues early
- Individual scene videos are saved even if merge fails
