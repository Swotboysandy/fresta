"use client";

import { useState } from "react";
import Link from "next/link";

const STYLES = [
    { id: "documentary", label: "Documentary", icon: "🎬" },
    { id: "story", label: "Storytelling", icon: "📖" },
    { id: "educational", label: "Educational", icon: "🎓" },
    { id: "dramatic", label: "Dramatic", icon: "🎭" },
];

const VOICES = [
    { id: "hi-IN-SwaraNeural", label: "Hindi Female (Swara)", lang: "🇮🇳" },
    { id: "hi-IN-MadhurNeural", label: "Hindi Male (Madhur)", lang: "🇮🇳" },
    { id: "en-US-JennyNeural", label: "English Female (Jenny)", lang: "🇺🇸" },
    { id: "en-US-GuyNeural", label: "English Male (Guy)", lang: "🇺🇸" },
];

const MUSIC_MOODS = [
    { id: "cinematic", label: "Cinematic", icon: "🎥" },
    { id: "chill", label: "Chill", icon: "😌" },
    { id: "dramatic", label: "Dramatic", icon: "⚡" },
    { id: "upbeat", label: "Upbeat", icon: "🎉" },
    { id: "none", label: "No Music", icon: "🔇" },
];

export default function FacelessPage() {
    const [youtubeUrl, setYoutubeUrl] = useState("");
    const [style, setStyle] = useState("documentary");
    const [voice, setVoice] = useState("hi-IN-SwaraNeural");
    const [music, setMusic] = useState("cinematic");
    const [isProcessing, setIsProcessing] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [videoResult, setVideoResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!youtubeUrl.trim()) return;

        setIsProcessing(true);
        setLogs(["🚀 Starting AI Faceless Video Generator..."]);
        setVideoResult(null);
        setError(null);

        try {
            const res = await fetch("/api/faceless", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: youtubeUrl, style, voice, music }),
            });

            if (!res.body) {
                setError("No response from server");
                setIsProcessing(false);
                return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let currentLogs: string[] = ["🚀 Starting AI Faceless Video Generator..."];

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
                            setLogs([...currentLogs]);
                        } else if (event.type === "error") {
                            currentLogs = [...currentLogs, `❌ ${event.data}`];
                            setLogs([...currentLogs]);
                        } else if (event.type === "done") {
                            const result = JSON.parse(event.data);
                            if (result.success && result.videoUrl) {
                                setVideoResult(result.videoUrl);
                                currentLogs = [...currentLogs, "✅ Video generated successfully!"];
                                setLogs([...currentLogs]);
                            } else {
                                setError(result.error || "Unknown error");
                            }
                        }
                    } catch {
                        // Ignore
                    }
                }
            }
        } catch {
            setError("Network error occurred");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-white">
            {/* Header */}
            <header className="glass-panel border-0 border-b border-[var(--glass-border)] py-4">
                <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="text-2xl hover:scale-110 transition-transform">←</Link>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xl">
                            🎭
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                                AI Faceless Generator
                            </h1>
                            <p className="text-xs text-[var(--text-muted)]">
                                Transform any video with AI narration
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="max-w-5xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Settings */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* URL Input */}
                        <div className="glass-panel p-6">
                            <h2 className="text-lg font-semibold mb-4">📺 YouTube URL</h2>
                            <input
                                type="text"
                                value={youtubeUrl}
                                onChange={(e) => setYoutubeUrl(e.target.value)}
                                placeholder="https://youtube.com/watch?v=..."
                                className="input w-full"
                                disabled={isProcessing}
                            />
                        </div>

                        {/* Style */}
                        <div className="glass-panel p-6">
                            <h2 className="text-lg font-semibold mb-4">🎨 Narration Style</h2>
                            <div className="grid grid-cols-4 gap-3">
                                {STYLES.map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => setStyle(s.id)}
                                        disabled={isProcessing}
                                        className={`p-3 rounded-lg border transition-all text-center ${style === s.id
                                                ? "border-purple-500 bg-purple-500/20"
                                                : "border-[var(--glass-border)] hover:border-purple-500/50"
                                            }`}
                                    >
                                        <span className="text-2xl block">{s.icon}</span>
                                        <span className="text-xs">{s.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Voice */}
                        <div className="glass-panel p-6">
                            <h2 className="text-lg font-semibold mb-4">🎙️ Voice</h2>
                            <div className="grid grid-cols-2 gap-3">
                                {VOICES.map((v) => (
                                    <button
                                        key={v.id}
                                        onClick={() => setVoice(v.id)}
                                        disabled={isProcessing}
                                        className={`p-3 rounded-lg border transition-all text-left ${voice === v.id
                                                ? "border-blue-500 bg-blue-500/20"
                                                : "border-[var(--glass-border)] hover:border-blue-500/50"
                                            }`}
                                    >
                                        <span className="text-lg mr-2">{v.lang}</span>
                                        <span className="text-sm">{v.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Music */}
                        <div className="glass-panel p-6">
                            <h2 className="text-lg font-semibold mb-4">🎵 Background Music</h2>
                            <div className="flex flex-wrap gap-2">
                                {MUSIC_MOODS.map((m) => (
                                    <button
                                        key={m.id}
                                        onClick={() => setMusic(m.id)}
                                        disabled={isProcessing}
                                        className={`px-4 py-2 rounded-full border transition-all text-sm ${music === m.id
                                                ? "border-green-500 bg-green-500/20"
                                                : "border-[var(--glass-border)] hover:border-green-500/50"
                                            }`}
                                    >
                                        {m.icon} {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Generate Button */}
                        <button
                            onClick={handleGenerate}
                            disabled={isProcessing || !youtubeUrl.trim()}
                            className="btn btn-primary w-full py-4 text-lg font-bold disabled:opacity-50"
                        >
                            {isProcessing ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Generating...
                                </span>
                            ) : (
                                "🎭 Generate Faceless Video"
                            )}
                        </button>
                    </div>

                    {/* Right: Logs & Result */}
                    <div className="space-y-6">
                        {/* Logs */}
                        {logs.length > 0 && (
                            <div className="glass-panel p-4">
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    Live Progress
                                    {isProcessing && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>}
                                </h3>
                                <div className="bg-black/50 rounded-lg p-3 h-80 overflow-y-auto font-mono text-xs">
                                    {logs.map((log, idx) => (
                                        <div
                                            key={idx}
                                            className={`py-0.5 ${log.includes("❌") ? "text-red-400" :
                                                    log.includes("✓") || log.includes("✅") ? "text-green-400" :
                                                        log.includes("Step") ? "text-blue-400" :
                                                            log.includes("[AI]") ? "text-purple-400" :
                                                                "text-gray-300"
                                                }`}
                                        >
                                            {log}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Result */}
                        {videoResult && (
                            <div className="glass-panel p-4 text-center">
                                <h3 className="text-lg font-semibold mb-3 text-green-400">🎉 Ready!</h3>
                                <video
                                    src={videoResult}
                                    controls
                                    className="w-full rounded-lg shadow-xl border border-green-500/50"
                                />
                                <div className="mt-4 flex gap-2 justify-center">
                                    <a href={videoResult} download className="btn btn-primary text-sm">
                                        ⬇️ Download
                                    </a>
                                    <button
                                        onClick={() => {
                                            setVideoResult(null);
                                            setLogs([]);
                                        }}
                                        className="btn btn-secondary text-sm"
                                    >
                                        🔄 New
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
