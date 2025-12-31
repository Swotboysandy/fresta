"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type WatermarkPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";

function RenderContent() {
    const searchParams = useSearchParams();
    const orientation = searchParams.get("orientation") || "portrait";
    const title = searchParams.get("title") || "Untitled Story";
    const segmentCount = parseInt(searchParams.get("segments") || "5");

    const [isRendering, setIsRendering] = useState(false);
    const [renderProgress, setRenderProgress] = useState(0);
    const [renderPhase, setRenderPhase] = useState("");
    const [isComplete, setIsComplete] = useState(false);

    // Settings
    const [watermarkText, setWatermarkText] = useState("StoryForge AI");
    const [watermarkPosition, setWatermarkPosition] = useState<WatermarkPosition>("bottom-right");
    const [resolution, setResolution] = useState<"720p" | "1080p" | "4k">("1080p");
    const [audioSync, setAudioSync] = useState(true);
    const [addIntro, setAddIntro] = useState(true);
    const [addOutro, setAddOutro] = useState(true);

    const startRender = async () => {
        setIsRendering(true);
        setRenderProgress(0);

        const phases = [
            { name: "Preparing assets...", duration: 1000 },
            { name: "Merging video segments...", duration: 2000 },
            { name: "Synchronizing audio...", duration: 1500 },
            { name: "Adding intro sequence...", duration: 1000 },
            { name: "Adding outro sequence...", duration: 1000 },
            { name: "Applying watermark...", duration: 500 },
            { name: "Encoding final video...", duration: 2000 },
            { name: "Finalizing...", duration: 500 },
        ];

        let progress = 0;
        const progressPerPhase = 100 / phases.length;

        for (const phase of phases) {
            setRenderPhase(phase.name);
            const steps = 10;
            for (let i = 0; i < steps; i++) {
                await new Promise(resolve => setTimeout(resolve, phase.duration / steps));
                progress += progressPerPhase / steps;
                setRenderProgress(Math.min(progress, 100));
            }
        }

        setRenderProgress(100);
        setRenderPhase("Complete!");
        setIsRendering(false);
        setIsComplete(true);
    };

    const positionOptions: { value: WatermarkPosition; label: string }[] = [
        { value: "top-left", label: "↖ Top Left" },
        { value: "top-right", label: "↗ Top Right" },
        { value: "bottom-left", label: "↙ Bottom Left" },
        { value: "bottom-right", label: "↘ Bottom Right" },
        { value: "center", label: "⊕ Center" },
    ];

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 glass-panel border-0 border-b border-[var(--glass-border)]">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/video" className="btn btn-ghost p-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="text-lg font-semibold text-[var(--text-primary)]">Final Rendering</h1>
                            <p className="text-xs text-[var(--text-muted)]">Step 5 of 5 • Merge & export</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Step Indicator */}
            <div className="bg-[var(--bg-secondary)] border-b border-[var(--glass-border)] py-4">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="flex items-center justify-center gap-2">
                        <div className="step-indicator">
                            <div className="step-dot completed"></div>
                            <span className="text-sm text-[var(--text-muted)]">Setup</span>
                        </div>
                        <div className="step-line completed w-12"></div>
                        <div className="step-indicator">
                            <div className="step-dot completed"></div>
                            <span className="text-sm text-[var(--text-muted)]">Story</span>
                        </div>
                        <div className="step-line completed w-12"></div>
                        <div className="step-indicator">
                            <div className="step-dot completed"></div>
                            <span className="text-sm text-[var(--text-muted)]">Voice</span>
                        </div>
                        <div className="step-line completed w-12"></div>
                        <div className="step-indicator">
                            <div className="step-dot completed"></div>
                            <span className="text-sm text-[var(--text-muted)]">Video</span>
                        </div>
                        <div className="step-line completed w-12"></div>
                        <div className="step-indicator">
                            <div className="step-dot active"></div>
                            <span className="text-sm font-medium text-[var(--accent-primary)]">Export</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 py-8">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-8">
                        {/* Preview Panel */}
                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-semibold mb-4">Preview</h3>

                            {/* Video Preview */}
                            <div
                                className={`relative bg-[var(--bg-secondary)] rounded-xl overflow-hidden mx-auto ${orientation === "portrait"
                                        ? "aspect-[9/16] max-w-[280px]"
                                        : "aspect-video w-full"
                                    }`}
                                style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" }}
                            >
                                {/* Simulated Video Content */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    {!isComplete ? (
                                        <div className="text-center">
                                            <svg className="w-16 h-16 text-white/30 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p className="text-white/50 text-sm">Preview after render</p>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <div className="w-16 h-16 rounded-full bg-[var(--accent-primary)] flex items-center justify-center mx-auto mb-3">
                                                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <p className="text-white font-medium">Ready to Play</p>
                                        </div>
                                    )}
                                </div>

                                {/* Watermark Preview */}
                                <div
                                    className={`absolute text-white/60 text-xs font-medium px-2 py-1 ${watermarkPosition === "top-left" ? "top-2 left-2" :
                                            watermarkPosition === "top-right" ? "top-2 right-2" :
                                                watermarkPosition === "bottom-left" ? "bottom-2 left-2" :
                                                    watermarkPosition === "bottom-right" ? "bottom-2 right-2" :
                                                        "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                                        }`}
                                >
                                    {watermarkText}
                                </div>

                                {/* Timeline */}
                                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/60 to-transparent">
                                    <div className="absolute bottom-2 left-2 right-2 h-1 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-[var(--accent-primary)] w-0"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Video Info */}
                            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <p className="text-2xl font-bold text-gradient">{segmentCount}</p>
                                    <p className="text-xs text-[var(--text-muted)]">Segments</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gradient">{resolution}</p>
                                    <p className="text-xs text-[var(--text-muted)]">Resolution</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gradient">{orientation === "portrait" ? "9:16" : "16:9"}</p>
                                    <p className="text-xs text-[var(--text-muted)]">Aspect Ratio</p>
                                </div>
                            </div>
                        </div>

                        {/* Settings Panel */}
                        <div className="space-y-6">
                            {/* Watermark Settings */}
                            <div className="glass-panel p-6">
                                <h3 className="text-lg font-semibold mb-4">Watermark</h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm text-[var(--text-muted)] mb-2 block">Watermark Text</label>
                                        <input
                                            type="text"
                                            value={watermarkText}
                                            onChange={(e) => setWatermarkText(e.target.value)}
                                            className="input"
                                            placeholder="Your brand name"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm text-[var(--text-muted)] mb-2 block">Position</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {positionOptions.map(pos => (
                                                <button
                                                    key={pos.value}
                                                    onClick={() => setWatermarkPosition(pos.value)}
                                                    className={`py-2 px-3 rounded-lg text-sm transition-all ${watermarkPosition === pos.value
                                                            ? "bg-[var(--accent-primary)] text-white"
                                                            : "bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
                                                        }`}
                                                >
                                                    {pos.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quality Settings */}
                            <div className="glass-panel p-6">
                                <h3 className="text-lg font-semibold mb-4">Quality Settings</h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm text-[var(--text-muted)] mb-2 block">Resolution</label>
                                        <div className="toggle-group w-full">
                                            {(["720p", "1080p", "4k"] as const).map(res => (
                                                <button
                                                    key={res}
                                                    onClick={() => setResolution(res)}
                                                    className={`toggle-item flex-1 ${resolution === res ? "active" : ""}`}
                                                >
                                                    {res}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between py-2">
                                        <span className="text-sm">Audio Sync Enhancement</span>
                                        <button
                                            onClick={() => setAudioSync(!audioSync)}
                                            className={`w-12 h-6 rounded-full transition-colors ${audioSync ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-tertiary)]"
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${audioSync ? "translate-x-6" : "translate-x-0.5"
                                                }`}></div>
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between py-2">
                                        <span className="text-sm">Add Intro Sequence</span>
                                        <button
                                            onClick={() => setAddIntro(!addIntro)}
                                            className={`w-12 h-6 rounded-full transition-colors ${addIntro ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-tertiary)]"
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${addIntro ? "translate-x-6" : "translate-x-0.5"
                                                }`}></div>
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between py-2">
                                        <span className="text-sm">Add Outro Sequence</span>
                                        <button
                                            onClick={() => setAddOutro(!addOutro)}
                                            className={`w-12 h-6 rounded-full transition-colors ${addOutro ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-tertiary)]"
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${addOutro ? "translate-x-6" : "translate-x-0.5"
                                                }`}></div>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Render Progress */}
                            {isRendering && (
                                <div className="glass-panel p-6 animate-fade-in">
                                    <h3 className="text-lg font-semibold mb-4">Rendering...</h3>
                                    <div className="space-y-4">
                                        <div className="progress-bar h-3">
                                            <div
                                                className="progress-bar-fill"
                                                style={{ width: `${renderProgress}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-[var(--text-muted)]">{renderPhase}</span>
                                            <span className="text-[var(--accent-primary)] font-medium">{Math.round(renderProgress)}%</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Render Button */}
                            {!isComplete ? (
                                <button
                                    onClick={startRender}
                                    disabled={isRendering}
                                    className={`btn btn-primary w-full text-lg py-4 ${isRendering ? "opacity-70" : ""}`}
                                >
                                    {isRendering ? (
                                        <>
                                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Rendering...
                                        </>
                                    ) : (
                                        <>
                                            🚀 Render Final Video
                                        </>
                                    )}
                                </button>
                            ) : (
                                <Link href="/export" className="btn btn-primary w-full text-lg py-4">
                                    ✨ Continue to Export
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function RenderPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-6 relative">
                        <div className="absolute inset-0 rounded-full border-4 border-[var(--bg-tertiary)]"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-[var(--accent-primary)] border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-[var(--text-muted)]">Loading...</p>
                </div>
            </div>
        }>
            <RenderContent />
        </Suspense>
    );
}
