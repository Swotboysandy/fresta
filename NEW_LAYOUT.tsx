{/* Asymmetric Grid Layout - Like your image */ }
<div className="grid grid-cols-3 gap-4">

    {/* LEFT SIDE - Large Card (2/3 width) - URL + Style */}
    <div className="col-span-2 space-y-4">
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

        {/* Style - Large with 4 columns */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 flex-1">
            <label className="block text-base font-semibold text-white/50 mb-4">Narration Style</label>
            <div className="grid grid-cols-4 gap-3">
                {STYLES.map((s) => (
                    <button
                        key={s.id}
                        onClick={() => setFacelessStyle(s.id)}
                        disabled={isProcessingFaceless}
                        className={`p-4 rounded-lg border transition-all ${facelessStyle === s.id ? "border-purple-500/40 bg-purple-500/10" : "border-white/5 bg-black/20 hover:border-purple-500/20"}`}
                    >
                        <s.icon className="w-7 h-7 mx-auto mb-2 text-purple-300" />
                        <div className="text-sm text-white/70">{s.label}</div>
                    </button>
                ))}
            </div>
        </div>
    </div>

    {/* RIGHT SIDE - 2 Cards stacked (1/3 width) */}
    <div className="col-span-1 space-y-4">

        {/* Voice - Top Right */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 h-[280px] flex flex-col">
            <label className="block text-base font-semibold text-white/50 mb-3">Voice</label>
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

        {/* Music - Bottom Right */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 flex flex-col">
            <label className="block text-base font-semibold text-white/50 mb-3">Music</label>
            <div className="grid grid-cols-2 gap-2">
                {MUSIC_MOODS.map((m) => (
                    <button
                        key={m.id}
                        onClick={() => setFacelessMusic(m.id)}
                        disabled={isProcessingFaceless}
                        className={`p-3 rounded-lg border transition-all ${facelessMusic === m.id ? "border-purple-500/40 bg-purple-500/10" : "border-white/5 bg-black/20 hover:border-purple-500/20"}`}
                    >
                        <m.icon className="w-5 h-5 mx-auto mb-1" style={{ color: m.color }} />
                        <div className="text-xs text-white/70">{m.label}</div>
                    </button>
                ))}
            </div>
        </div>

    </div>
</div>

{/* Bottom Row - Duration & Language */ }
<div className="grid grid-cols-2 gap-4">
    {/* Duration */}
    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
        <label className="block text-base font-semibold text-white/50 mb-4">Video Duration</label>
        <div className="flex gap-3">
            {DURATIONS.map((d) => (
                <button
                    key={d.id}
                    onClick={() => setFacelessDuration(d.id)}
                    disabled={isProcessingFaceless}
                    className={`flex-1 p-3 rounded-lg border transition-all ${facelessDuration === d.id ? "border-purple-500/40 bg-purple-500/10" : "border-white/5 bg-black/20 hover:border-purple-500/20"}`}
                >
                    <div className="text-sm font-semibold text-white/80">{d.label}</div>
                    <div className="text-xs text-white/30">{d.desc}</div>
                </button>
            ))}
        </div>
    </div>

    {/* Language */}
    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
        <label className="block text-base font-semibold text-white/50 mb-4">Language</label>
        <div className="flex gap-3">
            <button
                onClick={() => setFacelessLanguage("english")}
                disabled={isProcessingFaceless}
                className={`flex-1 p-3 rounded-lg border transition-all text-sm ${facelessLanguage === "english" ? "border-purple-500/40 bg-purple-500/10 text-white" : "border-white/5 bg-black/20 hover:border-purple-500/20 text-white/70"}`}
            >
                🇺🇸 English
            </button>
            <button
                onClick={() => setFacelessLanguage("hindi")}
                disabled={isProcessingFaceless}
                className={`flex-1 p-3 rounded-lg border transition-all text-sm ${facelessLanguage === "hindi" ? "border-purple-500/40 bg-purple-500/10 text-white" : "border-white/5 bg-black/20 hover:border-purple-500/20 text-white/70"}`}
            >
                🇮🇳 Hindi
            </button>
        </div>
    </div>
</div>
