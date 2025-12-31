"use client";

import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";

interface Scene {
    id: number;
    title: string;
    content: string;
    duration: number;
}

interface GenerationStatus {
    story: "pending" | "generating" | "done" | "error";
    voice: "pending" | "generating" | "done" | "error" | "skipped";
    video: "pending" | "generating" | "done" | "error";
    validation: "pending" | "validating" | "passed" | "failed" | "skipped";
    merge: "pending" | "generating" | "done" | "error";
}

interface SceneProgress {
    sceneId: number;
    voiceStatus: "pending" | "generating" | "done" | "error" | "needs_upload";
    videoStatus: "pending" | "generating" | "done" | "error";
    voiceUrl?: string;
    videoUrl?: string;
}

interface ValidationResult {
    passed: boolean;
    score: number;
    checks: {
        name: string;
        passed: boolean;
        message: string;
        severity: "error" | "warning" | "info";
    }[];
    recommendations: string[];
}

// Fixed voice configuration - Kore (Female, Warm & Professional)
const VOICE_CONFIG = {
    voiceName: "Kore",
    displayName: "Kore (Hindi)",
    description: "Female • Warm & Professional • Hindi Support",
};

function AutomationContent() {
    const searchParams = useSearchParams();

    const [genre, setGenre] = useState<string>("");
    const [theme, setTheme] = useState<string>("");
    const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
    const [projectName, setProjectName] = useState<string>("");

    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [status, setStatus] = useState<GenerationStatus>({
        story: "pending",
        voice: "pending",
        video: "pending",
        validation: "pending",
        merge: "pending",
    });

    const [scenes, setScenes] = useState<Scene[]>([]);
    const [sceneProgress, setSceneProgress] = useState<SceneProgress[]>([]);
    const [currentStep, setCurrentStep] = useState<string>("");
    const [logs, setLogs] = useState<string[]>([]);
    const [finalVideoUrl, setFinalVideoUrl] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [autoStarted, setAutoStarted] = useState(false);
    const [manualUpload, setManualUpload] = useState<Scene | null>(null);
    const [isWaitingForManual, setIsWaitingForManual] = useState(false);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

    // Settings
    const [useAIStudioAudio, setUseAIStudioAudio] = useState(true);
    const [skipAudio, setSkipAudio] = useState(false);
    const [addWatermark, setAddWatermark] = useState(true);
    const [watermarkText, setWatermarkText] = useState("StoryForge AI");
    const [autoValidate, setAutoValidate] = useState(true);

    const addLog = useCallback((message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    }, []);

    // Manual upload handling (Ref to track status within async loop)
    const manualUploadRef = useRef<{ active: boolean; sceneId: number | null }>({ active: false, sceneId: null });

    // Function to check if manual upload is finished
    const waitForManualUpload = async (sceneId: number) => {
        setManualUpload(scenes.find(s => s.id === sceneId) || null);
        setIsWaitingForManual(true);
        manualUploadRef.current = { active: true, sceneId };

        return new Promise<void>((resolve) => {
            const checkInterval = setInterval(() => {
                if (!manualUploadRef.current.active) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 500);
        });
    };

    const handleManualUpload = async (file: File, targetSceneId?: number) => {
        const idToUse = targetSceneId ?? manualUpload?.id;
        if (!idToUse) return;

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("sceneId", idToUse.toString());

            const response = await fetch("/api/upload-audio", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();

                // Update progress
                setSceneProgress(prev => prev.map(sp =>
                    sp.sceneId === idToUse ? { ...sp, voiceStatus: "done", voiceUrl: data.audioUrl } : sp
                ));

                addLog(`✅ Scene ${idToUse}: Voice uploaded manually`);

                // Clear manual state if it was active
                if (manualUpload?.id === idToUse) {
                    setManualUpload(null);
                    setIsWaitingForManual(false);
                    manualUploadRef.current = { active: false, sceneId: null };
                }
            } else {
                addLog(`❌ Upload failed: ${response.statusText}`);
            }
        } catch (err) {
            addLog(`❌ Upload error: ${err}`);
        }
    };


    // Auto-start if URL parameters are provided
    useEffect(() => {
        const urlGenre = searchParams.get("genre");
        const urlTheme = searchParams.get("theme");
        const urlOrientation = searchParams.get("orientation") as "portrait" | "landscape" | null;

        if (urlGenre && urlTheme && !autoStarted) {
            setGenre(urlGenre);
            setTheme(urlTheme);
            if (urlOrientation) setOrientation(urlOrientation);
            setAutoStarted(true);
        }
    }, [searchParams, autoStarted]);



    // Generate project name from theme
    useEffect(() => {
        if (theme && !projectName) {
            const name = theme
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, "")
                .split(" ")
                .slice(0, 3)
                .join("-");
            setProjectName(name || "story-project");
        }
    }, [theme, projectName]);

    // STEP 1: Generate Story
    const generateStory = async (): Promise<Scene[]> => {
        setStatus(prev => ({ ...prev, story: "generating" }));
        setCurrentStep("Generating story with AI...");
        addLog(`📝 Generating ${genre} story: "${theme}"`);

        try {
            const response = await fetch("/api/generate-story", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ genre, theme }),
            });

            if (!response.ok) throw new Error("Story generation failed");

            const data = await response.json();
            const generatedScenes = data.scenes || [];

            setScenes(generatedScenes);
            setSceneProgress(generatedScenes.map((s: Scene) => ({
                sceneId: s.id,
                voiceStatus: "pending",
                videoStatus: "pending",
            })));

            setStatus(prev => ({ ...prev, story: "done" }));
            addLog(`✅ Story generated: ${generatedScenes.length} scenes`);

            // Log each scene
            generatedScenes.forEach((s: Scene, i: number) => {
                addLog(`   Scene ${i + 1}: "${s.title}" (${s.duration}s)`);
            });

            return generatedScenes;
        } catch (err) {
            setStatus(prev => ({ ...prev, story: "error" }));
            throw err;
        }
    };

    // STEP 2a: Generate Voice using Gemini API
    const generateVoiceAPI = async (scene: Scene): Promise<string | null> => {
        try {
            const response = await fetch("/api/generate-voice", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: scene.content,
                    voiceName: VOICE_CONFIG.voiceName,
                    sceneId: scene.id,
                    genre: genre, // Pass genre for voice styling
                }),
            });

            const data = await response.json();

            if (response.ok && data.audioData) {
                // Convert base64 PCM to WAV blob URL
                const binaryString = atob(data.audioData);
                const bytes = new Uint8Array(binaryString.length);
                for (let j = 0; j < binaryString.length; j++) {
                    bytes[j] = binaryString.charCodeAt(j);
                }
                const wavBlob = pcmToWav(bytes);
                const audioUrl = URL.createObjectURL(wavBlob);
                return audioUrl;
            }

            // Check if rate limited
            if (data.fallback || response.status === 503 || response.status === 429) {
                // addLog(`   ⚠️ Scene ${scene.id}: API rate limited`); // SILENCED to avoid spam, main loop handles logging
            }

            return null;
        } catch (err) {
            addLog(`   ⚠️ Scene ${scene.id}: Audio generation error`);
            return null;
        }
    };

    // STEP 2b: Generate Voice using AI Studio browser automation (Puppeteer)
    const generateVoiceStudio = async (scene: Scene): Promise<string | null> => {
        try {
            const response = await fetch("/api/generate-studio-puppeteer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: scene.content,
                    sceneId: scene.id,
                }),
            });
            const data = await response.json();
            if (data.success && data.audioUrl) {
                return data.audioUrl;
            }
            throw new Error(data.error || "Puppeteer failed");
        } catch (err: any) {
            addLog(`   ⚠️ Scene ${scene.id}: Puppeteer error - ${err.message}`);
            return null;
        }
    };

    // STEP 2: Generate Voice for all scenes
    const generateAllVoices = async (scenesToProcess: Scene[]): Promise<void> => {
        // Check if audio should be skipped
        if (skipAudio) {
            setStatus(prev => ({ ...prev, voice: "skipped" }));
            addLog(`⏭️ Audio generation SKIPPED (user preference)`);
            addLog(`   💡 Videos will be generated without narration`);
            // Mark all scenes as done (skipped)
            setSceneProgress(prev => prev.map(sp => ({ ...sp, voiceStatus: "done" })));
            return;
        }

        setStatus(prev => ({ ...prev, voice: "generating" }));
        setCurrentStep("Generating voice narration...");

        if (useAIStudioAudio) {
            addLog(`🎙️ Starting voice generation via AI Studio (Browser)`);
            addLog(`   📍 This will open Chrome and use your Google account`);
            addLog(`   💡 Sign in if prompted - no rate limits!`);
        } else {
            addLog(`🎙️ Starting voice generation via Gemini API`);
            addLog(`   💡 If API is rate limited, will auto-fallback to AI Studio browser`);
        }

        for (let i = 0; i < scenesToProcess.length; i++) {
            if (isPaused) {
                addLog("⏸️ Paused...");
                await new Promise(resolve => {
                    const checkPause = setInterval(() => {
                        if (!isPaused) {
                            clearInterval(checkPause);
                            resolve(true);
                        }
                    }, 1000);
                });
            }

            const scene = scenesToProcess[i];

            // Skip if already done
            const currentProgress = sceneProgress.find(sp => sp.sceneId === scene.id);
            if (currentProgress?.voiceStatus === "done") {
                addLog(`⏭️ Scene ${i + 1}: Voice already ready, skipping...`);
                continue;
            }

            setSceneProgress(prev => prev.map(sp =>
                sp.sceneId === scene.id ? { ...sp, voiceStatus: "generating" } : sp
            ));

            try {
                let audioUrl: string | null = null;
                let attempt = 1;

                // Browser Automation (Puppeteer)
                if (useAIStudioAudio) {
                    audioUrl = await generateVoiceStudio(scene);
                } else {
                    // Fallback to manual? Or error?
                    // User said "remove api part".
                    // We'll throw error if they try to run without browser mode, forcing them to use it or manual.
                    throw new Error("API mode disabled. Please enable 'Use AI Studio' or upload manually.");
                }

                if (audioUrl) {
                    setSceneProgress(prev => prev.map(sp =>
                        sp.sceneId === scene.id ? { ...sp, voiceStatus: "done", voiceUrl: audioUrl! } : sp
                    ));
                    addLog(`✅ Scene ${i + 1}: Voice ready`);
                } else {
                    throw new Error("Generation failed");
                }

            } catch (err: any) {
                // if (err.message === "PAUSED_FOR_MANUAL_UPLOAD") throw err; // Logic removed

                addLog(`❌ Scene ${i + 1}: Voice error - ${err}`);
                setSceneProgress(prev => prev.map(sp =>
                    sp.sceneId === scene.id ? { ...sp, voiceStatus: "error" } : sp
                ));
            }

            // Delay
            await new Promise(r => setTimeout(r, 1000));
        }

        setStatus(prev => ({ ...prev, voice: "done" }));
        addLog(`✅ Voice generation complete`);
    };

    // STEP 3: Generate Videos for all scenes using Google Flow
    const generateAllVideos = async (scenesToProcess: Scene[]): Promise<void> => {
        setStatus(prev => ({ ...prev, video: "generating" }));
        setCurrentStep("Generating videos with Google Flow...");
        addLog(`🎬 Starting video generation with Google Flow (Veo AI)`);
        addLog(`   📍 URL: https://labs.google/fx/tools/flow`);
        addLog(`   💡 Tip: Sign in to Google if prompted in the browser`);

        for (let i = 0; i < scenesToProcess.length; i++) {
            if (isPaused) {
                addLog("⏸️ Paused...");
                await new Promise(resolve => {
                    const checkPause = setInterval(() => {
                        if (!isPaused) {
                            clearInterval(checkPause);
                            resolve(true);
                        }
                    }, 1000);
                });
            }

            const scene = scenesToProcess[i];
            setCurrentStep(`Generating video for Scene ${i + 1}/${scenesToProcess.length}...`);
            addLog(`🎥 Scene ${i + 1}: "${scene.title}" - Opening Google Flow...`);

            setSceneProgress(prev => prev.map(sp =>
                sp.sceneId === scene.id ? { ...sp, videoStatus: "generating" } : sp
            ));

            try {
                // Build video prompt
                const videoPrompt = `Cinematic ${genre} scene: ${scene.content}. High quality, ${orientation} aspect ratio, vibrant colors, smooth camera movement.`;

                const response = await fetch("/api/generate-video-flow", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        prompt: videoPrompt,
                        sceneId: scene.id,
                        orientation: orientation,
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    setSceneProgress(prev => prev.map(sp =>
                        sp.sceneId === scene.id ? { ...sp, videoStatus: "done", videoUrl: data.videoUrl } : sp
                    ));
                    addLog(`✅ Scene ${i + 1}: Video downloaded`);
                } else {
                    throw new Error("Video generation failed");
                }
            } catch (err) {
                addLog(`❌ Scene ${i + 1}: Video generation failed`);
                setSceneProgress(prev => prev.map(sp =>
                    sp.sceneId === scene.id ? { ...sp, videoStatus: "error" } : sp
                ));
            }
        }

        setStatus(prev => ({ ...prev, video: "done" }));
        addLog(`✅ Video generation complete`);
    };

    // STEP 4: Validate Project
    const validateProject = async (): Promise<boolean> => {
        setStatus(prev => ({ ...prev, validation: "validating" }));
        setCurrentStep("Validating project...");
        addLog(`🔍 Running validation checks...`);

        try {
            // Collect current URLs
            const videoUrls: { [key: number]: string } = {};
            const audioUrls: { [key: number]: string } = {};

            sceneProgress.forEach(sp => {
                if (sp.videoUrl) videoUrls[sp.sceneId] = sp.videoUrl;
                if (sp.voiceUrl) audioUrls[sp.sceneId] = sp.voiceUrl;
            });

            const response = await fetch("/api/validate-project", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    scenes,
                    videoUrls,
                    audioUrls,
                    projectName,
                    orientation,
                }),
            });

            const result: ValidationResult = await response.json();
            setValidationResult(result);

            // Log each check
            result.checks.forEach(check => {
                const icon = check.passed ? "✅" : check.severity === "warning" ? "⚠️" : "❌";
                addLog(`   ${icon} ${check.name}: ${check.message}`);
            });

            addLog(`📊 Validation Score: ${result.score}/100`);

            if (result.passed) {
                setStatus(prev => ({ ...prev, validation: "passed" }));
                addLog(`✅ Project validation PASSED`);
                return true;
            } else {
                setStatus(prev => ({ ...prev, validation: "failed" }));
                addLog(`❌ Project validation FAILED - check recommendations`);
                result.recommendations.forEach(rec => {
                    addLog(`   💡 ${rec}`);
                });
                return false;
            }
        } catch (err) {
            setStatus(prev => ({ ...prev, validation: "failed" }));
            addLog(`❌ Validation error: ${err}`);
            return false;
        }
    };

    // STEP 5: Merge all videos with audio
    const mergeAllVideos = async (): Promise<void> => {
        setStatus(prev => ({ ...prev, merge: "generating" }));
        setCurrentStep("Merging videos and audio...");
        addLog(`🔗 Starting final merge...`);
        addLog(`   📦 Watermark: ${addWatermark ? watermarkText : "None"}`);
        addLog(`   📐 Orientation: ${orientation}`);

        try {
            const videoUrls = sceneProgress
                .filter(sp => sp.videoUrl)
                .map(sp => sp.videoUrl);

            const audioUrls = sceneProgress
                .filter(sp => sp.voiceUrl)
                .map(sp => sp.voiceUrl);

            if (videoUrls.length === 0) {
                throw new Error("No videos to merge");
            }

            addLog(`   🎬 Videos: ${videoUrls.length}`);
            addLog(`   🎙️ Audio tracks: ${audioUrls.length}`);

            const response = await fetch("/api/merge-videos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    videoUrls,
                    audioUrls,
                    addWatermark,
                    watermarkText,
                    orientation,
                    projectName,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setFinalVideoUrl(data.mergedVideoUrl);
                setStatus(prev => ({ ...prev, merge: "done" }));
                addLog(`✅ Final video created: ${data.mergedVideoUrl}`);
                addLog(`   📂 Size: ${(data.fileSize / 1024 / 1024).toFixed(2)} MB`);
                addLog(`   ⏱️ Duration: ${data.duration?.toFixed(1) || "N/A"}s`);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || "Merge failed");
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Unknown error";

            // If FFmpeg is not installed, provide helpful message
            if (errorMsg.includes("FFmpeg")) {
                addLog(`⚠️ FFmpeg not installed - individual videos available`);
                addLog(`   💡 Install FFmpeg for video merging: https://ffmpeg.org/download.html`);
            } else {
                addLog(`⚠️ Merge error: ${errorMsg}`);
            }

            // Still mark as done so user can download individual files
            setStatus(prev => ({ ...prev, merge: "done" }));
            addLog(`📂 Individual videos saved in: /public/generated-videos/`);
        }
    };

    // MAIN: Run full automation
    const startAutomation = async () => {
        if (!genre || !theme) {
            setError("Please select a genre and enter a theme");
            return;
        }

        setIsRunning(true);
        setIsPaused(false);
        setError("");
        if (logs.length === 0) setLogs([]); // Only clear logs if fresh start
        setValidationResult(null);

        addLog(`🚀 Starting/Resuming automation pipeline...`);
        addLog(`══════════════════════════════════════════`);

        try {
            // Step 1: Generate Story
            let currentScenes = scenes;
            if (status.story !== "done") {
                addLog(`\n[STEP 1/5] STORY GENERATION`);
                currentScenes = await generateStory();
            } else {
                addLog(`✅ Story already generated (${currentScenes.length} scenes)`);
            }

            // Step 2: Generate Voice
            if (status.voice !== "done" && status.voice !== "skipped") {
                addLog(`\n[STEP 2/5] VOICE/AUDIO GENERATION`);
                // Filter scenes that need voice
                // If we are resuming, we might have some dones.
                // The function receive ALL scenes, but internally skips 'done'?
                // Let's pass all scenes and let the function handle skipping.
                await generateAllVoices(currentScenes);
            } else {
                addLog(`✅ Voice generation already complete or skipped`);
            }

            // Step 3: Generate Videos  
            if (status.video !== "done") {
                addLog(`\n[STEP 3/5] VIDEO GENERATION`);
                await generateAllVideos(currentScenes);
            } else {
                addLog(`✅ Video generation already complete`);
            }

            // Step 4: Validate (before merge)
            if (autoValidate) {
                addLog(`\n[STEP 4/5] PROJECT VALIDATION`);
                const isValid = await validateProject();

                if (!isValid) {
                    addLog(`\n⚠️ Validation issues found. Review and fix before proceeding.`);
                    // Continue anyway but log warning
                }
            } else {
                setStatus(prev => ({ ...prev, validation: "skipped" }));
                addLog(`\n[STEP 4/5] VALIDATION SKIPPED`);
            }

            // Step 5: Merge (optional)
            addLog(`\n[STEP 5/5] MERGE & EXPORT`);
            await mergeAllVideos();

            setCurrentStep("✅ All done! Your video is ready.");
            addLog(`\n══════════════════════════════════════════`);
            addLog(`🎉 AUTOMATION COMPLETE!`);
            addLog(`══════════════════════════════════════════`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            addLog(`\n❌ Automation Failed: ${msg}`);
            setError(msg);
            setCurrentStep(`❌ Error: ${msg}`);
            setIsRunning(false);
        }
    };

    // Trigger automation after state is set from URL params
    useEffect(() => {
        if (autoStarted && genre && theme && !isRunning && status.story === "pending") {
            startAutomation();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoStarted, genre, theme]);

    // PCM to WAV converter
    function pcmToWav(pcmData: Uint8Array, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Blob {
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

    const genres = [
        { id: "sci-fi", name: "Sci-Fi", icon: "🚀" },
        { id: "fantasy", name: "Fantasy", icon: "🐉" },
        { id: "horror", name: "Horror", icon: "👻" },
        { id: "romance", name: "Romance", icon: "💕" },
        { id: "action", name: "Action", icon: "💥" },
        { id: "comedy", name: "Comedy", icon: "😂" },
        { id: "mystery", name: "Mystery", icon: "🔍" },
        { id: "drama", name: "Drama", icon: "🎭" },
    ];

    const totalScenes = scenes.length;
    const completedVoices = sceneProgress.filter(sp => sp.voiceStatus === "done").length;
    const completedVideos = sceneProgress.filter(sp => sp.videoStatus === "done").length;
    const overallProgress = totalScenes > 0
        ? Math.round(((completedVoices + completedVideos) / (totalScenes * 2)) * 100)
        : 0;

    const resetPipeline = () => {
        setStatus({ story: "pending", voice: "pending", video: "pending", validation: "pending", merge: "pending" });
    };

    return (
        <div className="min-h-screen flex flex-col bg-[var(--bg-primary)]">
            {/* MANUAL UPLOAD MODAL */}
            {manualUpload && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="glass-panel p-8 max-w-lg w-full border border-[var(--accent-primary)]/50 shadow-2xl shadow-purple-500/20">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            🎙️ Manual Voice Generation
                        </h3>
                        <p className="mb-4 text-sm text-[var(--text-muted)]">
                            The API is currently rate-limited. Please generate the audio manually for <strong>Scene {manualUpload.id}: "{manualUpload.title}"</strong>.
                        </p>

                        <div className="bg-white/5 p-4 rounded-lg mb-6 border border-white/10">
                            <p className="text-xs font-semibold text-[var(--accent-primary)] mb-2 uppercase tracking-wider">Step 1: Generate Audio</p>

                            {/* Embedded Browser (Iframe) */}
                            <div className="w-full h-80 bg-white/5 rounded border border-white/10 mb-4 overflow-hidden relative group">
                                <iframe
                                    src="https://aistudio.google.com/app/generate-speech?model=gemini-2.5-pro-preview-tts"
                                    className="w-full h-full"
                                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                                    title="AI Studio Integration"
                                />
                                {/* Overlay for fallback if blocked */}
                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    <p className="text-white text-sm mb-2 text-center px-4">
                                        If the page doesn't load here (due to Google security),<br />use the button below to open it externally.
                                    </p>
                                </div>
                            </div>

                            <a
                                href="https://aistudio.google.com/app/generate-speech?model=gemini-2.5-pro-preview-tts"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 text-sm text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/80 transition-colors mb-6 p-3 rounded shadow-lg"
                            >
                                🔗 Open AI Studio in New Tab (Fallback)
                                <span className="text-xs text-white/70 ml-1">External Link ↗</span>
                            </a>

                            <p className="text-xs font-semibold text-[var(--accent-primary)] mb-2 uppercase tracking-wider">Step 2: Copy & Generate</p>
                            <div className="relative group">
                                <textarea
                                    readOnly
                                    value={manualUpload.content}
                                    className="input w-full h-24 text-sm font-mono text-[var(--text-muted)] bg-black/40 resize-none focus:ring-0 border-white/10"
                                    onClick={(e) => {
                                        (e.target as HTMLTextAreaElement).select();
                                        navigator.clipboard.writeText(manualUpload.content);
                                    }}
                                />
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-xs bg-[var(--accent-primary)] text-white px-2 py-1 rounded">Click to Copy</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-xs font-semibold text-[var(--accent-primary)] mb-2 uppercase tracking-wider">Step 3: Upload Result</p>
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[var(--glass-border)] rounded-lg cursor-pointer hover:border-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/5 transition-all group">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <svg className="w-8 h-8 mb-3 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                        <p className="text-sm text-[var(--text-muted)]"><span className="font-semibold text-white">Click to upload</span> or drag and drop</p>
                                        <p className="text-xs text-[var(--text-muted)] mt-1">WAV, MP3, or OGG</p>
                                    </div>
                                    <input
                                        type="file"
                                        accept="audio/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) handleManualUpload(e.target.files[0]);
                                        }}
                                    />
                                </label>
                            </div>

                            {isWaitingForManual && (
                                <div className="flex items-center justify-center gap-2 text-xs text-yellow-400 animate-pulse bg-yellow-500/10 p-2 rounded">
                                    <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                                    Uploading and processing...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="glass-panel border-0 border-b border-[var(--glass-border)] py-4">
                <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl">
                            🎬
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                StoryForge AI
                            </h1>
                            <p className="text-xs text-[var(--text-muted)]">Complete Automation Pipeline</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-full bg-[var(--bg-tertiary)] text-sm text-[var(--text-muted)]">
                            🎙️ {VOICE_CONFIG.displayName}
                        </span>
                        {isRunning && (
                            <button
                                onClick={() => setIsPaused(!isPaused)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isPaused
                                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                    : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                                    }`}
                            >
                                {isPaused ? "▶️ Resume" : "⏸️ Pause"}
                            </button>
                        )}
                    </div>
                </div>
            </header>



            {/* Main Content */}
            <main className="flex-1 py-8">
                <div className="max-w-5xl mx-auto px-6">
                    {!isRunning && status.story === "pending" ? (
                        /* SETUP PHASE */
                        <div className="space-y-8 animate-fade-in">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold mb-2">Create Your Video Story</h2>
                                <p className="text-[var(--text-muted)]">
                                    Complete end-to-end automation: Story → Audio → Video → Merge → Export
                                </p>
                            </div>

                            {/* Genre Selection */}
                            <div className="glass-panel p-6">
                                <h3 className="text-lg font-semibold mb-4">1. Choose Genre</h3>
                                <div className="grid grid-cols-4 gap-3">
                                    {genres.map(g => (
                                        <button
                                            key={g.id}
                                            onClick={() => setGenre(g.id)}
                                            className={`p-4 rounded-xl border-2 transition-all text-center ${genre === g.id
                                                ? "border-[var(--accent-primary)] bg-[rgba(139,92,246,0.1)]"
                                                : "border-[var(--glass-border)] hover:border-[var(--accent-primary)]/50"
                                                }`}
                                        >
                                            <span className="text-2xl block mb-1">{g.icon}</span>
                                            <span className="text-sm">{g.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Theme Input */}
                            <div className="glass-panel p-6">
                                <h3 className="text-lg font-semibold mb-4">2. Describe Your Story</h3>
                                <textarea
                                    value={theme}
                                    onChange={(e) => setTheme(e.target.value)}
                                    placeholder="Example: A lonely astronaut discovers an ancient alien message on Mars..."
                                    className="input w-full h-32 resize-none"
                                />
                                <div className="mt-3">
                                    <label className="text-sm text-[var(--text-muted)] block mb-2">Project Name (optional)</label>
                                    <input
                                        type="text"
                                        value={projectName}
                                        onChange={(e) => setProjectName(e.target.value)}
                                        placeholder="Auto-generated from theme"
                                        className="input w-full"
                                    />
                                </div>
                            </div>

                            {/* Orientation & Settings */}
                            <div className="glass-panel p-6">
                                <h3 className="text-lg font-semibold mb-4">3. Video Format & Settings</h3>
                                <div className="flex gap-4 mb-6">
                                    <button
                                        onClick={() => setOrientation("portrait")}
                                        className={`flex-1 p-4 rounded-xl border-2 transition-all ${orientation === "portrait"
                                            ? "border-[var(--accent-primary)] bg-[rgba(139,92,246,0.1)]"
                                            : "border-[var(--glass-border)]"
                                            }`}
                                    >
                                        <div className="w-8 h-12 mx-auto mb-2 border-2 border-current rounded"></div>
                                        <p className="text-sm">Portrait (9:16)</p>
                                        <p className="text-xs text-[var(--text-muted)]">TikTok, Reels, Shorts</p>
                                    </button>
                                    <button
                                        onClick={() => setOrientation("landscape")}
                                        className={`flex-1 p-4 rounded-xl border-2 transition-all ${orientation === "landscape"
                                            ? "border-[var(--accent-primary)] bg-[rgba(139,92,246,0.1)]"
                                            : "border-[var(--glass-border)]"
                                            }`}
                                    >
                                        <div className="w-12 h-8 mx-auto mb-2 border-2 border-current rounded"></div>
                                        <p className="text-sm">Landscape (16:9)</p>
                                        <p className="text-xs text-[var(--text-muted)]">YouTube, TV</p>
                                    </button>
                                </div>

                                {/* Advanced Settings */}
                                <div className="border-t border-[var(--glass-border)] pt-4 space-y-4">
                                    <h4 className="text-sm font-medium text-[var(--text-muted)]">Audio Settings</h4>

                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={skipAudio}
                                            onChange={(e) => {
                                                setSkipAudio(e.target.checked);
                                                if (e.target.checked) setUseAIStudioAudio(false);
                                            }}
                                            className="w-5 h-5 rounded"
                                        />
                                        <div>
                                            <span className="text-sm">Skip Audio Generation</span>
                                            <p className="text-xs text-[var(--text-muted)]">Generate videos only, no narration</p>
                                        </div>
                                    </label>

                                    <label className={`flex items-center gap-3 cursor-pointer ${skipAudio ? 'opacity-50' : ''}`}>
                                        <input
                                            type="checkbox"
                                            checked={useAIStudioAudio}
                                            onChange={(e) => setUseAIStudioAudio(e.target.checked)}
                                            disabled={skipAudio}
                                            className="w-5 h-5 rounded"
                                        />
                                        <div>
                                            <span className="text-sm">Use AI Studio (Puppeteer) ⭐</span>
                                            <p className="text-xs text-[var(--text-muted)]">Requires running <code>start-chrome.bat</code> locally</p>
                                        </div>
                                    </label>

                                    {useAIStudioAudio && (
                                        <div className="text-xs text-blue-400/80 bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                                            <strong>Before Starting:</strong>
                                            <ol className="list-decimal ml-4 mt-1 space-y-1">
                                                <li>Double-click <code>start-chrome.bat</code> in project folder</li>
                                                <li>Ensure Chrome opens with debugging port 9222</li>
                                                <li>Log in to Google in that window if needed</li>
                                            </ol>
                                        </div>
                                    )}

                                    <div className="text-xs text-amber-400/80 bg-amber-500/10 p-3 rounded-lg">
                                        ⚠️ <strong>Note:</strong> Gemini API has strict rate limits. If you see "Rate limited" errors, enable "AI Studio" option above or skip audio.
                                    </div>

                                    <h4 className="text-sm font-medium text-[var(--text-muted)] pt-2">Export Settings</h4>

                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={addWatermark}
                                            onChange={(e) => setAddWatermark(e.target.checked)}
                                            className="w-5 h-5 rounded"
                                        />
                                        <div className="flex-1">
                                            <span className="text-sm">Add Watermark</span>
                                            {addWatermark && (
                                                <input
                                                    type="text"
                                                    value={watermarkText}
                                                    onChange={(e) => setWatermarkText(e.target.value)}
                                                    className="input w-full mt-2"
                                                    placeholder="Watermark text"
                                                />
                                            )}
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={autoValidate}
                                            onChange={(e) => setAutoValidate(e.target.checked)}
                                            className="w-5 h-5 rounded"
                                        />
                                        <div>
                                            <span className="text-sm">Auto-Validate Before Export</span>
                                            <p className="text-xs text-[var(--text-muted)]">Check quality, sync, and completeness</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                                    {error}
                                </div>
                            )}

                            {/* Start Button */}
                            <button
                                onClick={startAutomation}
                                disabled={!genre || !theme}
                                className="btn btn-primary w-full py-5 text-lg font-bold disabled:opacity-50"
                            >
                                🚀 Start Full Automation
                            </button>

                            <div className="text-center text-sm text-[var(--text-muted)] space-y-1">
                                <p>This will automatically:</p>
                                <p>📝 Generate Story → 🎙️ Create Audio → 🎬 Generate Videos → ✅ Validate → 📦 Merge & Export</p>
                            </div>
                        </div>
                    ) : (
                        /* PROGRESS PHASE */
                        <div className="space-y-6 animate-fade-in">
                            {/* Progress Header */}
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold mb-2">
                                    {status.merge === "done" ? "🎉 Video Ready!" : "Processing..."}
                                </h2>
                                <p className="text-[var(--text-muted)]">{currentStep}</p>
                                {isPaused && (
                                    <span className="inline-block mt-2 px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                                        ⏸️ Paused
                                    </span>
                                )}
                            </div>

                            {/* Overall Progress */}
                            <div className="glass-panel p-6">
                                <div className="flex justify-between mb-2">
                                    <span className="font-medium">Overall Progress</span>
                                    <span className="text-[var(--accent-primary)]">{overallProgress}%</span>
                                </div>
                                <div className="progress-bar h-3">
                                    <div
                                        className="progress-bar-fill"
                                        style={{ width: `${overallProgress}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* Step Status */}
                            <div className="glass-panel p-6">
                                <h3 className="font-semibold mb-4">Pipeline Steps</h3>
                                <div className="space-y-3">
                                    {[
                                        { key: "story", label: "Generate Story", icon: "📝" },
                                        { key: "voice", label: "Generate Audio", icon: "🎙️" },
                                        { key: "video", label: "Generate Videos", icon: "🎬" },
                                        { key: "validation", label: "Validate Project", icon: "✅" },
                                        { key: "merge", label: "Merge & Export", icon: "📦" },
                                    ].map(step => {
                                        const stepStatus = status[step.key as keyof GenerationStatus];
                                        return (
                                            <div
                                                key={step.key}
                                                className={`flex items-center gap-3 p-3 rounded-lg ${stepStatus === "generating" || stepStatus === "validating"
                                                    ? "bg-[rgba(139,92,246,0.1)] border border-[var(--accent-primary)]"
                                                    : stepStatus === "done" || stepStatus === "passed"
                                                        ? "bg-green-500/10"
                                                        : stepStatus === "failed"
                                                            ? "bg-red-500/10"
                                                            : "bg-[var(--bg-secondary)]"
                                                    }`}
                                            >
                                                <span className="text-xl">{step.icon}</span>
                                                <span className="flex-1">{step.label}</span>
                                                {stepStatus === "pending" && (
                                                    <span className="text-[var(--text-muted)]">⏳ Waiting</span>
                                                )}
                                                {(stepStatus === "generating" || stepStatus === "validating") && (
                                                    <span className="text-[var(--accent-primary)] flex items-center gap-2">
                                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Processing...
                                                    </span>
                                                )}
                                                {(stepStatus === "done" || stepStatus === "passed") && (
                                                    <span className="text-green-400">✅ Done</span>
                                                )}
                                                {stepStatus === "error" && (
                                                    <span className="text-red-400">❌ Error</span>
                                                )}
                                                {stepStatus === "failed" && (
                                                    <span className="text-orange-400">⚠️ Issues Found</span>
                                                )}
                                                {stepStatus === "skipped" && (
                                                    <span className="text-yellow-400">⏭️ Skipped</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Validation Results */}
                            {validationResult && (
                                <div className={`glass-panel p-6 ${validationResult.passed ? "border-green-500/30" : "border-orange-500/30"}`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold">Validation Results</h3>
                                        <span className={`text-2xl font-bold ${validationResult.score >= 80 ? "text-green-400" : validationResult.score >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                                            {validationResult.score}/100
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {validationResult.checks.map((check, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-sm">
                                                <span>{check.passed ? "✅" : check.severity === "warning" ? "⚠️" : "❌"}</span>
                                                <span className="font-medium">{check.name}:</span>
                                                <span className="text-[var(--text-muted)]">{check.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {validationResult.recommendations.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
                                            <p className="text-sm font-medium mb-2">💡 Recommendations:</p>
                                            {validationResult.recommendations.map((rec, idx) => (
                                                <p key={idx} className="text-sm text-[var(--text-muted)]">• {rec}</p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Scene Progress */}
                            {scenes.length > 0 && (
                                <div className="glass-panel p-6">
                                    <h3 className="font-semibold mb-4">Scene Progress</h3>
                                    <div className="space-y-2">
                                        {scenes.map((scene, idx) => {
                                            const progress = sceneProgress.find(sp => sp.sceneId === scene.id);
                                            return (
                                                <div
                                                    key={scene.id}
                                                    className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-secondary)]"
                                                >
                                                    <span className="text-sm font-medium w-24 truncate">{scene.title}</span>
                                                    <div className="flex-1 flex items-center gap-4">
                                                        <span className={`text-xs px-2 py-1 rounded ${progress?.voiceStatus === "done" ? "bg-green-500/20 text-green-400" :
                                                            progress?.voiceStatus === "generating" ? "bg-purple-500/20 text-purple-400" :
                                                                progress?.voiceStatus === "error" ? "bg-red-500/20 text-red-400" :
                                                                    "bg-gray-500/20 text-gray-500"
                                                            }`}>
                                                            🎙️ {progress?.voiceStatus || "pending"}
                                                        </span>
                                                        <span className={`text-xs px-2 py-1 rounded ${progress?.videoStatus === "done" ? "bg-green-500/20 text-green-400" :
                                                            progress?.videoStatus === "generating" ? "bg-purple-500/20 text-purple-400" :
                                                                progress?.videoStatus === "error" ? "bg-red-500/20 text-red-400" :
                                                                    "bg-gray-500/20 text-gray-500"
                                                            }`}>
                                                            🎬 {progress?.videoStatus || "pending"}
                                                        </span>
                                                    </div>

                                                    {/* Audio Player & Download */}
                                                    {progress?.voiceUrl && (
                                                        <div className="flex items-center gap-2">
                                                            <audio
                                                                controls
                                                                src={progress.voiceUrl}
                                                                className="h-8 w-32 opacity-80 hover:opacity-100 transition-opacity"
                                                                title="Play generated narration"
                                                            />
                                                            <a
                                                                href={progress.voiceUrl}
                                                                download={`scene-${scene.id}-voice.wav`}
                                                                className="text-xs text-[var(--accent-primary)] hover:text-white transition-colors"
                                                                title="Download Audio"
                                                            >
                                                                ⬇️
                                                            </a>
                                                        </div>
                                                    )}

                                                    {progress?.videoUrl && (
                                                        <a
                                                            href={progress.videoUrl}
                                                            download
                                                            className="text-xs text-[var(--accent-primary)] hover:underline"
                                                        >
                                                            ⬇️ Video
                                                        </a>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Console Log */}
                            <div className="glass-panel p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold">Activity Log</h3>
                                    <button
                                        onClick={() => {
                                            const logText = logs.join("\n");
                                            navigator.clipboard.writeText(logText);
                                        }}
                                        className="text-xs text-[var(--text-muted)] hover:text-white"
                                    >
                                        📋 Copy
                                    </button>
                                </div>
                                <div className="bg-black/50 rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs">
                                    {logs.map((log, idx) => (
                                        <div key={idx} className={`${log.includes("❌") ? "text-red-400" :
                                            log.includes("⚠️") ? "text-yellow-400" :
                                                log.includes("✅") ? "text-green-400" :
                                                    log.includes("🎉") ? "text-pink-400" :
                                                        log.includes("══") ? "text-purple-400" :
                                                            "text-gray-300"
                                            }`}>{log}</div>
                                    ))}
                                </div>
                            </div>

                            {/* Download Button */}
                            {status.merge === "done" && (
                                <div className="flex gap-4">
                                    <button
                                        onClick={resetPipeline}
                                        className="btn btn-secondary flex-1"
                                    >
                                        🔄 Create New Video
                                    </button>
                                    {finalVideoUrl ? (
                                        <a
                                            href={finalVideoUrl}
                                            download={`${projectName || "storyforge"}-video.mp4`}
                                            className="btn btn-primary flex-1 text-center"
                                        >
                                            ⬇️ Download Final Video
                                        </a>
                                    ) : (
                                        <button
                                            onClick={() => window.open("/generated-videos", "_blank")}
                                            className="btn btn-primary flex-1"
                                        >
                                            📂 View Generated Files
                                        </button>
                                    )}
                                </div>
                            )}

                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default function AutomationPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-6 relative">
                        <div className="absolute inset-0 rounded-full border-4 border-[var(--bg-tertiary)]"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-[var(--accent-primary)] border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-[var(--text-muted)]">Loading StoryForge AI...</p>
                </div>
            </div>
        }>
            <AutomationContent />
        </Suspense>
    );
}
