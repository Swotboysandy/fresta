"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Genre data with icons
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
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [theme, setTheme] = useState("");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [isStarting, setIsStarting] = useState(false);

  // Clipper State
  const [mode, setMode] = useState<"generate" | "repurpose">("generate");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isClipping, setIsClipping] = useState(false);
  const [clipResult, setClipResult] = useState<string | null>(null);
  const [clipLogs, setClipLogs] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [useYoutube, setUseYoutube] = useState(true);
  const [useInstagram, setUseInstagram] = useState(false);

  const canProceed = selectedGenre && theme.trim().length > 0;

  const handleStart = () => {
    if (!canProceed) return;
    setIsStarting(true);
    router.push(`/automate?genre=${selectedGenre}&theme=${encodeURIComponent(theme)}&orientation=${orientation}`);
  };

  const handleClip = async () => {
    if (!youtubeUrl) return;
    setIsClipping(true);
    setClipResult(null);
    setClipLogs("🚀 Starting...");

    try {
      const res = await fetch("/api/clipper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl, mode: "samurai" }),
      });

      if (!res.body) {
        setClipLogs("❌ No response body");
        setIsClipping(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let logs: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(l => l.startsWith("data:"));

        for (const line of lines) {
          try {
            const jsonStr = line.replace("data: ", "").trim();
            if (!jsonStr) continue;
            const event = JSON.parse(jsonStr);

            if (event.type === "log") {
              logs = [...logs.slice(-15), event.data]; // Keep last 15 lines
              setClipLogs(logs.join("\n"));
            } else if (event.type === "error") {
              logs = [...logs, `❌ ${event.data}`];
              setClipLogs(logs.join("\n"));
            } else if (event.type === "done") {
              const result = JSON.parse(event.data);
              if (result.success && result.videoUrl) {
                setClipResult(result.videoUrl);
                logs = [...logs, "✅ Done! Video generated successfully."];
                setClipLogs(logs.join("\n"));
              } else {
                logs = [...logs, `❌ Error: ${result.details || result.error}`];
                setClipLogs(logs.join("\n"));
              }
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    } catch (error) {
      setClipLogs("❌ Network error occurred.");
    } finally {
      setIsClipping(false);
    }
  };

  const handleUpload = async () => {
    if (!clipResult) return;
    setIsUploading(true);

    const platforms = [];
    if (useYoutube) platforms.push({ name: "YouTube", url: "/api/upload/youtube" });
    if (useInstagram) platforms.push({ name: "Instagram", url: "/api/upload/instagram" });

    if (platforms.length === 0) {
      setUploadStatus("Please select at least one platform.");
      setIsUploading(false);
      return;
    }

    try {
      for (const platform of platforms) {
        setUploadStatus(`Uploading to ${platform.name}... (Check Chrome)`);

        const res = await fetch(platform.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoPath: clipResult,
            title: "AI Generated Short",
            description: "Created with StoryForge AI #shorts #ai",
            caption: "Created with StoryForge AI #shorts #ai"
          })
        });
        const data = await res.json();

        if (!data.success) {
          setUploadStatus(`Error uploading to ${platform.name}: ${data.error}`);
          // Continue to next platform? Or stop? Let's continue.
        }
      }
      setUploadStatus("Upload process finished!");
    } catch (e) {
      setUploadStatus("Network Error");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="glass-panel border-0 border-b border-[var(--glass-border)] py-4">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl">
              🎬
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                StoryForge AI
              </h1>
              <p className="text-xs text-[var(--text-muted)]">Fully Automated Video Generation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/faceless"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 hover:border-purple-500/50 transition-all text-sm font-medium"
            >
              <span>🎭</span>
              <span>Faceless</span>
            </a>
            <a
              href="/samurai"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 hover:border-red-500/50 transition-all text-sm font-medium"
            >
              <span>⚔️</span>
              <span>SamurAI</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center py-12">
        <div className="max-w-2xl mx-auto px-6 w-full">
          <div className="text-center mb-10 animate-fade-in">
            <h2 className="text-4xl font-bold mb-3">
              Create <span className="text-gradient">AI Videos</span> Instantly
            </h2>
            <p className="text-lg text-[var(--text-muted)]">
              One click. Story, voice, and video — all automated.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex p-1 rounded-xl bg-[var(--glass-border)] mb-8">
            <button
              onClick={() => setMode("generate")}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${mode === "generate"
                ? "bg-[var(--accent-primary)] text-white shadow-lg"
                : "text-[var(--text-muted)] hover:text-white"
                }`}
            >
              ✨ Generate Story
            </button>
            <button
              onClick={() => setMode("repurpose")}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${mode === "repurpose"
                ? "bg-[var(--accent-primary)] text-white shadow-lg"
                : "text-[var(--text-muted)] hover:text-white"
                }`}
            >
              ✂️ Repurpose YouTube
            </button>
          </div>

          {mode === "generate" ? (
            <div className="space-y-8 animate-fade-in">
              {/* Genre Selection */}
              <div className="glass-panel p-6" style={{ animationDelay: "0.1s" }}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm flex items-center justify-center">1</span>
                  Choose Genre
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {genres.map((genre) => (
                    <button
                      key={genre.id}
                      onClick={() => setSelectedGenre(genre.id)}
                      className={`p-4 rounded-xl border-2 transition-all text-center hover:scale-105 ${selectedGenre === genre.id
                        ? "border-[var(--accent-primary)] bg-[rgba(139,92,246,0.15)] scale-105"
                        : "border-[var(--glass-border)] hover:border-[var(--accent-primary)]/50"
                        }`}
                    >
                      <span className="text-3xl block mb-1">{genre.icon}</span>
                      <span className="text-sm font-medium">{genre.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Input */}
              <div className="glass-panel p-6" style={{ animationDelay: "0.2s" }}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm flex items-center justify-center">2</span>
                  Describe Your Story
                </h3>
                <textarea
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="Example: A lonely astronaut discovers an ancient alien message on Mars..."
                  className="input w-full h-28 resize-none"
                />
              </div>

              {/* Orientation */}
              <div className="glass-panel p-6" style={{ animationDelay: "0.3s" }}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm flex items-center justify-center">3</span>
                  Video Format
                </h3>
                <div className="flex gap-4">
                  <button
                    onClick={() => setOrientation("portrait")}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all ${orientation === "portrait"
                      ? "border-[var(--accent-primary)] bg-[rgba(139,92,246,0.15)]"
                      : "border-[var(--glass-border)]"
                      }`}
                  >
                    <div className="w-8 h-12 mx-auto mb-2 border-2 border-current rounded"></div>
                    <p className="font-medium">Portrait</p>
                    <p className="text-xs text-[var(--text-muted)]">TikTok, Reels, Shorts</p>
                  </button>
                  <button
                    onClick={() => setOrientation("landscape")}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all ${orientation === "landscape"
                      ? "border-[var(--accent-primary)] bg-[rgba(139,92,246,0.15)]"
                      : "border-[var(--glass-border)]"
                      }`}
                  >
                    <div className="w-12 h-8 mx-auto mb-2 border-2 border-current rounded"></div>
                    <p className="font-medium">Landscape</p>
                    <p className="text-xs text-[var(--text-muted)]">YouTube, TV</p>
                  </button>
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={handleStart}
                disabled={!canProceed || isStarting}
                className={`btn btn-primary w-full py-5 text-xl font-bold ${!canProceed ? "opacity-50" : ""}`}
                style={{ animationDelay: "0.4s" }}
              >
                {isStarting ? (
                  <>
                    <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Starting...
                  </>
                ) : (
                  <>🚀 Start Full Automation</>
                )}
              </button>

              <p className="text-center text-sm text-[var(--text-muted)]">
                {!canProceed ? (
                  !selectedGenre ? "Select a genre to continue" : "Describe your story to continue"
                ) : (
                  "AI will generate story → voice narration → video clips automatically"
                )}
              </p>
            </div>
          ) : (
            /* CLIPPER MODE */
            <div className="space-y-8 animate-fade-in">
              <div className="glass-panel p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-500 text-white text-sm flex items-center justify-center">1</span>
                  YouTube Source
                </h3>
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="Paste YouTube Video URL (e.g., https://youtube.com/watch?v=...)"
                  className="input w-full"
                />
              </div>

              {/* Status / Logs */}
              {(clipLogs || isClipping) && (
                <div className="p-6 rounded-xl bg-gradient-to-br from-blue-900/40 to-purple-900/40 border border-blue-500/30">
                  <div className="flex items-center gap-3 mb-2">
                    {isClipping && (
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    )}
                    <span className={`text-lg font-semibold ${isClipping ? 'text-blue-400' : clipLogs.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
                      {isClipping ? 'Processing...' : clipLogs.includes('Error') ? 'Error' : 'Complete'}
                    </span>
                  </div>
                  <p className="text-sm text-white/80 font-mono">
                    {clipLogs}
                  </p>
                  {isClipping && (
                    <div className="mt-4 text-xs text-white/50">
                      This may take 2-5 minutes depending on video length
                    </div>
                  )}
                </div>
              )}

              {/* Result Video */}
              {clipResult && (
                <div className="glass-panel p-6 text-center">
                  <h3 className="text-lg font-bold text-green-400 mb-4">🎉 Clip Generated!</h3>
                  <video src={clipResult} controls className="w-full max-w-[300px] mx-auto rounded-xl shadow-2xl border-2 border-green-500/50" />
                  <div className="flex flex-col gap-4 mt-4 items-center">
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={useYoutube} onChange={e => setUseYoutube(e.target.checked)} className="checkbox" />
                        <span>YouTube</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={useInstagram} onChange={e => setUseInstagram(e.target.checked)} className="checkbox" />
                        <span>Instagram</span>
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <a href={clipResult} download className="btn btn-secondary inline-block">Download</a>
                      <button
                        onClick={handleUpload}
                        disabled={isUploading || (!useYoutube && !useInstagram)}
                        className="btn btn-primary bg-red-600 hover:bg-red-700 border-none px-6"
                      >
                        {isUploading ? "Uploading..." : `Upload to Selected`}
                      </button>
                    </div>
                  </div>
                  {uploadStatus && <p className="mt-2 text-sm text-[var(--accent-primary)]">{uploadStatus}</p>}
                </div>
              )}

              <button
                onClick={handleClip}
                disabled={!youtubeUrl || isClipping}
                className={`btn btn-primary w-full py-5 text-xl font-bold ${!youtubeUrl ? "opacity-50" : ""}`}
              >
                {isClipping ? (
                  <>
                    <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing & Clipping...
                  </>
                ) : (
                  <>✂️ Clip It Now</>
                )}
              </button>
            </div>
          )}

          {/* Features */}
          <div className="grid grid-cols-3 gap-4 pt-6">
            <div className="text-center p-4 rounded-xl bg-[var(--bg-secondary)]">
              <div className="text-2xl mb-2">📝</div>
              <p className="text-sm font-medium">AI Story</p>
              <p className="text-xs text-[var(--text-muted)]">Auto-generated</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-[var(--bg-secondary)]">
              <div className="text-2xl mb-2">🎙️</div>
              <p className="text-sm font-medium">Kore Voice</p>
              <p className="text-xs text-[var(--text-muted)]">Natural female</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-[var(--bg-secondary)]">
              <div className="text-2xl mb-2">🎬</div>
              <p className="text-sm font-medium">Veo AI Video</p>
              <p className="text-xs text-[var(--text-muted)]">Google Flow</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--glass-border)] py-4">
        <p className="text-center text-sm text-[var(--text-muted)]">
          © 2024 StoryForge AI • Powered by Gemini & Google Flow
        </p>
      </footer>
    </div>
  );
}
