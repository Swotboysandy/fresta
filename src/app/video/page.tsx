"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface Scene {
    id: number;
    title: string;
    content: string;
    duration: number;
}

interface VideoSegment {
    sceneId: number;
    status: "pending" | "generating" | "ready" | "error";
    progress: number;
    thumbnailUrl?: string;
    imageDataUrl?: string;
    videoUrl?: string;
    uploadedVideoUrl?: string;
    visualPrompt: string;
    error?: string;
}

// Simulated thumbnail colors for each scene
const thumbnailColors = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
];

function VideoContent() {
    const searchParams = useSearchParams();
    const orientation = searchParams.get("orientation") || "portrait";
    const title = searchParams.get("title") || "Untitled Story";

    const [scenes, setScenes] = useState<Scene[]>([]);
    const [segments, setSegments] = useState<VideoSegment[]>([]);
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);
    const [activeSegment, setActiveSegment] = useState<number | null>(null);

    useEffect(() => {
        try {
            const scenesParam = searchParams.get("scenes");
            if (scenesParam) {
                const parsedScenes = JSON.parse(decodeURIComponent(scenesParam));
                setScenes(parsedScenes);
                setSegments(parsedScenes.map((s: Scene, i: number) => ({
                    sceneId: s.id,
                    status: "pending",
                    progress: 0,
                    visualPrompt: `Generate a cinematic ${orientation === "portrait" ? "vertical" : "widescreen"} visual for: ${s.content.substring(0, 100)}...`,
                    thumbnailUrl: thumbnailColors[i % thumbnailColors.length],
                })));
            }
        } catch (e) {
            console.error("Failed to parse scenes", e);
        }
    }, [searchParams, orientation]);

    const generateSegment = async (sceneId: number) => {
        const segment = segments.find(seg => seg.sceneId === sceneId);
        if (!segment) return;

        setSegments(prev => prev.map(seg =>
            seg.sceneId === sceneId ? { ...seg, status: "generating", progress: 10, error: undefined } : seg
        ));

        try {
            // Update progress
            setSegments(prev => prev.map(seg =>
                seg.sceneId === sceneId ? { ...seg, progress: 30 } : seg
            ));

            const response = await fetch("/api/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: segment.visualPrompt,
                    aspectRatio: orientation === "portrait" ? "9:16" : "16:9",
                }),
            });

            setSegments(prev => prev.map(seg =>
                seg.sceneId === sceneId ? { ...seg, progress: 70 } : seg
            ));

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to generate image");
            }

            const data = await response.json();
            const imageDataUrl = `data:${data.mimeType};base64,${data.imageData}`;

            setSegments(prev => prev.map(seg =>
                seg.sceneId === sceneId
                    ? { ...seg, status: "ready", progress: 100, imageDataUrl, thumbnailUrl: imageDataUrl }
                    : seg
            ));
        } catch (err) {
            console.error("Image generation error:", err);
            setSegments(prev => prev.map(seg =>
                seg.sceneId === sceneId
                    ? { ...seg, status: "error", progress: 0, error: err instanceof Error ? err.message : "Failed to generate" }
                    : seg
            ));
        }
    };

    const generateAllSegments = async () => {
        setIsGeneratingAll(true);

        for (const scene of scenes) {
            const segment = segments.find(s => s.sceneId === scene.id);
            if (segment?.status !== "ready") {
                await generateSegment(scene.id);
            }
        }

        setIsGeneratingAll(false);
    };

    const updateVisualPrompt = (sceneId: number, prompt: string) => {
        setSegments(prev => prev.map(seg =>
            seg.sceneId === sceneId ? { ...seg, visualPrompt: prompt, status: "pending", progress: 0 } : seg
        ));
    };

    // Automated Google Flow video generation
    const generateVideoWithFlow = async (sceneId: number) => {
        const segment = segments.find(seg => seg.sceneId === sceneId);
        if (!segment) return;

        // Update status to generating
        setSegments(prev => prev.map(seg =>
            seg.sceneId === sceneId
                ? { ...seg, status: "generating", progress: 10, error: undefined }
                : seg
        ));

        try {
            // Update progress to show we're starting automation
            setSegments(prev => prev.map(seg =>
                seg.sceneId === sceneId ? { ...seg, progress: 20 } : seg
            ));

            // Call the automated generation API
            const response = await fetch("/api/generate-video-flow", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: segment.visualPrompt,
                    sceneId: sceneId,
                    orientation: orientation,
                }),
            });

            // Update progress while waiting
            setSegments(prev => prev.map(seg =>
                seg.sceneId === sceneId ? { ...seg, progress: 50 } : seg
            ));

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to generate video");
            }

            const data = await response.json();

            // Video generated successfully!
            setSegments(prev => prev.map(seg =>
                seg.sceneId === sceneId
                    ? {
                        ...seg,
                        status: "ready",
                        progress: 100,
                        uploadedVideoUrl: data.videoUrl
                    }
                    : seg
            ));

        } catch (err) {
            console.error("Video generation error:", err);
            setSegments(prev => prev.map(seg =>
                seg.sceneId === sceneId
                    ? {
                        ...seg,
                        status: "error",
                        progress: 0,
                        error: err instanceof Error ? err.message : "Failed to generate video"
                    }
                    : seg
            ));
        }
    };

    // Generate all videos with Google Flow (sequential to avoid rate limiting)
    const generateAllWithFlow = async () => {
        setIsGeneratingAll(true);

        for (const scene of scenes) {
            const segment = segments.find(s => s.sceneId === scene.id);
            if (segment?.status !== "ready") {
                await generateVideoWithFlow(scene.id);
                // Small delay between generations to be respectful
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        setIsGeneratingAll(false);
    };

    // Open Google Flow manually (fallback)
    const openInGoogleFlow = (sceneId: number) => {
        const segment = segments.find(seg => seg.sceneId === sceneId);
        if (!segment) return;

        // Create the Google Flow URL with the prompt
        const flowUrl = `https://labs.google/fx/tools/flow?prompt=${encodeURIComponent(segment.visualPrompt)}`;

        // Open in a new tab
        window.open(flowUrl, '_blank', 'noopener,noreferrer');
    };

    // Handle video upload from Google Flow
    const handleVideoUpload = (sceneId: number, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate it's a video file
        if (!file.type.startsWith('video/')) {
            alert('Please upload a video file');
            return;
        }

        // Create a local URL for the video
        const videoUrl = URL.createObjectURL(file);

        setSegments(prev => prev.map(seg =>
            seg.sceneId === sceneId
                ? { ...seg, status: "ready", progress: 100, uploadedVideoUrl: videoUrl }
                : seg
        ));
    };

    // Copy prompt to clipboard
    const copyPromptToClipboard = async (sceneId: number) => {
        const segment = segments.find(seg => seg.sceneId === sceneId);
        if (!segment) return;

        try {
            await navigator.clipboard.writeText(segment.visualPrompt);
            // Could add a toast notification here
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const allReady = segments.every(seg => seg.status === "ready");
    const readyCount = segments.filter(seg => seg.status === "ready").length;
    const totalProgress = segments.reduce((acc, seg) => acc + seg.progress, 0) / Math.max(segments.length, 1);

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 glass-panel border-0 border-b border-[var(--glass-border)]">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/voice" className="btn btn-ghost p-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="text-lg font-semibold text-[var(--text-primary)]">AI Video Creation</h1>
                            <p className="text-xs text-[var(--text-muted)]">Step 4 of 5 • Generate video segments</p>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center gap-4 text-sm">
                        <span className="text-[var(--text-muted)]">{title}</span>
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
                            <div className="step-dot active"></div>
                            <span className="text-sm font-medium text-[var(--accent-primary)]">Video</span>
                        </div>
                        <div className="step-line w-12"></div>
                        <div className="step-indicator">
                            <div className="step-dot"></div>
                            <span className="text-sm text-[var(--text-muted)]">Export</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 py-8">
                <div className="max-w-6xl mx-auto px-6">
                    {/* Progress Bar */}
                    <div className="glass-panel p-6 mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-semibold">Overall Progress</h3>
                                <p className="text-sm text-[var(--text-muted)]">
                                    {readyCount}/{segments.length} segments ready
                                </p>
                            </div>
                            <div className="flex gap-3">
                                {/* Primary: Google Flow Automation */}
                                <button
                                    onClick={generateAllWithFlow}
                                    disabled={isGeneratingAll || allReady}
                                    className={`btn bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white ${isGeneratingAll ? "opacity-70" : ""}`}
                                >
                                    {isGeneratingAll ? (
                                        <>
                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Generating Videos...
                                        </>
                                    ) : allReady ? (
                                        <>✓ All Videos Ready</>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                            </svg>
                                            🎬 Generate All with Google Flow
                                        </>
                                    )}
                                </button>

                                {/* Secondary: Image generation fallback */}
                                <button
                                    onClick={generateAllSegments}
                                    disabled={isGeneratingAll || allReady}
                                    className={`btn btn-secondary ${isGeneratingAll ? "opacity-70" : ""}`}
                                    title="Generate images only (fallback)"
                                >
                                    🖼️ Images Only
                                </button>
                            </div>
                        </div>

                        {/* Info Note */}
                        <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
                            <p className="mb-2">
                                💡 <strong>Auto-Generation:</strong> A new Chrome window will open to automate Google Flow.
                            </p>
                            <ul className="list-disc list-inside text-xs space-y-1 text-blue-300/80">
                                <li><strong>First time?</strong> You&apos;ll need to sign in to Google in the automation window</li>
                                <li>Requires Google AI Pro/Ultra subscription for video generation</li>
                                <li>Each video takes 2-5 minutes to generate</li>
                                <li>You can keep using this browser (Edge/Firefox recommended) while Chrome automates</li>
                            </ul>
                        </div>

                        <div className="progress-bar h-2">
                            <div
                                className="progress-bar-fill"
                                style={{ width: `${totalProgress}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Segment Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {segments.map((segment, index) => {
                            const scene = scenes.find(s => s.id === segment.sceneId);
                            const isActive = activeSegment === segment.sceneId;

                            return (
                                <div
                                    key={segment.sceneId}
                                    className={`scene-card overflow-hidden animate-fade-in ${isActive ? "ring-2 ring-[var(--accent-primary)]" : ""}`}
                                    style={{ animationDelay: `${index * 0.05}s` }}
                                >
                                    {/* Thumbnail */}
                                    <div
                                        className={`relative ${orientation === "portrait" ? "aspect-[9/16]" : "aspect-video"}`}
                                        style={{
                                            background: (segment.imageDataUrl || segment.uploadedVideoUrl) ? undefined : segment.thumbnailUrl,
                                            minHeight: orientation === "portrait" ? "200px" : "auto"
                                        }}
                                    >
                                        {/* Show uploaded video */}
                                        {segment.uploadedVideoUrl && (
                                            <video
                                                src={segment.uploadedVideoUrl}
                                                className="absolute inset-0 w-full h-full object-cover"
                                                muted
                                                loop
                                                playsInline
                                                onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                                                onMouseLeave={(e) => (e.target as HTMLVideoElement).pause()}
                                            />
                                        )}

                                        {/* Show generated image (when no video) */}
                                        {segment.imageDataUrl && !segment.uploadedVideoUrl && (
                                            <img
                                                src={segment.imageDataUrl}
                                                alt={`Scene ${segment.sceneId}`}
                                                className="absolute inset-0 w-full h-full object-cover"
                                            />
                                        )}

                                        {/* Status Overlay */}
                                        <div className={`absolute inset-0 flex items-center justify-center ${segment.status === "ready" ? "bg-black/20" : "bg-black/40"}`}>
                                            {segment.status === "pending" && (
                                                <div className="text-center">
                                                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-2 mx-auto">
                                                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    </div>
                                                    <span className="text-white text-sm">Pending</span>
                                                </div>
                                            )}
                                            {segment.status === "generating" && (
                                                <div className="text-center">
                                                    <div className="relative w-16 h-16 mb-2 mx-auto">
                                                        <svg className="w-16 h-16 animate-spin" viewBox="0 0 100 100">
                                                            <circle
                                                                className="text-white/20"
                                                                strokeWidth="8"
                                                                stroke="currentColor"
                                                                fill="transparent"
                                                                r="42"
                                                                cx="50"
                                                                cy="50"
                                                            />
                                                            <circle
                                                                className="text-white"
                                                                strokeWidth="8"
                                                                strokeLinecap="round"
                                                                stroke="currentColor"
                                                                fill="transparent"
                                                                r="42"
                                                                cx="50"
                                                                cy="50"
                                                                strokeDasharray={`${segment.progress * 2.64} 264`}
                                                            />
                                                        </svg>
                                                        <span className="absolute inset-0 flex items-center justify-center text-white font-bold">
                                                            {segment.progress}%
                                                        </span>
                                                    </div>
                                                    <span className="text-white text-sm">Generating Image...</span>
                                                </div>
                                            )}
                                            {segment.status === "ready" && !segment.imageDataUrl && !segment.uploadedVideoUrl && (
                                                <div className="text-center">
                                                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center mb-2 mx-auto">
                                                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                    <span className="text-white text-sm">Ready</span>
                                                </div>
                                            )}
                                            {segment.uploadedVideoUrl && (
                                                <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-medium flex items-center gap-1">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                    Google Flow
                                                </div>
                                            )}
                                            {segment.status === "error" && (
                                                <div className="text-center">
                                                    <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center mb-2 mx-auto">
                                                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </div>
                                                    <span className="text-white text-sm">Error</span>
                                                    {segment.error && (
                                                        <p className="text-white/70 text-xs mt-1 max-w-[150px] mx-auto">{segment.error}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Scene Number Badge */}
                                        <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/50 text-white text-xs font-medium">
                                            {scene?.title}
                                        </div>
                                    </div>

                                    {/* Controls */}
                                    <div className="p-4">
                                        <p className="text-sm text-[var(--text-muted)] line-clamp-2 mb-3">
                                            {scene?.content.substring(0, 80)}...
                                        </p>

                                        {/* Automated Google Flow Button - Primary Action */}
                                        <button
                                            onClick={() => generateVideoWithFlow(segment.sceneId)}
                                            disabled={segment.status === "generating"}
                                            className={`w-full btn bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs py-2.5 mb-2 flex items-center justify-center gap-2 ${segment.status === "generating" ? "opacity-70" : ""}`}
                                        >
                                            {segment.status === "generating" ? (
                                                <>
                                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Generating Video...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                                    </svg>
                                                    🤖 Auto-Generate with Flow
                                                </>
                                            )}
                                        </button>

                                        {/* Manual and Upload Options */}
                                        <div className="flex gap-2 mb-2">
                                            <button
                                                onClick={() => openInGoogleFlow(segment.sceneId)}
                                                className="flex-1 btn btn-secondary text-xs py-2 flex items-center justify-center gap-1"
                                                title="Open Google Flow manually"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                                Manual
                                            </button>
                                            <label
                                                htmlFor={`video-upload-${segment.sceneId}`}
                                                className="flex-1 btn btn-secondary text-xs py-2 flex items-center justify-center gap-1 cursor-pointer"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                </svg>
                                                {segment.uploadedVideoUrl ? "Replace" : "Upload"}
                                            </label>
                                            <input
                                                id={`video-upload-${segment.sceneId}`}
                                                type="file"
                                                accept="video/*"
                                                className="hidden"
                                                onChange={(e) => handleVideoUpload(segment.sceneId, e)}
                                            />
                                        </div>

                                        {/* Show uploaded video indicator */}
                                        {segment.uploadedVideoUrl && (
                                            <div className="mb-2 p-2 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span className="text-xs text-green-400">Video uploaded!</span>
                                            </div>
                                        )}

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setActiveSegment(isActive ? null : segment.sceneId)}
                                                className="btn btn-ghost text-xs flex-1 py-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => copyPromptToClipboard(segment.sceneId)}
                                                className="btn btn-ghost text-xs flex-1 py-2"
                                                title="Copy prompt to clipboard"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                                Copy
                                            </button>
                                            <button
                                                onClick={() => generateSegment(segment.sceneId)}
                                                disabled={segment.status === "generating"}
                                                className="btn btn-ghost text-xs flex-1 py-2"
                                                title="Generate image (fallback)"
                                            >
                                                <svg className={`w-4 h-4 ${segment.status === "generating" ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                Image
                                            </button>
                                        </div>

                                        {/* Edit Prompt Section */}
                                        {isActive && (
                                            <div className="mt-4 pt-4 border-t border-[var(--glass-border)] animate-fade-in">
                                                <label className="text-xs text-[var(--text-muted)] mb-2 block">Visual Prompt for Google Flow</label>
                                                <textarea
                                                    value={segment.visualPrompt}
                                                    onChange={(e) => updateVisualPrompt(segment.sceneId, e.target.value)}
                                                    className="w-full h-24 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-lg p-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] resize-none"
                                                    placeholder="Describe the video scene you want to generate..."
                                                />
                                                <p className="text-xs text-[var(--text-muted)] mt-2">
                                                    💡 Tip: Click &quot;Open in Google Flow&quot; to generate this video with your Google account
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* Bottom Action Bar */}
            <div className="sticky bottom-0 glass-panel border-0 border-t border-[var(--glass-border)] py-4">
                <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
                    <Link href="/voice" className="btn btn-secondary">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Voice
                    </Link>
                    <Link
                        href={`/render?segments=${segments.length}&title=${encodeURIComponent(title)}&orientation=${orientation}`}
                        className={`btn btn-primary ${!allReady ? "opacity-50 pointer-events-none" : ""}`}
                    >
                        Merge All Segments
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function VideoPage() {
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
            <VideoContent />
        </Suspense>
    );
}
