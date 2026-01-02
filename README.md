# 🎬 Fresta - AI-Powered Faceless Video Generator

> Transform YouTube videos into viral Shorts with AI narration, automatic subtitles, and background music - **No coding required!**

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-blue)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Stars](https://img.shields.io/github/stars/Swotboysandy/fresta)](https://github.com/Swotboysandy/fresta/stargazers)

## ✨ Features

### 🤖 AI-Powered Video Generation
- **One-Click Transformation**: Convert any YouTube video into engaging Shorts
- **Smart AI Narration**: Multiple styles (Documentary, Storytelling, Educational, Dramatic)
- **Multi-Language Support**: English & Hindi/Hinglish narration
- **Accurate Duration Control**: Generate 15s, 30s, or 45s videos with precise timing

### 🎙️ Professional Voice Options
- **Google Cloud TTS**: Premium voice quality with multiple accents
- **Edge TTS**: Fast, free alternative voices
- **Gender Selection**: Male and female voice options
- **Natural Speech**: Realistic intonation and pacing

### 🎵 Automatic Enhancements
- **Dynamic Subtitles**: Word-by-word animated captions (Shorts-style)
- **Background Music**: 6 mood options (Dramatic, Cinematic, Upbeat, Chill, Epic, None)
- **Moving Watermark**: Customizable branding overlay
- **1080x1920 Export**: Perfect vertical format for Shorts, Reels, TikTok

### 📊 Modern Dashboard UI
- **Symmetrical Layout**: Clean, intuitive interface
- **Live Processing Logs**: Real-time feedback during generation
- **Step-by-Step Flow**: Config → Processing → Result
- **Download Ready**: One-click MP4 download

## 🚀 Quick Start

### Prerequisites
```bash
# Node.js 18+ and Python 3.10+ required
node --version
python --version
```

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/Swotboysandy/fresta.git
cd fresta
```

2. **Install dependencies**
```bash
# Frontend
npm install

# Backend (Python)
pip install -r scripts/faceless-generator/requirements.txt
```

3. **Set up environment variables**
```bash
# Create .env file
cp .env.example .env

# Add your API keys
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_google_api_key_here  # Optional for Google TTS
```

4. **Run the development server**
```bash
npm run dev
```

5. **Open in browser**
```
http://localhost:3000
```

## 🎯 Usage

1. **Paste YouTube URL** - Any video you want to transform
2. **Select Style** - Choose narration style (Documentary, Storytelling, etc.)
3. **Pick Voice** - Select from 10+ voice options
4. **Choose Music** - Pick background music mood
5. **Set Duration** - 15s, 30s, or 45s
6. **Select Language** - English or Hindi
7. **Generate!** - Watch real-time logs as AI creates your video

## 🛠️ Technology Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Modern styling
- **Server-Sent Events** - Real-time log streaming

### Backend
- **Python 3.10+** - Core video processing
- **FFmpeg** - Video editing and assembly
- **Groq API** - AI narration generation (llama-3.3-70b-versatile)
- **Google Cloud TTS** - Premium voice synthesis
- **Edge TTS** - Free voice synthesis
- **Faster Whisper** - Audio transcription
- **MoviePy** - Video manipulation

## 📁 Project Structure

```
fresta/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main UI dashboard
│   │   └── api/
│   │       └── faceless/
│   │           └── route.ts      # API endpoint with SSE
├── scripts/
│   └── faceless-generator/
│       ├── main.py               # Core video generation logic
│       ├── Components/           # Transcription, TTS, etc.
│       └── requirements.txt      # Python dependencies
├── public/                        # Static assets & generated videos
└── output/                        # Processing workspace
```

## 🎨 Customization

### Adding New Voices
Edit `src/app/page.tsx`:
```typescript
const VOICES = [
  { id: "your-voice-id", label: "Your Voice", lang: "🇺🇸", gender: "Male", provider: "Edge" },
  // ...
];
```

### Custom Narration Styles
Modify prompt in `scripts/faceless-generator/main.py`:
```python
def rewrite_as_story(transcription: str, style: str, language: str):
    # Customize AI prompt here
```

### Background Music
Add music files to `storyforge-ai/tracks/` and update `MUSIC_MOODS` array.

## 🔑 API Keys

### Required
- **Groq API** (Free): [Get key here](https://console.groq.com/keys)
  - Used for AI narration generation

### Optional
- **Google Cloud TTS**: [Enable here](https://console.cloud.google.com/)
  - Premium voice quality (if not set, uses free Edge TTS)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Swotboysandy/fresta&type=Date)](https://star-history.com/#Swotboysandy/fresta&Date)

## 🙏 Acknowledgments

- [Groq](https://groq.com/) - Lightning-fast AI inference
- [Google Cloud TTS](https://cloud.google.com/text-to-speech) - Natural voice synthesis
- [FFmpeg](https://ffmpeg.org/) - Powerful video processing
- [Next.js](https://nextjs.org/) - Amazing React framework

## 📧 Contact

**Sunny** - [@Swotboysandy](https://github.com/Swotboysandy)

Project Link: [https://github.com/Swotboysandy/fresta](https://github.com/Swotboysandy/fresta)

💡 **Open for contributions!** Feel free to submit PRs, report issues, or suggest features.

---

<div align="center">

### 🌟 If you find this useful, please give it a star! 🌟

Made with ❤️ by [Sunny](https://github.com/Swotboysandy)

</div>
