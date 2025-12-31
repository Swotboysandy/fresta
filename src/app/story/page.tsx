"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface Scene {
    id: number;
    title: string;
    content: string;
    duration: number;
    isEditing: boolean;
    isGenerating: boolean;
}

// Mock story generation - in production, this would call your AI API
const generateMockStory = (genre: string, theme: string, totalDuration: number): Scene[] => {
    const sceneCount = Math.max(3, Math.floor(totalDuration / 30));
    const sceneDuration = Math.floor(totalDuration / sceneCount);

    const storyTemplates: Record<string, string[]> = {
        horror: [
            "The old mansion stood at the edge of town, its windows like hollow eyes watching the approaching storm.",
            "Inside, dust motes danced in the pale moonlight filtering through cracked windowpanes. Something moved in the shadows.",
            "A whisper echoed through the empty halls - a name, repeated over and over. The temperature dropped suddenly.",
            "The door slammed shut behind them. There was no going back now. The house had been waiting.",
            "In the basement, ancient symbols glowed with an otherworldly light. The ritual had already begun.",
        ],
        scifi: [
            "The year is 2347. Humanity has spread across the stars, but some secrets remain buried in the void.",
            "Captain Elara's ship detected the anomaly at the edge of known space - a signal that shouldn't exist.",
            "The alien structure was vast, older than Earth itself. Its builders had vanished eons ago.",
            "Inside the artifact, holographic memories played: the rise and fall of civilizations unknown.",
            "A choice awaited them - knowledge that could elevate humanity, or destroy it entirely.",
        ],
        romance: [
            "They met on a rainy Tuesday, two strangers seeking shelter under the same awning.",
            "Coffee turned into dinner. Dinner turned into walks that lasted until sunrise.",
            "But secrets have a way of surfacing. The past they both tried to escape caught up.",
            "Standing at the crossroads, they had to choose: the safe path, or each other.",
            "Love, they learned, isn't about perfect moments. It's about choosing someone, every single day.",
        ],
        motivation: [
            "Success isn't born. It's built - one decision at a time, one day at a time.",
            "Every champion was once a beginner who refused to give up when things got hard.",
            "Fear is not the enemy. Inaction is. Take that first step, even if it's small.",
            "Your past does not define your future. Today is a new page. Write something amazing.",
            "The only limit that truly exists is the one you accept. Dream bigger. Work harder. Rise.",
        ],
        thriller: [
            "The package arrived with no return address. Inside: a photograph and three words - 'They know everything.'",
            "Trust became a luxury. Every face could be a threat, every shadow a potential trap.",
            "The conspiracy ran deeper than imagined. Government. Corporate. International. All connected.",
            "With time running out, the truth became clear. The real enemy had been hiding in plain sight.",
            "One chance remained. One shot to expose it all. Failure wasn't an option anymore.",
        ],
        kids: [
            "In a magical forest where animals could talk, a little rabbit named Pip had a big dream.",
            "Pip wanted to find the legendary Rainbow Meadow, where the flowers sang songs.",
            "Along the way, Pip met friends: a wise owl, a brave squirrel, and a silly frog.",
            "Together, they solved riddles, crossed rivers, and helped everyone they met.",
            "And when they finally found the meadow, they learned the real treasure was friendship.",
        ],
        default: [
            "Every story begins with a single moment - a choice, a chance encounter, a spark.",
            "The journey unfolds, revealing truths hidden beneath the surface of everyday life.",
            "Challenges arise, testing resolve and reshaping understanding of what matters most.",
            "Through struggle comes growth. Through darkness, a deeper appreciation of light.",
            "And in the end, the story isn't about the destination. It's about who we become.",
        ],
    };

    const templates = storyTemplates[genre] || storyTemplates.default;

    return Array.from({ length: sceneCount }, (_, i) => ({
        id: i + 1,
        title: `Scene ${i + 1}`,
        content: templates[i % templates.length].replace(/\[THEME\]/g, theme),
        duration: sceneDuration,
        isEditing: false,
        isGenerating: false,
    }));
};

