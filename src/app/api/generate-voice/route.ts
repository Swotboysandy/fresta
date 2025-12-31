import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

// Directory to store generated audio
const AUDIO_DIR = path.join(process.cwd(), "public", "generated-audio");

// Ensure audio directory exists
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Edge-TTS Voice Mappings
// We use "Neural" voices for best quality.
// If the user wants Hindi, we map to Hindi voices. If generic, we map to English styled voices.
const VOICE_MAP: Record<string, string> = {
    // Hindi Voices (since user showed preference for "Kore (Hindi)")
    "kore": "hi-IN-SwaraNeural", // Female, Default
    "hindi_male": "hi-IN-MadhurNeural",

    // Genre-specific English Voices (High Quality)
    "horror": "en-US-ChristopherNeural", // Deep, slightly mental
    "romance": "en-US-AriaNeural", // Soft, warm
    "sci-fi": "en-US-BrianNeural", // Clear, intelligent
    "fantasy": "en-GB-SoniaNeural", // British, storytelling
    "action": "en-US-GuyNeural", // Energetic
    "comedy": "en-US-EricNeural", // Friendly
    "mystery": "en-US-ChristopherNeural", // Deep
    "drama": "en-US-AvaNeural", // Emotional

    // Fallback
    "default": "en-US-AvaNeural"
};

export async function POST(request: NextRequest) {
    try {
        const { text, voiceName, genre = "default" } = await request.json();

        if (!text || text.trim().length === 0) {
            return NextResponse.json({ error: "No text provided" }, { status: 400 });
        }

        // Determine the voice to use
        // 1. If voiceName matches a specific key (e.g., 'kore'), use that.
        // 2. Else, try to match by genre.
        // 3. Fallback to default.
        let selectedVoice = VOICE_MAP[voiceName?.toLowerCase()] || VOICE_MAP[genre?.toLowerCase()] || VOICE_MAP["default"];

        // Heuristic: If text contains Devanagari characters, force Hindi voice if currently English
        const isHindiText = /[\u0900-\u097F]/.test(text);
        if (isHindiText && !selectedVoice.startsWith("hi-IN")) {
            selectedVoice = "hi-IN-SwaraNeural";
        }

        console.log(`[EdgeTTS] Generating audio using voice: ${selectedVoice} for genre: ${genre}`);

        // Generate unique filename
        const timestamp = Date.now();
        const fileName = `voice-${timestamp}-${Math.random().toString(36).substring(7)}.mp3`;
        const filePath = path.join(AUDIO_DIR, fileName);

        // Run edge-tts command
        // edge-tts --voice VOICE --text "TEXT" --write-media PATH
        const args = [
            "--voice", selectedVoice,
            "--text", text,
            "--write-media", filePath
        ];

        // Process execution
        await new Promise<void>((resolve, reject) => {
            const pythonProcess = spawn("edge-tts", args, {
                env: process.env // Inherit path so it finds edge-tts
            });

            let errorLog = "";

            pythonProcess.stderr.on("data", (data) => {
                errorLog += data.toString();
            });

            pythonProcess.on("close", (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    console.error("[EdgeTTS] Error:", errorLog);
                    reject(new Error(`edge-tts process exited with code ${code}`));
                }
            });

            pythonProcess.on("error", (err) => {
                console.error("[EdgeTTS] Spawn Error:", err);
                reject(err);
            });
        });

        // Check if file was created
        if (!fs.existsSync(filePath)) {
            throw new Error("Audio file was not created");
        }

        const audioUrl = `/generated-audio/${fileName}`;
        console.log(`[EdgeTTS] ✅ Audio saved: ${audioUrl}`);

        return NextResponse.json({
            success: true,
            audioUrl: audioUrl,
            voiceUsed: selectedVoice
        });

    } catch (error: any) {
        console.error("TTS generation error:", error);
        return NextResponse.json(
            { error: "Failed to generate audio", details: error.message },
            { status: 500 }
        );
    }
}

