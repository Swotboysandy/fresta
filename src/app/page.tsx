"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Film,
  BookOpen,
  GraduationCap,
  Theater,
  Music,
  Sparkles,
  Smile,
  PartyPopper,
  VolumeX,
  ArrowLeft,
  Loader2,
  Download,
  RotateCcw,
  Play
} from "lucide-react";

// --- FACELESS GENERATOR DATA ---
const STYLES = [
  { id: "documentary", label: "Documentary", icon: Film, desc: "Informative" },
  { id: "story", label: "Storytelling", icon: BookOpen, desc: "Engaging" },
  { id: "educational", label: "Educational", icon: GraduationCap, desc: "Learning" },
  { id: "dramatic", label: "Dramatic", icon: Theater, desc: "Intense" },
];

const VOICES = [
  { id: "hi-IN-SwaraNeural", label: "Swara", lang: "🇮🇳", gender: "Female", provider: "Azure" },
  { id: "hi-IN-MadhurNeural", label: "Madhur", lang: "🇮🇳", gender: "Male", provider: "Azure" },
  { id: "en-US-JennyNeural", label: "Jenny", lang: "🇺🇸", gender: "Female", provider: "Azure" },
  { id: "en-US-GuyNeural", label: "Guy", lang: "🇺🇸", gender: "Male", provider: "Azure" },
  { id: "google:en-US-Journey-F", label: "Journey F", lang: "🇺🇸", gender: "Female", provider: "Google" },
  { id: "google:en-US-Journey-D", label: "Journey D", lang: "🇺🇸", gender: "Male", provider: "Google" },
  { id: "google:en-US-Studio-O", label: "Studio O", lang: "🇺🇸", gender: "Female", provider: "Google" },
  { id: "google:en-US-Studio-M", label: "Studio M", lang: "🇺🇸", gender: "Male", provider: "Google" },
];

const MUSIC_MOODS = [
  { id: "dramatic", label: "Dramatic", icon: Sparkles, color: "red" },
  { id: "cinematic", label: "Cinematic", icon: Film, color: "purple" },
  { id: "chill", label: "Chill", icon: Smile, color: "blue" },
  { id: "upbeat", label: "Upbeat", icon: PartyPopper, color: "yellow" },
  { id: "none", label: "None", icon: VolumeX, color: "gray" },
];

const DURATIONS = [
  { id: 20, label: "20 sec", desc: "Quick" },
  { id: 30, label: "30 sec", desc: "Standard" },
  { id: 60, label: "60 sec", desc: "Extended" },
];

// --- STORY GENERATOR DATA ---
const genres = [
  { id: "horror", label: "Horror", icon: "👻" },
  { id: "romance", label: "Romance", icon: "💕" },
  { id: "scifi", label: "Sci-Fi", icon: "🚀" },
  { id: "motivation", label: "Motivation", icon: "💪" },
  { id: "thriller", label: "Thriller", icon: "🔍" },
  { id: "kids", label: "Kids", icon: "🧸" },
  { id: "comedy", label: "Comedy", icon: "😂" },
  { id: "fantasy", label: "Fantasy", icon: "🧙" },
];

