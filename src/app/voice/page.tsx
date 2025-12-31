"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface Scene {
    id: number;
    title: string;
    content: string;
    duration: number;
}

interface VoiceOption {
    id: string;
    name: string;
    gender: "male" | "female";
    accent: string;
    style: string;
    preview: string;
}

interface SceneAudio {
    sceneId: number;
    voiceId: string;
    speed: number;
    isGenerating: boolean;
    isGenerated: boolean;
    audioUrl?: string;
    audioBlob?: Blob;
    error?: string;
}

// Gemini TTS available voices
const voiceOptions: VoiceOption[] = [
    { id: "Kore", name: "Kore", gender: "female", accent: "American", style: "Warm & Professional", preview: "🎙️" },
    { id: "Charon", name: "Charon", gender: "male", accent: "American", style: "Deep & Authoritative", preview: "🔊" },
    { id: "Fenrir", name: "Fenrir", gender: "male", accent: "American", style: "Energetic & Youthful", preview: "⚡" },
    { id: "Aoede", name: "Aoede", gender: "female", accent: "American", style: "Soft & Soothing", preview: "🌙" },
    { id: "Puck", name: "Puck", gender: "male", accent: "British", style: "Playful & Expressive", preview: "🎭" },
    { id: "Leda", name: "Leda", gender: "female", accent: "British", style: "Clear & Articulate", preview: "🎵" },
    { id: "Orus", name: "Orus", gender: "male", accent: "American", style: "Rich & Narrative", preview: "📖" },
    { id: "Zephyr", name: "Zephyr", gender: "male", accent: "Neutral", style: "Calm & Gentle", preview: "🌊" },
];

// Convert PCM to WAV
function pcmToWav(pcmData: Uint8Array, sampleRate: number = 24000, numChannels: number = 1, bitsPerSample: number = 16): Blob {
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmData.length;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, "data");
    view.setUint32(40, dataSize, true);

    const wavData = new Uint8Array(buffer);
    wavData.set(pcmData, 44);

    return new Blob([wavData], { type: "audio/wav" });
}

