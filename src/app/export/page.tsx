"use client";

import { useState } from "react";
import Link from "next/link";

interface RenderHistoryItem {
    id: string;
    title: string;
    genre: string;
    orientation: string;
    duration: string;
    createdAt: string;
    thumbnailColor: string;
}

const mockHistory: RenderHistoryItem[] = [
    {
        id: "1",
        title: "The Midnight Signal",
        genre: "Horror",
        orientation: "portrait",
        duration: "2:30",
        createdAt: "2 hours ago",
        thumbnailColor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    },
    {
        id: "2",
        title: "Love in Tokyo",
        genre: "Romance",
        orientation: "landscape",
        duration: "3:45",
        createdAt: "Yesterday",
        thumbnailColor: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    },
    {
        id: "3",
        title: "Rise Above",
        genre: "Motivation",
        orientation: "portrait",
        duration: "1:00",
        createdAt: "3 days ago",
        thumbnailColor: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    },
];

export default function ExportPage() {
    const [isDownloading, setIsDownloading] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleDownload = async () => {
        setIsDownloading(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsDownloading(false);
        // In production, this would trigger actual file download
    };

    const copyLink = () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareOptions = [
        { name: "YouTube", icon: "📺", color: "#FF0000" },
        { name: "TikTok", icon: "🎵", color: "#000000" },
        { name: "Instagram", icon: "📷", color: "#E1306C" },
        { name: "Twitter/X", icon: "🐦", color: "#1DA1F2" },
    ];

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 glass-panel border-0 border-b border-[var(--glass-border)]">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="btn btn-ghost p-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="text-lg font-semibold text-[var(--text-primary)]">Export & Download</h1>
                            <p className="text-xs text-[var(--text-muted)]">Your video is ready!</p>
                        </div>
                    </div>
                    <Link href="/" className="btn btn-secondary">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Project
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 py-12">
                <div className="max-w-5xl mx-auto px-6">
                    {/* Success Banner */}
                    <div className="text-center mb-12 animate-fade-in">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
                            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold mb-2">
                            🎉 Video <span className="text-gradient">Complete!</span>
                        </h2>
                        <p className="text-lg text-[var(--text-secondary)]">
                            Your AI-generated video is ready to download and share
                        </p>
                    </div>

                    {/* Video Preview Card */}
                    <div className="glass-panel p-8 mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
                        <div className="grid md:grid-cols-2 gap-8 items-center">
                            {/* Preview */}
                            <div className="aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-purple-600 to-blue-600 relative">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <button className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors group">
                                        <svg className="w-10 h-10 text-white ml-1 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                                    <span className="text-white/80 text-sm bg-black/30 px-2 py-1 rounded">00:00</span>
                                    <span className="text-white/80 text-sm bg-black/30 px-2 py-1 rounded">02:30</span>
                                </div>
                            </div>

                            {/* Details */}
                            <div>
                                <h3 className="text-2xl font-bold mb-4">The StoryForge Tale</h3>
                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                                        <span className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">📁</span>
                                        <span>MP4 • 1080p • 24 FPS</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                                        <span className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">⏱️</span>
                                        <span>Duration: 2 minutes 30 seconds</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                                        <span className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">📐</span>
                                        <span>Landscape (16:9)</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                                        <span className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">💾</span>
                                        <span>Estimated size: ~45 MB</span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={handleDownload}
                                        disabled={isDownloading}
                                        className="btn btn-primary flex-1"
                                    >
                                        {isDownloading ? (
                                            <>
                                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Preparing...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                                Download MP4
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setShowShareModal(true)}
                                        className="btn btn-secondary flex-1"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                        </svg>
                                        Share
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 animate-fade-in" style={{ animationDelay: "0.2s" }}>
                        <button className="glass-panel p-4 text-center hover:border-[var(--accent-primary)] transition-colors group">
                            <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">💾</span>
                            <span className="text-sm font-medium">Save Project</span>
                        </button>
                        <button className="glass-panel p-4 text-center hover:border-[var(--accent-primary)] transition-colors group">
                            <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">📋</span>
                            <span className="text-sm font-medium">Duplicate</span>
                        </button>
                        <button className="glass-panel p-4 text-center hover:border-[var(--accent-primary)] transition-colors group">
                            <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">✏️</span>
                            <span className="text-sm font-medium">Edit Again</span>
                        </button>
                        <Link href="/" className="glass-panel p-4 text-center hover:border-[var(--accent-primary)] transition-colors group">
                            <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">➕</span>
                            <span className="text-sm font-medium">New Video</span>
                        </Link>
                    </div>

                    {/* Render History */}
                    <div className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-semibold">Recent Projects</h3>
                            <button className="text-sm text-[var(--accent-primary)] hover:underline">View All →</button>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4">
                            {mockHistory.map((item, index) => (
                                <div
                                    key={item.id}
                                    className="glass-card p-4 animate-fade-in"
                                    style={{ animationDelay: `${0.4 + index * 0.1}s` }}
                                >
                                    <div
                                        className={`aspect-video rounded-lg mb-3 ${item.orientation === "portrait" ? "aspect-[9/16] max-h-32 mx-auto" : ""}`}
                                        style={{ background: item.thumbnailColor }}
                                    />
                                    <h4 className="font-medium mb-1 truncate">{item.title}</h4>
                                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                                        <span>{item.genre} • {item.duration}</span>
                                        <span>{item.createdAt}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            {/* Share Modal */}
            {showShareModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowShareModal(false)}
                    />
                    <div className="glass-panel p-6 w-full max-w-md relative animate-fade-in">
                        <button
                            onClick={() => setShowShareModal(false)}
                            className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <h3 className="text-xl font-semibold mb-6">Share Your Video</h3>

                        {/* Share Links */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {shareOptions.map(option => (
                                <button
                                    key={option.name}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                                >
                                    <span className="text-2xl">{option.icon}</span>
                                    <span className="font-medium">{option.name}</span>
                                </button>
                            ))}
                        </div>

                        {/* Copy Link */}
                        <div className="border-t border-[var(--glass-border)] pt-6">
                            <label className="text-sm text-[var(--text-muted)] mb-2 block">Or copy link</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value="https://storyforge.ai/v/abc123xyz"
                                    className="input flex-1 text-sm"
                                />
                                <button
                                    onClick={copyLink}
                                    className="btn btn-secondary px-4"
                                >
                                    {copied ? "✓ Copied!" : "Copy"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="border-t border-[var(--glass-border)] py-6 mt-auto">
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <p className="text-sm text-[var(--text-muted)]">
                        Created with ❤️ by <span className="text-gradient font-medium">StoryForge AI</span>
                    </p>
                </div>
            </footer>
        </div>
    );
}
