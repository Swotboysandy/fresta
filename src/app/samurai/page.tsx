"use client";

import { useState } from "react";
import Link from "next/link";

export default function SamuraiPage() {
    const [youtubeUrl, setYoutubeUrl] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [videoResult, setVideoResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!youtubeUrl.trim()) return;

        setIsProcessing(true);
        setLogs(["🚀 Starting SamurAI Shorts Generator..."]);
        setVideoResult(null);
        setError(null);

        try {
            const res = await fetch("/api/clipper", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: youtubeUrl, mode: "samurai" }),
            });

            if (!res.body) {
                setError("No response from server");
                setIsProcessing(false);
                return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let currentLogs: string[] = ["🚀 Starting SamurAI Shorts Generator..."];

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
                                setError(result.details || result.error || "Unknown error");
                                currentLogs = [...currentLogs, `❌ ${result.error}`];
                                setLogs([...currentLogs]);
                            }
                        }
                    } catch {
                        // Ignore parse errors
                    }
                }
            }
        } catch (err) {
            setError("Network error occurred");
            setLogs((prev) => [...prev, "❌ Network error"]);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-white">
            {/* Header */}
            <header className="glass-panel border-0 border-b border-[var(--glass-border)] py-4">
                <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="text-2xl hover:scale-110 transition-transform">
                            ←
                        </Link>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-xl">
                            ⚔️
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                                SamurAI Shorts
                            </h1>
                            <p className="text-xs text-[var(--text-muted)]">
                                AI-Powered YouTube Shorts Generator
                            </p>
                        </div>
                    </div>
                    <a
                        href="https://github.com/SamurAIGPT/AI-Youtube-Shorts-Generator"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[var(--text-muted)] hover:text-white transition-colors"
                    >
                        GitHub ↗
                    </a>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-6 py-8">
                <div className="space-y-6">
                    {/* Input Section */}
                    <div className="glass-panel p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-red-500 text-white text-sm flex items-center justify-center">
                                1
                            </span>
                            YouTube Video URL
                        </h2>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={youtubeUrl}
                                onChange={(e) => setYoutubeUrl(e.target.value)}
                                placeholder="https://youtube.com/watch?v=..."
                                className="input flex-1"
                                disabled={isProcessing}
                            />
                            <button
                                onClick={handleGenerate}
                                disabled={isProcessing || !youtubeUrl.trim()}
                                className="btn btn-primary px-6 disabled:opacity-50"
                            >
                                {isProcessing ? (
                                    <span className="flex items-center gap-2">
                                        <svg
                                            className="w-5 h-5 animate-spin"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            ></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                        Processing...
                                    </span>
                                ) : (
                                    "⚔️ Generate Short"
                                )}
                            </button>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-3">
                            Paste any YouTube video URL. The AI will find the best highlight and
                            create a vertical short with subtitles.
                        </p>
                    </div>

                    {/* How It Works */}
                    <div className="glass-panel p-6">
                        <h2 className="text-lg font-semibold mb-4">How It Works</h2>
                        <div className="grid grid-cols-5 gap-4 text-center text-sm">
                            <div className="space-y-2">
                                <div className="w-10 h-10 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center text-xl">
                                    📥
                                </div>
                                <p>Download</p>
                            </div>
                            <div className="space-y-2">
                                <div className="w-10 h-10 mx-auto rounded-full bg-green-500/20 flex items-center justify-center text-xl">
                                    🎵
                                </div>
                                <p>Transcribe</p>
                            </div>
                            <div className="space-y-2">
                                <div className="w-10 h-10 mx-auto rounded-full bg-purple-500/20 flex items-center justify-center text-xl">
                                    🤖
                                </div>
                                <p>AI Highlight</p>
                            </div>
                            <div className="space-y-2">
                                <div className="w-10 h-10 mx-auto rounded-full bg-orange-500/20 flex items-center justify-center text-xl">
                                    ✂️
                                </div>
                                <p>Crop 9:16</p>
                            </div>
                            <div className="space-y-2">
                                <div className="w-10 h-10 mx-auto rounded-full bg-pink-500/20 flex items-center justify-center text-xl">
                                    📝
                                </div>
                                <p>Subtitles</p>
                            </div>
                        </div>
                    </div>

                    {/* Logs Section */}
                    {logs.length > 0 && (
                        <div className="glass-panel p-6">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center">
                                    2
                                </span>
                                Live Progress
                                {isProcessing && (
                                    <span className="ml-2 w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                )}
                            </h2>
                            <div className="bg-black/50 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
                                {logs.map((log, idx) => (
                                    <div
                                        key={idx}
                                        className={`py-1 ${log.includes("❌")
                                                ? "text-red-400"
                                                : log.includes("✅")
                                                    ? "text-green-400"
                                                    : log.includes("✓")
                                                        ? "text-green-400"
                                                        : log.includes("[AI]")
                                                            ? "text-purple-400"
                                                            : log.includes("Step")
                                                                ? "text-blue-400"
                                                                : "text-gray-300"
                                            }`}
                                    >
                                        {log}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300">
                            <strong>Error:</strong> {error}
                        </div>
                    )}

                    {/* Video Result */}
                    {videoResult && (
                        <div className="glass-panel p-6 text-center">
                            <h2 className="text-lg font-semibold mb-4 flex items-center justify-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-green-500 text-white text-sm flex items-center justify-center">
                                    3
                                </span>
                                Your Short is Ready! 🎉
                            </h2>
                            <video
                                src={videoResult}
                                controls
                                className="w-full max-w-[300px] mx-auto rounded-xl shadow-2xl border-2 border-green-500/50"
                            />
                            <div className="mt-4 flex justify-center gap-3">
                                <a
                                    href={videoResult}
                                    download
                                    className="btn btn-primary"
                                >
                                    ⬇️ Download Video
                                </a>
                                <button
                                    onClick={() => {
                                        setVideoResult(null);
                                        setLogs([]);
                                        setYoutubeUrl("");
                                    }}
                                    className="btn btn-secondary"
                                >
                                    🔄 New Video
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