function VoiceContent() {
    const searchParams = useSearchParams();
    const orientation = searchParams.get("orientation") || "portrait";
    const title = searchParams.get("title") || "Untitled Story";

    const [scenes, setScenes] = useState<Scene[]>([]);
    const [globalVoice, setGlobalVoice] = useState<string>("Kore");
    const [globalSpeed, setGlobalSpeed] = useState<number>(1);
    const [sceneAudios, setSceneAudios] = useState<SceneAudio[]>([]);
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);
    const [expandedVoice, setExpandedVoice] = useState<string | null>(null);
    const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        try {
            const scenesParam = searchParams.get("scenes");
            if (scenesParam) {
                const parsedScenes = JSON.parse(decodeURIComponent(scenesParam));
                setScenes(parsedScenes);
                setSceneAudios(parsedScenes.map((s: Scene) => ({
                    sceneId: s.id,
                    voiceId: "Kore",
                    speed: 1,
                    isGenerating: false,
                    isGenerated: false,
                })));
            }
        } catch (e) {
            console.error("Failed to parse scenes", e);
        }
    }, [searchParams]);

    const generateAudioForScene = async (sceneId: number) => {
        const scene = scenes.find(s => s.id === sceneId);
        const sceneAudio = sceneAudios.find(sa => sa.sceneId === sceneId);
        if (!scene || !sceneAudio) return;

        setSceneAudios(prev => prev.map(sa =>
            sa.sceneId === sceneId ? { ...sa, isGenerating: true, error: undefined } : sa
        ));

        try {
            const response = await fetch("/api/generate-voice", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: scene.content,
                    voiceName: sceneAudio.voiceId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.details || errorData.error || "Failed to generate voice");
            }

            const data = await response.json();

            // Convert base64 to Uint8Array
            const binaryString = atob(data.audioData);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Convert PCM to WAV
            const wavBlob = pcmToWav(bytes);
            const audioUrl = URL.createObjectURL(wavBlob);

            setSceneAudios(prev => prev.map(sa =>
                sa.sceneId === sceneId
                    ? { ...sa, isGenerating: false, isGenerated: true, audioUrl, audioBlob: wavBlob }
                    : sa
            ));
        } catch (err) {
            console.error("Voice generation error:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to generate";
            setSceneAudios(prev => prev.map(sa =>
                sa.sceneId === sceneId ? { ...sa, isGenerating: false, error: errorMessage } : sa
            ));
        }
    };

    // Generate audio using AI Studio browser automation (fallback)
    const generateAudioWithStudio = async (sceneId: number) => {
        const scene = scenes.find(s => s.id === sceneId);
        const sceneAudio = sceneAudios.find(sa => sa.sceneId === sceneId);
        if (!scene || !sceneAudio) return;

        setSceneAudios(prev => prev.map(sa =>
            sa.sceneId === sceneId ? { ...sa, isGenerating: true, error: undefined } : sa
        ));

        try {
            const response = await fetch("/api/generate-voice-studio", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: scene.content,
                    sceneId: sceneId,
                    voiceName: sceneAudio.voiceId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.details || errorData.error || "Failed to generate voice");
            }

            const data = await response.json();

            setSceneAudios(prev => prev.map(sa =>
                sa.sceneId === sceneId
                    ? { ...sa, isGenerating: false, isGenerated: true, audioUrl: data.audioUrl }
                    : sa
            ));
        } catch (err) {
            console.error("AI Studio voice generation error:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to generate";
            setSceneAudios(prev => prev.map(sa =>
                sa.sceneId === sceneId ? { ...sa, isGenerating: false, error: errorMessage } : sa
            ));
        }
    };

    const playAudio = (sceneId: number) => {
        const sceneAudio = sceneAudios.find(sa => sa.sceneId === sceneId);
        if (!sceneAudio?.audioUrl) return;

        if (currentlyPlaying === sceneId) {
            audioRef.current?.pause();
            setCurrentlyPlaying(null);
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            audioRef.current = new Audio(sceneAudio.audioUrl);
            audioRef.current.onended = () => setCurrentlyPlaying(null);
            audioRef.current.play();
            setCurrentlyPlaying(sceneId);
        }
    };

    const generateAllAudio = async () => {
        setIsGeneratingAll(true);

        for (const scene of scenes) {
            if (!sceneAudios.find(sa => sa.sceneId === scene.id)?.isGenerated) {
                await generateAudioForScene(scene.id);
            }
        }

        setIsGeneratingAll(false);
    };

    const updateSceneVoice = (sceneId: number, voiceId: string) => {
        setSceneAudios(prev => prev.map(sa =>
            sa.sceneId === sceneId ? { ...sa, voiceId, isGenerated: false } : sa
        ));
    };

    const updateSceneSpeed = (sceneId: number, speed: number) => {
        setSceneAudios(prev => prev.map(sa =>
            sa.sceneId === sceneId ? { ...sa, speed, isGenerated: false } : sa
        ));
    };

    const applyGlobalSettings = () => {
        setSceneAudios(prev => prev.map(sa => ({
            ...sa,
            voiceId: globalVoice,
            speed: globalSpeed,
            isGenerated: false,
        })));
    };

    const allGenerated = sceneAudios.every(sa => sa.isGenerated);
    const generatedCount = sceneAudios.filter(sa => sa.isGenerated).length;

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 glass-panel border-0 border-b border-[var(--glass-border)]">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/story" className="btn btn-ghost p-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="text-lg font-semibold text-[var(--text-primary)]">AI Voice Generation</h1>
                            <p className="text-xs text-[var(--text-muted)]">Step 3 of 5 • Generate narration audio</p>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center gap-4 text-sm">
                        <span className="text-[var(--text-muted)]">{title}</span>
                        <span className="px-3 py-1 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                            {scenes.length} scenes
                        </span>
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
                            <div className="step-dot active"></div>
                            <span className="text-sm font-medium text-[var(--accent-primary)]">Voice</span>
                        </div>
                        <div className="step-line w-12"></div>
                        <div className="step-indicator">
                            <div className="step-dot"></div>
                            <span className="text-sm text-[var(--text-muted)]">Video</span>
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
                <div className="max-w-5xl mx-auto px-6">
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Left: Voice Selection */}
                        <div className="lg:col-span-1">
                            <div className="glass-panel p-6 sticky top-32">
                                <h3 className="text-lg font-semibold mb-4">Voice Settings</h3>

                                {/* Global Voice */}
                                <div className="mb-6">
                                    <label className="text-sm text-[var(--text-muted)] mb-3 block">Default Voice</label>
                                    <div className="space-y-2">
                                        {voiceOptions.map(voice => (
                                            <button
                                                key={voice.id}
                                                onClick={() => setGlobalVoice(voice.id)}
                                                className={`w-full p-3 rounded-lg border transition-all text-left ${globalVoice === voice.id
                                                    ? "border-[var(--accent-primary)] bg-[rgba(139,92,246,0.1)]"
                                                    : "border-[var(--glass-border)] hover:border-[var(--accent-primary)]/50"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl">{voice.preview}</span>
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm">{voice.name}</p>
                                                        <p className="text-xs text-[var(--text-muted)]">
                                                            {voice.gender === "male" ? "♂" : "♀"} {voice.accent} • {voice.style}
                                                        </p>
                                                    </div>
                                                    {globalVoice === voice.id && (
                                                        <svg className="w-5 h-5 text-[var(--accent-primary)]" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Global Speed */}
                                <div className="mb-6">
                                    <label className="text-sm text-[var(--text-muted)] mb-3 block">
                                        Narration Speed: <span className="text-[var(--accent-primary)] font-medium">{globalSpeed}x</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="2"
                                        step="0.1"
                                        value={globalSpeed}
                                        onChange={(e) => setGlobalSpeed(parseFloat(e.target.value))}
                                        className="slider w-full"
                                    />
                                    <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                                        <span>Slow</span>
                                        <span>Normal</span>
                                        <span>Fast</span>
                                    </div>
                                </div>

                                {/* Apply Button */}
                                <button onClick={applyGlobalSettings} className="btn btn-secondary w-full mb-4">
                                    Apply to All Scenes
                                </button>

                                {/* Generate All */}
                                <button
                                    onClick={generateAllAudio}
                                    disabled={isGeneratingAll || allGenerated}
                                    className={`btn btn-primary w-full ${isGeneratingAll ? "opacity-70" : ""}`}
                                >
                                    {isGeneratingAll ? (
                                        <>
                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Generating...
                                        </>
                                    ) : allGenerated ? (
                                        <>✓ All Audio Ready</>
                                    ) : (
                                        <>🎙️ Generate All Audio</>
                                    )}
                                </button>

                                {/* Progress */}
                                {scenes.length > 0 && (
                                    <div className="mt-4">
                                        <div className="flex justify-between text-xs text-[var(--text-muted)] mb-2">
                                            <span>Progress</span>
                                            <span>{generatedCount}/{scenes.length}</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div
                                                className="progress-bar-fill"
                                                style={{ width: `${(generatedCount / scenes.length) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: Scene Audio List */}
                        <div className="lg:col-span-2">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold">Scene Audio</h3>
                                <span className="text-sm text-[var(--text-muted)]">
                                    Click on a scene to customize its voice
                                </span>
                            </div>

                            <div className="space-y-4">
                                {scenes.map((scene, index) => {
                                    const sceneAudio = sceneAudios.find(sa => sa.sceneId === scene.id);
                                    const voice = voiceOptions.find(v => v.id === sceneAudio?.voiceId);
                                    const isExpanded = expandedVoice === `scene-${scene.id}`;

                                    return (
                                        <div
                                            key={scene.id}
                                            className="scene-card animate-fade-in"
                                            style={{ animationDelay: `${index * 0.05}s` }}
                                        >
                                            <div
                                                className="scene-card-header cursor-pointer"
                                                onClick={() => setExpandedVoice(isExpanded ? null : `scene-${scene.id}`)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="scene-number">{scene.title}</span>
                                                    <span className="text-xs text-[var(--text-muted)]">
                                                        {voice?.name || "No voice"} • {sceneAudio?.speed || 1}x
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {sceneAudio?.isGenerated && (
                                                        <span className="text-xs text-green-400 flex items-center gap-1">
                                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                            </svg>
                                                            Ready
                                                        </span>
                                                    )}
                                                    {sceneAudio?.isGenerating && (
                                                        <span className="text-xs text-[var(--accent-primary)] flex items-center gap-1">
                                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            Generating...
                                                        </span>
                                                    )}
                                                    <svg
                                                        className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>

                                            <div className="scene-card-body">
                                                {/* Scene Text Preview */}
                                                <p className="text-sm text-[var(--text-muted)] mb-4 line-clamp-2">
                                                    "{scene.content}"
                                                </p>

                                                {/* Audio Waveform (simulated) */}
                                                {sceneAudio?.isGenerated && (
                                                    <div className="flex items-center gap-3 p-3 bg-[var(--bg-secondary)] rounded-lg mb-4">
                                                        <button
                                                            onClick={() => playAudio(scene.id)}
                                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white hover:scale-105 transition-transform ${currentlyPlaying === scene.id ? 'bg-green-500' : 'bg-[var(--accent-primary)]'}`}
                                                        >
                                                            {currentlyPlaying === scene.id ? (
                                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                        <div className="flex-1 waveform">
                                                            {Array.from({ length: 30 }).map((_, i) => (
                                                                <div
                                                                    key={i}
                                                                    className="waveform-bar"
                                                                    style={{
                                                                        height: `${Math.random() * 100}%`,
                                                                        animationDelay: `${i * 0.05}s`
                                                                    }}
                                                                ></div>
                                                            ))}
                                                        </div>
                                                        <span className="text-xs text-[var(--text-muted)]">~{scene.duration}s</span>
                                                    </div>
                                                )}

                                                {/* Expanded Controls */}
                                                {isExpanded && (
                                                    <div className="border-t border-[var(--glass-border)] pt-4 mt-4 animate-fade-in">
                                                        {/* Error Display */}
                                                        {sceneAudio?.error && (
                                                            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
                                                                <p className="font-medium">⚠️ Generation Failed</p>
                                                                <p className="text-xs mt-1">{sceneAudio.error}</p>
                                                            </div>
                                                        )}

                                                        <div className="grid md:grid-cols-2 gap-4">
                                                            {/* Voice Override */}
                                                            <div>
                                                                <label className="text-xs text-[var(--text-muted)] mb-2 block">Voice Override</label>
                                                                <select
                                                                    value={sceneAudio?.voiceId || "journey"}
                                                                    onChange={(e) => updateSceneVoice(scene.id, e.target.value)}
                                                                    className="input text-sm"
                                                                >
                                                                    {voiceOptions.map(v => (
                                                                        <option key={v.id} value={v.id}>
                                                                            {v.name} ({v.gender === "male" ? "♂" : "♀"} {v.accent})
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            {/* Speed Override */}
                                                            <div>
                                                                <label className="text-xs text-[var(--text-muted)] mb-2 block">
                                                                    Speed: {sceneAudio?.speed || 1}x
                                                                </label>
                                                                <input
                                                                    type="range"
                                                                    min="0.5"
                                                                    max="2"
                                                                    step="0.1"
                                                                    value={sceneAudio?.speed || 1}
                                                                    onChange={(e) => updateSceneSpeed(scene.id, parseFloat(e.target.value))}
                                                                    className="slider w-full"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Generation Buttons */}
                                                        <div className="flex gap-2 mt-4">
                                                            <button
                                                                onClick={() => generateAudioForScene(scene.id)}
                                                                disabled={sceneAudio?.isGenerating}
                                                                className="btn btn-primary flex-1"
                                                            >
                                                                {sceneAudio?.isGenerating ? "Generating..." : "🎙️ API Generate"}
                                                            </button>
                                                            <button
                                                                onClick={() => generateAudioWithStudio(scene.id)}
                                                                disabled={sceneAudio?.isGenerating}
                                                                className="btn btn-secondary flex-1"
                                                                title="Opens AI Studio automatically to generate"
                                                            >
                                                                {sceneAudio?.isGenerating ? "..." : "🤖 Auto (AI Studio)"}
                                                            </button>
                                                        </div>

                                                        <p className="text-xs text-[var(--text-muted)] mt-2">
                                                            💡 If API fails, try &quot;Auto (AI Studio)&quot; which opens Chrome and generates automatically
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Bottom Action Bar */}
            <div className="sticky bottom-0 glass-panel border-0 border-t border-[var(--glass-border)] py-4">
                <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
                    <Link href="/story" className="btn btn-secondary">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Story
                    </Link>
                    <div className="flex gap-3">
                        {/* Skip Voice - Go directly to Video */}
                        {!allGenerated && (
                            <Link
                                href={`/video?scenes=${encodeURIComponent(JSON.stringify(scenes))}&title=${encodeURIComponent(title)}&orientation=${orientation}`}
                                className="btn btn-secondary"
                            >
                                Skip Voice →
                            </Link>
                        )}
                        <Link
                            href={`/video?scenes=${encodeURIComponent(JSON.stringify(scenes))}&title=${encodeURIComponent(title)}&orientation=${orientation}`}
                            className={`btn btn-primary ${!allGenerated ? "opacity-75" : ""}`}
                        >
                            {allGenerated ? "Generate Video Segments" : "Continue to Video"}
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function VoicePage() {
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
            <VoiceContent />
        </Suspense>
    );
}