export default function Home() {
  const router = useRouter();

  // Tab State
  const [activeTab, setActiveTab] = useState<"story" | "faceless">("story");

  // --- STORY STATE ---
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [theme, setTheme] = useState("");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [isStartingStory, setIsStartingStory] = useState(false);
  const canProceedStory = selectedGenre && theme.trim().length > 0;

  // --- FACELESS STATE ---
  const [facelessUrl, setFacelessUrl] = useState("");
  const [facelessStyle, setFacelessStyle] = useState("dramatic");
  const [facelessVoice, setFacelessVoice] = useState("hi-IN-SwaraNeural");
  const [facelessMusic, setFacelessMusic] = useState("dramatic");
  const [facelessDuration, setFacelessDuration] = useState(30);
  const [facelessLanguage, setFacelessLanguage] = useState("english");
  const [isProcessingFaceless, setIsProcessingFaceless] = useState(false);
  const [facelessLogs, setFacelessLogs] = useState<string[]>([]);
  const [facelessResult, setFacelessResult] = useState<string | null>(null);
  const [facelessError, setFacelessError] = useState<string | null>(null);

  // --- HANDLERS ---

  const handleStartStory = () => {
    if (!canProceedStory) return;
    setIsStartingStory(true);
    router.push(`/automate?genre=${selectedGenre}&theme=${encodeURIComponent(theme)}&orientation=${orientation}`);
  };

  const handleGenerateFaceless = async () => {
    if (!facelessUrl.trim()) return;

    setIsProcessingFaceless(true);
    setFacelessLogs(["🚀 Initializing AI Video Generator..."]);
    setFacelessResult(null);
    setFacelessError(null);

    try {
      const res = await fetch("/api/faceless", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: facelessUrl,
          style: facelessStyle,
          voice: facelessVoice,
          music: facelessMusic,
          language: facelessLanguage,
          duration: facelessDuration
        }),
      });

      if (!res.body) {
        setFacelessError("Server connection failed");
        setIsProcessingFaceless(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let currentLogs: string[] = ["🚀 Initializing AI Video Generator..."];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l) => l.startsWith("data:"));

        for (const line of lines) {
          try {
            const jsonStr = line.replace("data: ", "").trim();
            if (!jsonStr) continue;
            const event = JSON.parse(jsonStr);

            if (event.type === "log") {
              currentLogs = [...currentLogs, event.data];
              setFacelessLogs([...currentLogs]);
            } else if (event.type === "error") {
              currentLogs = [...currentLogs, `❌ ${event.data}`];
              setFacelessLogs([...currentLogs]);
            } else if (event.type === "done") {
              const result = JSON.parse(event.data);
              if (result.success && result.videoUrl) {
                setFacelessResult(result.videoUrl);
                currentLogs = [...currentLogs, "✅ Generation complete!"];
                setFacelessLogs([...currentLogs]);
              } else {
                setFacelessError(result.error || "Generation failed");
              }
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch {
      setFacelessError("Network error - please try again");
    } finally {
      setIsProcessingFaceless(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f] text-white font-sans selection:bg-purple-500/30">

      {/* Header */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                FRESTA
              </h1>
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Video Automation</p>
            </div>
          </div>

          <div className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
            <button
              onClick={() => setActiveTab("story")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "story"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-900/20"
                : "text-white/40 hover:text-white hover:bg-white/5"
                }`}
            >
              <Sparkles className="w-4 h-4" />
              Story Generator
            </button>
            <button
              onClick={() => setActiveTab("faceless")}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "faceless"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-900/20"
                : "text-white/40 hover:text-white hover:bg-white/5"
                }`}
            >
              <Theater className="w-4 h-4" />
              Faceless Video
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex justify-center py-10 px-6">
        <div className="max-w-6xl w-full">

          {activeTab === "story" ? (
            /* --- STORY GENERATOR UI --- */
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-2">Create AI Stories</h2>
                <p className="text-white/40">Generate unique stories with voiceovers and visuals instantly.</p>
              </div>

              {/* Genre Selection */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center border border-purple-500/20">1</span>
                  Choose Genre
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {genres.map((genre) => (
                    <button
                      key={genre.id}
                      onClick={() => setSelectedGenre(genre.id)}
                      className={`p-3 rounded-xl border transition-all text-center hover:bg-white/5 ${selectedGenre === genre.id
                        ? "border-purple-500/50 bg-purple-500/10 text-white"
                        : "border-white/5 text-white/50 hover:border-white/10"
                        }`}
                    >
                      <span className="text-2xl block mb-2 opacity-80">{genre.icon}</span>
                      <span className="text-xs font-medium">{genre.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Input */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center border border-purple-500/20">2</span>
                  Describe Story
                </h3>
                <textarea
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="Example: A lonely astronaut discovers an ancient alien message on Mars..."
                  className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 transition-all resize-none"
                />
              </div>

              {/* Orientation */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center border border-purple-500/20">3</span>
                  Format
                </h3>
                <div className="flex gap-4">
                  <button
                    onClick={() => setOrientation("portrait")}
                    className={`flex-1 p-4 rounded-xl border transition-all ${orientation === "portrait"
                      ? "border-purple-500/50 bg-purple-500/10"
                      : "border-white/5 hover:bg-white/5"
                      }`}
                  >
                    <div className="w-6 h-10 mx-auto mb-2 border-2 border-current rounded opacity-60"></div>
                    <p className="text-sm font-medium">Portrait</p>
                    <p className="text-[10px] text-white/40">9:16 (Shorts)</p>
                  </button>
                  <button
                    onClick={() => setOrientation("landscape")}
                    className={`flex-1 p-4 rounded-xl border transition-all ${orientation === "landscape"
                      ? "border-purple-500/50 bg-purple-500/10"
                      : "border-white/5 hover:bg-white/5"
                      }`}
                  >
                    <div className="w-10 h-6 mx-auto mb-2 border-2 border-current rounded opacity-60"></div>
                    <p className="text-sm font-medium">Landscape</p>
                    <p className="text-[10px] text-white/40">16:9 (YouTube)</p>
                  </button>
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={handleStartStory}
                disabled={!canProceedStory || isStartingStory}
                className="w-full py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-lg shadow-purple-900/40 hover:shadow-purple-700/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.99]"
              >
                {isStartingStory ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Starting...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Generate Story
                  </span>
                )}
              </button>
            </div>
          ) : (
            /* --- FACELESS GENERATOR UI --- */
            <div className="w-full px-4 py-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen flex flex-col">

              {/* Configuration */}
              <div className="flex-1 flex flex-col space-y-4">
                <div className="text-center mb-4">
                  <h2 className="text-4xl font-bold mb-2">Faceless Video Generator</h2>
                  <p className="text-white/40">Transform YouTube videos into engaging Shorts with AI.</p>
                </div>

                {/* URL Input */}
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
                  <label className="block text-sm font-medium text-white/50 mb-3">YouTube URL</label>
                  <input
                    type="text"
                    value={facelessUrl}
                    onChange={(e) => setFacelessUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full px-4 py-3 text-base bg-black/40 border border-white/5 rounded-lg text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/30 transition-all"
                    disabled={isProcessingFaceless}
                  />
                </div>

                {/* Compact 5-Column Dashboard */}
                <div className="grid grid-cols-5 gap-4 flex-1">

                  {/* Style */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                    <label className="block text-sm font-semibold text-white/50 mb-3">Style</label>
                    <div className="grid grid-cols-2 gap-2">
                      {STYLES.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setFacelessStyle(s.id)}
                          disabled={isProcessingFaceless}
                          className={`p-3 rounded-lg border transition-all ${facelessStyle === s.id ? "border-purple-500/40 bg-purple-500/10" : "border-white/5 bg-black/20 hover:border-purple-500/20"}`}
                        >
                          <s.icon className="w-6 h-6 mx-auto mb-1.5 text-purple-300" />
                          <div className="text-xs text-white/70">{s.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Voice */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 flex flex-col">
                    <label className="block text-base font-semibold text-white/50 mb-4">Voice</label>
                    <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
                      {VOICES.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setFacelessVoice(v.id)}
                          disabled={isProcessingFaceless}
                          className={`w-full p-2.5 rounded-lg border transition-all text-left ${facelessVoice === v.id ? "border-purple-500/40 bg-purple-500/10" : "border-white/5 bg-black/20 hover:border-purple-500/20"}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-white/80">{v.lang} {v.label}</span>
                            <span className="text-[10px] text-white/30">{v.gender[0]}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Music */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 flex flex-col">
                    <label className="block text-base font-semibold text-white/50 mb-4">Music</label>
                    <div className="grid grid-cols-2 gap-2.5 flex-1">
                      {MUSIC_MOODS.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setFacelessMusic(m.id)}
                          disabled={isProcessingFaceless}
                          className={`p-3 rounded-lg border transition-all ${facelessMusic === m.id ? "border-purple-500/40 bg-purple-500/10" : "border-white/5 bg-black/20 hover:border-purple-500/20"}`}
                        >
                          <m.icon className="w-5 h-5 mx-auto mb-1.5" style={{ color: m.color }} />
                          <div className="text-xs text-white/70">{m.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 flex flex-col">
                    <label className="block text-base font-semibold text-white/50 mb-4">Duration</label>
                    <div className="space-y-2.5 flex-1">
                      {DURATIONS.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => setFacelessDuration(d.id)}
                          disabled={isProcessingFaceless}
                          className={`w-full p-2.5 rounded-lg border transition-all ${facelessDuration === d.id ? "border-purple-500/40 bg-purple-500/10" : "border-white/5 bg-black/20 hover:border-purple-500/20"}`}
                        >
                          <div className="text-sm font-semibold text-white/80">{d.label}</div>
                          <div className="text-xs text-white/30">{d.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Language */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 flex flex-col">
                    <label className="block text-base font-semibold text-white/50 mb-4">Language</label>
                    <div className="space-y-2.5 flex-1">
                      <button
                        onClick={() => setFacelessLanguage("english")}
                        disabled={isProcessingFaceless}
                        className={`w-full p-3 rounded-lg border transition-all text-sm ${facelessLanguage === "english" ? "border-purple-500/40 bg-purple-500/10 text-white" : "border-white/5 bg-black/20 hover:border-purple-500/20 text-white/70"}`}
                      >
                        🇺🇸 English
                      </button>
                      <button
                        onClick={() => setFacelessLanguage("hindi")}
                        disabled={isProcessingFaceless}
                        className={`w-full p-3 rounded-lg border transition-all text-sm ${facelessLanguage === "hindi" ? "border-purple-500/40 bg-purple-500/10 text-white" : "border-white/5 bg-black/20 hover:border-purple-500/20 text-white/70"}`}
                      >
                        🇮🇳 Hindi
                      </button>
                    </div>
                  </div>

                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerateFaceless}
                  disabled={isProcessingFaceless || !facelessUrl.trim()}
                  className="w-full py-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-lg shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isProcessingFaceless ? (
                    <span className="flex items-center justify-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing Video...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Play className="w-5 h-5 fill-current" />
                      <span>Generate Faceless Video</span>
                    </span>
                  )}
                </button>
              </div>

              {/* Output Section */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                {/* Progress Bar & Logs */}
                {facelessLogs.length > 0 && (
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col max-h-[300px]">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h3 className="text-xs font-bold text-white/60 uppercase tracking-widest">
                        {isProcessingFaceless ? "Processing Video..." : "Status Log"}
                      </h3>
                      {isProcessingFaceless && (
                        <div className="text-[10px] text-purple-300 font-mono">
                          Est. time: ~1-2 mins
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {isProcessingFaceless && (
                      <div className="w-full h-1 bg-white/5 rounded-full mb-4 overflow-hidden relative">
                        <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-600 to-blue-500 animate-progress w-full origin-left-right"></div>
                      </div>
                    )}

                    <div className="flex-1 bg-black/40 rounded-xl p-3 overflow-y-auto font-mono text-[10px] text-white/60 leading-relaxed space-y-1 custom-scrollbar">
                      {facelessLogs.map((log, idx) => (
                        <div
                          key={idx}
                          className={`${log.includes("❌") ? "text-red-400" :
                            log.includes("✓") || log.includes("✅") ? "text-emerald-400" :
                              log.includes("Step") ? "text-blue-400" :
                                log.includes("[AI]") ? "text-purple-400" :
                                  ""
                            }`}
                        >
                          <span className="opacity-30 mr-2">{new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error */}
                {facelessError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                    <span className="text-lg">⚠️</span>
                    <div>
                      <h4 className="text-sm font-bold text-red-400">Generation Failed</h4>
                      <p className="text-xs text-red-300/60 mt-0.5">{facelessError}</p>
                    </div>
                  </div>
                )}

                {/* Result */}
                {facelessResult && (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 shadow-2xl shadow-emerald-900/10 text-center">
                    <div className="flex items-center justify-center gap-2 mb-4 text-emerald-400">
                      <PartyPopper className="w-5 h-5" />
                      <h3 className="text-sm font-bold uppercase tracking-wide">Video Ready!</h3>
                    </div>
                    <video
                      src={facelessResult}
                      controls
                      className="w-full max-w-sm mx-auto rounded-xl shadow-lg border border-white/5 aspect-[9/16] bg-black"
                    />
                    <div className="flex gap-2 mt-4 justify-center">
                      <a
                        href={facelessResult}
                        download="faceless_video.mp4"
                        className="px-8 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-center text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </a>
                      <button
                        onClick={() => {
                          setFacelessResult(null);
                          setFacelessLogs([]);
                          setFacelessUrl("");
                        }}
                        className="px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-white/60 hover:text-white transition-all"
                        title="Start New"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.4);
        }
        @keyframes progress {
            0% { transform: scaleX(0); }
            50% { transform: scaleX(0.7); }
            100% { transform: scaleX(0.95); }
        }
        .animate-progress {
            animation: progress 60s cubic-bezier(0.1, 0.6, 0.1, 1) forwards;
            transform-origin: left;
        }
      `}</style>
    </div>
  );
}