function StoryContent() {
    const searchParams = useSearchParams();
    const genre = searchParams.get("genre") || "default";
    const theme = searchParams.get("theme") || "";
    const orientation = searchParams.get("orientation") || "portrait";
    const duration = parseInt(searchParams.get("duration") || "60");

    const [scenes, setScenes] = useState<Scene[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [storyTitle, setStoryTitle] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const generateStory = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch("/api/generate-story", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        genre,
                        theme,
                        duration,
                    }),
                });

                if (!response.ok) {
                    throw new Error("Failed to generate story");
                }

                const data = await response.json();
                setScenes(data.scenes);
                setStoryTitle(data.title);
            } catch (err) {
                console.error("Story generation error:", err);
                setError("Failed to generate story. Using fallback content.");
                // Fallback to mock data
                const generatedScenes = generateMockStory(genre, theme, duration);
                setScenes(generatedScenes);
                setStoryTitle(`The ${genre.charAt(0).toUpperCase() + genre.slice(1)} Tale`);
            } finally {
                setIsLoading(false);
            }
        };

        generateStory();
    }, [genre, theme, duration]);

    const updateSceneContent = (id: number, content: string) => {
        setScenes(scenes.map(scene =>
            scene.id === id ? { ...scene, content } : scene
        ));
    };

    const toggleEditing = (id: number) => {
        setScenes(scenes.map(scene =>
            scene.id === id ? { ...scene, isEditing: !scene.isEditing } : scene
        ));
    };

    const regenerateScene = async (id: number) => {
        const scene = scenes.find(s => s.id === id);
        if (!scene) return;

        setScenes(scenes.map(s =>
            s.id === id ? { ...s, isGenerating: true } : s
        ));

        try {
            const response = await fetch("/api/regenerate-scene", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    genre,
                    theme,
                    sceneNumber: id,
                    previousContent: scene.content,
                    duration: scene.duration,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to regenerate scene");
            }

            const data = await response.json();
            setScenes(scenes.map(s =>
                s.id === id
                    ? { ...s, isGenerating: false, content: data.content }
                    : s
            ));
        } catch (err) {
            console.error("Scene regeneration error:", err);
            // Fallback content
            setScenes(scenes.map(s =>
                s.id === id
                    ? { ...s, isGenerating: false, content: "A new perspective unfolds, revealing hidden truths that change everything..." }
                    : s
            ));
        }
    };

    const totalWords = scenes.reduce((acc, scene) => acc + scene.content.split(" ").length, 0);
    const estimatedReadTime = Math.ceil(totalWords / 150);

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 glass-panel border-0 border-b border-[var(--glass-border)]">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="btn btn-ghost p-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="text-lg font-semibold text-[var(--text-primary)]">AI Story Generator</h1>
                            <p className="text-xs text-[var(--text-muted)]">Step 2 of 5 • Review & edit your story</p>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center gap-4 text-sm text-[var(--text-muted)]">
                        <span className="px-3 py-1 rounded-full bg-[var(--bg-tertiary)]">
                            {genre.charAt(0).toUpperCase() + genre.slice(1)}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-[var(--bg-tertiary)]">
                            {orientation === "portrait" ? "9:16" : "16:9"}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-[var(--bg-tertiary)]">
                            {duration >= 60 ? `${Math.floor(duration / 60)}m` : `${duration}s`}
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
                            <div className="step-dot active"></div>
                            <span className="text-sm font-medium text-[var(--accent-primary)]">Story</span>
                        </div>
                        <div className="step-line w-12"></div>
                        <div className="step-indicator">
                            <div className="step-dot"></div>
                            <span className="text-sm text-[var(--text-muted)]">Voice</span>
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
                <div className="max-w-4xl mx-auto px-6">
                    {isLoading ? (
                        // Loading State
                        <div className="text-center py-20">
                            <div className="w-16 h-16 mx-auto mb-6 relative">
                                <div className="absolute inset-0 rounded-full border-4 border-[var(--bg-tertiary)]"></div>
                                <div className="absolute inset-0 rounded-full border-4 border-[var(--accent-primary)] border-t-transparent animate-spin"></div>
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Generating Your Story...</h3>
                            <p className="text-[var(--text-muted)]">Our AI is crafting a unique {genre} narrative</p>
                            <div className="mt-8 space-y-3 max-w-md mx-auto">
                                <div className="skeleton h-4 rounded-full"></div>
                                <div className="skeleton h-4 rounded-full w-4/5 mx-auto"></div>
                                <div className="skeleton h-4 rounded-full w-3/5 mx-auto"></div>
                            </div>
                        </div>
                    ) : (
                        // Story Content
                        <div className="animate-fade-in">
                            {/* Error Banner */}
                            {error && (
                                <div className="mb-6 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-3">
                                    <span className="text-xl">⚠️</span>
                                    <p className="text-sm text-yellow-200">{error}</p>
                                </div>
                            )}

                            {/* Story Header */}
                            <div className="text-center mb-10">
                                <input
                                    type="text"
                                    value={storyTitle}
                                    onChange={(e) => setStoryTitle(e.target.value)}
                                    className="text-3xl font-bold bg-transparent border-0 text-center w-full focus:outline-none focus:ring-0 text-gradient"
                                    placeholder="Story Title"
                                />
                                <p className="text-[var(--text-muted)] mt-2">
                                    {scenes.length} scenes • ~{totalWords} words • {estimatedReadTime} min read
                                </p>
                            </div>

                            {/* Theme Preview */}
                            <div className="glass-panel p-4 mb-8">
                                <div className="flex items-start gap-3">
                                    <span className="text-xl">💡</span>
                                    <div>
                                        <p className="text-sm font-medium text-[var(--text-secondary)]">Your Theme</p>
                                        <p className="text-sm text-[var(--text-muted)]">{theme || "No theme provided"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Scenes */}
                            <div className="space-y-4">
                                {scenes.map((scene, index) => (
                                    <div
                                        key={scene.id}
                                        className="scene-card animate-fade-in"
                                        style={{ animationDelay: `${index * 0.1}s` }}
                                    >
                                        <div className="scene-card-header">
                                            <div className="flex items-center gap-3">
                                                <span className="scene-number">{scene.title}</span>
                                                <span className="text-xs text-[var(--text-muted)]">
                                                    ~{scene.duration}s
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => toggleEditing(scene.id)}
                                                    className="btn btn-ghost p-2 text-xs"
                                                    title={scene.isEditing ? "Save" : "Edit"}
                                                >
                                                    {scene.isEditing ? (
                                                        <svg className="w-4 h-4 text-[var(--accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => regenerateScene(scene.id)}
                                                    disabled={scene.isGenerating}
                                                    className="btn btn-ghost p-2 text-xs"
                                                    title="Regenerate"
                                                >
                                                    <svg
                                                        className={`w-4 h-4 ${scene.isGenerating ? "animate-spin" : ""}`}
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="scene-card-body">
                                            {scene.isEditing ? (
                                                <textarea
                                                    value={scene.content}
                                                    onChange={(e) => updateSceneContent(scene.id, e.target.value)}
                                                    className="w-full h-32 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-lg p-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] resize-none"
                                                    autoFocus
                                                />
                                            ) : scene.isGenerating ? (
                                                <div className="space-y-2">
                                                    <div className="skeleton h-4 rounded"></div>
                                                    <div className="skeleton h-4 rounded w-4/5"></div>
                                                    <div className="skeleton h-4 rounded w-3/5"></div>
                                                </div>
                                            ) : (
                                                <p className="text-[var(--text-secondary)] leading-relaxed">
                                                    {scene.content}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Add Scene Button */}
                            <button
                                onClick={() => {
                                    const newScene: Scene = {
                                        id: scenes.length + 1,
                                        title: `Scene ${scenes.length + 1}`,
                                        content: "Add your custom scene content here...",
                                        duration: 20,
                                        isEditing: true,
                                        isGenerating: false,
                                    };
                                    setScenes([...scenes, newScene]);
                                }}
                                className="w-full mt-4 py-4 border-2 border-dashed border-[var(--glass-border)] rounded-xl text-[var(--text-muted)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors"
                            >
                                + Add Another Scene
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Bottom Action Bar */}
            {!isLoading && (
                <div className="sticky bottom-0 glass-panel border-0 border-t border-[var(--glass-border)] py-4">
                    <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
                        <Link href="/" className="btn btn-secondary">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to Setup
                        </Link>
                        <Link
                            href={`/voice?scenes=${encodeURIComponent(JSON.stringify(scenes.map(s => ({ id: s.id, title: s.title, content: s.content, duration: s.duration }))))}&title=${encodeURIComponent(storyTitle)}&orientation=${orientation}`}
                            className="btn btn-primary"
                        >
                            Proceed to Voice
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function StoryPage() {
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
            <StoryContent />
        </Suspense>
    );
}
